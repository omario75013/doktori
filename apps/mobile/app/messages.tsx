import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { MessageCircle, ChevronRight } from "lucide-react-native";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

type Conversation = {
  id: string;
  status: string;
  lastMessageAt: string;
  // For patient: doctor info
  doctorId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  // For doctor: patient info
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Conversation[]>("/api/messages/conversations");
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      // ignore — user may not be authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }

  if (loading) return <LoadingSpinner message="Chargement..." />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      data={conversations}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          icon={<MessageCircle size={48} color={colors.primaryLight} />}
          title="Aucune conversation"
          description="Vos échanges avec les médecins apparaîtront ici"
        />
      }
      renderItem={({ item }) => {
        const name = item.doctorName ?? item.patientName ?? "Inconnu";
        const subtitle = item.doctorSpecialty ?? item.patientPhone ?? "";
        const avatarColor =
          item.doctorName ? colors.primary : colors.ink;

        return (
          <Pressable
            style={[styles.card, shadow.sm]}
            onPress={() => router.push(`/messages/${item.id}`)}
          >
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
              {item.lastMessageAt ? (
                <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
              ) : null}
            </View>

            <ChevronRight size={18} color={colors.slate200} />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  cardBody: { flex: 1 },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    color: colors.slate400,
    marginTop: 3,
  },
});
