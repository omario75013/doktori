import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

type Conversation = {
  id: string;
  peerId?: string;
  peerType?: "doctor" | "secretary";
  peerName?: string;
  peerSpecialty?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  unread?: number;
};

type Tab = "equipe" | "medecins";

export default function MessagerieScreen() {
  const [tab, setTab] = useState<Tab>("equipe");
  const [team, setTeam] = useState<Conversation[]>([]);
  const [peers, setPeers] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tmRaw, peersRaw] = await Promise.all([
        api<unknown>("/api/staff/conversations").catch(() => []),
        api<unknown>("/api/doctor/peer-conversations").catch(() => []),
      ]);
      const tm = Array.isArray(tmRaw)
        ? (tmRaw as Conversation[])
        : ((tmRaw as { conversations?: Conversation[] })?.conversations ?? []);
      const pr = Array.isArray(peersRaw) ? (peersRaw as Conversation[]) : [];
      setTeam(tm);
      setPeers(pr);
    } catch (e) {
      console.warn("messages load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const data = tab === "medecins" ? peers : team;

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Messagerie</Text>
      </View>

      <View style={styles.tabs}>
        <TabBtn
          icon="medkit"
          label={`Équipe${team.length ? ` · ${team.length}` : ""}`}
          active={tab === "equipe"}
          onPress={() => setTab("equipe")}
        />
        <TabBtn
          icon="person"
          label={`Médecins${peers.length ? ` · ${peers.length}` : ""}`}
          active={tab === "medecins"}
          onPress={() => setTab("medecins")}
        />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              tintColor={colors.teal}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.foregroundSecondary} />
              <Text style={styles.emptyText}>
                {tab === "medecins"
                  ? "Aucun médecin dans votre réseau."
                  : "Aucun collègue dans votre équipe encore."}
              </Text>
            </View>
          }
          renderItem={({ item }) => <ConversationRow conversation={item} kind={tab} />}
        />
      )}
    </SafeAreaView>
  );
}

function TabBtn({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Ionicons name={icon} size={14} color={active ? "#FFFFFF" : colors.foreground} />
      <Text style={[styles.tabBtnText, active && { color: "#FFFFFF" }]}>{label}</Text>
    </Pressable>
  );
}

function ConversationRow({ conversation, kind }: { conversation: Conversation; kind: Tab }) {
  const name = conversation.peerName ?? "Conversation";
  const unread = conversation.unreadCount ?? conversation.unread ?? 0;
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const time = conversation.lastMessageAt
    ? new Date(conversation.lastMessageAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : null;
  const peerId = conversation.peerId ?? "";
  const chatKind = kind === "medecins" ? "peer" : "team";

  function open() {
    router.push({
      pathname: "/(doctor)/chat/[id]" as never,
      params: {
        id: conversation.id,
        kind: chatKind,
        peerName: name,
        peerId,
        peerType: conversation.peerType ?? "doctor",
      },
    });
  }

  return (
    <Pressable style={styles.row} onPress={open}>
      <View style={[styles.avatar, { backgroundColor: "#DBEAFE" }]}>
        <Text style={[styles.avatarText, { color: "#1E40AF" }]}>{initials || "?"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <Text style={styles.rowName}>{name}</Text>
          {time && <Text style={styles.rowTime}>{time}</Text>}
        </View>
        <Text style={styles.rowLast} numberOfLines={1}>
          {conversation.lastMessage ?? (kind === "medecins" ? "Confrère" : "Équipe")}
        </Text>
      </View>
      {unread > 0 && (
        <View style={styles.unread}>
          <Text style={styles.unreadText}>{unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  tabs: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.xs, marginBottom: spacing.sm },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  tabBtnActive: { backgroundColor: colors.teal },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    height: 44,
    width: 44,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.teal, fontWeight: "800" },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  rowTime: { fontSize: 11, color: colors.foregroundSecondary },
  rowLast: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  empty: { padding: spacing["2xl"], alignItems: "center", gap: spacing.sm },
  emptyText: { color: colors.foregroundSecondary, fontSize: 13, textAlign: "center" },
});
