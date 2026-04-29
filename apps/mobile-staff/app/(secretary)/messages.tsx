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
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";

type StaffConversation = {
  id: string;
  peerType: "doctor" | "secretary";
  peerId: string;
  peerName: string;
  peerPhotoUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
};

export default function SecretaryMessages() {
  const [convs, setConvs] = useState<StaffConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setError(null);
    try {
      const data = await api<StaffConversation[]>("/api/staff/conversations", { noRedirect: true });
      setConvs(data);
    } catch {
      setError(t("secretary.messages.errorLoad"));
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
        <Text style={styles.title}>{t("secretary.messages.title")}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      ) : convs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>{t("secretary.messages.empty")}</Text>
          <Text style={styles.emptySubtext}>{t("secretary.messages.emptyDesc")}</Text>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          renderItem={({ item }) => {
            const initials = item.peerName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            const time = item.lastMessageAt
              ? new Date(item.lastMessageAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
              : null;
            return (
              <Pressable
                style={styles.row}
                onPress={() =>
                  router.push({
                    pathname: "/(secretary)/chat/[id]" as never,
                    params: { id: item.id, peerName: item.peerName, peerId: item.peerId, peerType: item.peerType },
                  })
                }
              >
                <View style={styles.avatarWrap}>
                  <View style={[styles.avatar, { backgroundColor: item.peerType === "doctor" ? "#DBEAFE" : colors.bgSecondary }]}>
                    <Text style={[styles.avatarText, { color: item.peerType === "doctor" ? "#1E40AF" : colors.teal }]}>{initials}</Text>
                  </View>
                  {item.unread > 0 && <View style={styles.badge} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName}>{item.peerName}</Text>
                    {time && <Text style={styles.rowTime}>{time}</Text>}
                  </View>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.lastMessage ?? (item.peerType === "doctor" ? t("secretary.messages.peerDoctor") : t("secretary.messages.peerSecretary"))}
                  </Text>
                </View>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unread}</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
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
  emptySubtext: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center" },
  retryBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { color: "#FFF", fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.teal, fontWeight: "800", fontSize: 15 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  rowMeta: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  rowTime: { fontSize: 11, color: colors.foregroundSecondary },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  unreadBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
});
