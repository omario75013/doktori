import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Conversation = {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhotoUrl: string | null;
  lastMessageAt: string | null;
  status: string;
};

async function getPatientToken(): Promise<string | null> {
  const SecureStore = await import("expo-secure-store").catch(() => null);
  return SecureStore ? SecureStore.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

export default function PatientMessages() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setError(null);
    try {
      const token = await getPatientToken();
      const data = await api<Conversation[]>("/api/conversations", { token: token ?? undefined });
      setConvs(data);
    } catch {
      setError("Impossible de charger les messages");
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : convs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>Aucune conversation</Text>
          <Text style={styles.emptySubText}>Vos échanges avec vos médecins apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/(patient)/chat/[id]" as never,
                  params: { id: item.id, doctorName: item.doctorName },
                })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.doctorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.doctorName}</Text>
                <Text style={styles.rowMeta}>{item.doctorSpecialty}</Text>
              </View>
              {item.lastMessageAt && (
                <Text style={styles.rowTime}>
                  {new Date(item.lastMessageAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyText: { fontSize: 15, color: colors.foregroundSecondary, textAlign: "center" },
  emptySubText: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center" },
  retryBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { color: "#FFF", fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  rowName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  rowMeta: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  rowTime: { fontSize: 11, color: colors.foregroundSecondary },
});
