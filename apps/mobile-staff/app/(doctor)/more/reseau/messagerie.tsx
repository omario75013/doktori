import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  FlatList,
  RefreshControl,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { Loader, Empty } from "../_ui";

type PeerConversation = {
  id: string;
  peerId: string;
  peerName: string;
  peerPhotoUrl: string | null;
  peerSpecialty: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
}

export default function NetworkMessagerie() {
  const [items, setItems] = useState<PeerConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await api<PeerConversation[]>("/api/doctor/peer-conversations").catch(
        () => [] as PeerConversation[]
      );
      setItems(rows ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function open(c: PeerConversation) {
    router.push({
      pathname: "/(doctor)/chat/[id]",
      params: {
        id: c.id,
        kind: "peer",
        peerName: c.peerName,
        peerId: c.peerId,
      },
    });
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.reseauMessagerie.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.reseauMessagerie.title"),
          headerShadowVisible: false,
        }}
      />

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Empty
            icon="chatbubbles-outline"
            title={t("doctor.reseauMessagerie.empty")}
            sub={t("doctor.reseauMessagerie.emptyHint")}
          />
        </View>
      ) : (
        <FlatList
          style={styles.root}
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={colors.teal}
            />
          }
          renderItem={({ item: c }) => (
            <Pressable onPress={() => open(c)} style={styles.row}>
              {c.peerPhotoUrl ? (
                <Image source={{ uri: c.peerPhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{initialsOf(c.peerName)}</Text>
                </View>
              )}
              <View style={styles.body}>
                <View style={styles.topLine}>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.peerName}
                  </Text>
                  <Text style={styles.time}>{formatTime(c.lastMessageAt)}</Text>
                </View>
                <View style={styles.bottomLine}>
                  <Text style={styles.preview} numberOfLines={1}>
                    {c.lastMessage ?? c.peerSpecialty ?? ""}
                  </Text>
                  {c.unread > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{c.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.foregroundSecondary} />
            </Pressable>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing["2xl"] },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgSecondary },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: colors.tealDark },
  avatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  body: { flex: 1, gap: 3 },
  topLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  name: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.foreground },
  time: { fontSize: 11, color: colors.foregroundSecondary },
  bottomLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  preview: { flex: 1, fontSize: 12, color: colors.foregroundSecondary },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
