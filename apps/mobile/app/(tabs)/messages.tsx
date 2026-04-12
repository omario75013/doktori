import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { MessageCircle, ChevronRight, Clock } from "lucide-react-native";
import { apiFetch, ApiError } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Conversation = {
  id: string;
  doctorName: string;
  doctorSpecialty?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
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
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }

  if (loading) return <LoadingSpinner message="Chargement..." />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1, padding: spacing.md }}
      data={conversations}
      keyExtractor={(c) => c.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        <EmptyState
          icon={<MessageCircle size={48} color={colors.primaryLight} />}
          title="Aucun message"
          description="Vos conversations avec vos médecins apparaîtront ici après une consultation"
        />
      }
      renderItem={({ item }) => (
        <Pressable style={[styles.card, shadow.sm]} onPress={() => {}}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.doctorName?.charAt(0) || "D"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{item.doctorName}</Text>
              {item.lastMessageAt && (
                <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
              )}
            </View>
            {item.doctorSpecialty && <Text style={styles.specialty}>{item.doctorSpecialty}</Text>}
            {item.lastMessage && (
              <Text style={styles.preview} numberOfLines={2}>{item.lastMessage}</Text>
            )}
          </View>
          <View style={styles.rightCol}>
            {item.unreadCount != null && item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
            <ChevronRight size={16} color={colors.slate200} />
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.mist,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: colors.primary },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink, flex: 1 },
  time: { fontSize: 12, color: colors.slate400 },
  specialty: { fontSize: 13, color: colors.primary, marginTop: 1 },
  preview: { fontSize: 14, color: colors.slate500, marginTop: 4, lineHeight: 19 },
  rightCol: { alignItems: "center", gap: 8 },
  unreadBadge: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    minWidth: 22, height: 22, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 12, fontWeight: "700", color: colors.white },
});
