import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  RefreshControl,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { Screen, Loader, Empty } from "./_ui";

type Filter = "all" | "patients" | "peers" | "team" | "archived";

type PatientConv = {
  id: string;
  status: string | null;
  lastMessageAt: string | null;
  patientId: string;
  patientName: string | null;
  patientPhone: string | null;
};

type PeerConv = {
  id: string;
  peerId: string;
  peerName: string | null;
  peerSpecialty: string | null;
  peerPhotoUrl?: string | null;
  lastMessageAt: string | null;
  lastMessage: string | null;
  unread: number;
};

type StaffConv = {
  id: string;
  peerId?: string;
  peerName?: string | null;
  peerType?: "doctor" | "secretary";
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
};

type Row = {
  id: string;
  kind: "patient" | "peer" | "team";
  name: string;
  subtitle: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  archived: boolean;
  peerId: string;
  peerType?: "doctor" | "secretary";
};

export default function MessagesArchiveScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [patientsRaw, peersRaw, teamRaw] = await Promise.all([
        api<PatientConv[]>("/api/doctor/conversations").catch(() => []),
        api<PeerConv[]>("/api/doctor/peer-conversations").catch(() => []),
        api<unknown>("/api/staff/conversations").catch(() => []),
      ]);

      const team: StaffConv[] = Array.isArray(teamRaw)
        ? (teamRaw as StaffConv[])
        : ((teamRaw as { conversations?: StaffConv[] })?.conversations ?? []);

      const all: Row[] = [
        ...(patientsRaw ?? []).map<Row>((c) => ({
          id: c.id,
          kind: "patient",
          name: c.patientName ?? t("doctor.messagesArchive.patient"),
          subtitle: c.patientPhone ?? "",
          lastMessage: null,
          lastMessageAt: c.lastMessageAt,
          archived: c.status === "archived",
          peerId: c.patientId,
        })),
        ...(peersRaw ?? []).map<Row>((c) => ({
          id: c.id,
          kind: "peer",
          name: c.peerName ?? t("doctor.messagesArchive.peer"),
          subtitle: c.peerSpecialty ?? "",
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          archived: false,
          peerId: c.peerId,
        })),
        ...team.map<Row>((c) => ({
          id: c.id,
          kind: "team",
          name: c.peerName ?? t("doctor.messagesArchive.teamMember"),
          subtitle: c.peerType === "secretary" ? t("doctor.messagesArchive.secretary") : t("doctor.messagesArchive.doctor"),
          lastMessage: c.lastMessage ?? null,
          lastMessageAt: c.lastMessageAt ?? null,
          archived: false,
          peerId: c.peerId ?? "",
          peerType: c.peerType,
        })),
      ];
      all.sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
      setRows(all);
    } catch {
      setRows([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "patients" && r.kind !== "patient") return false;
      if (filter === "peers" && r.kind !== "peer") return false;
      if (filter === "team" && r.kind !== "team") return false;
      if (filter === "archived" && !r.archived) return false;
      if (filter === "all" && r.archived) return false;
      if (q) {
        const hay = `${r.name} ${r.subtitle} ${r.lastMessage ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  function openConversation(r: Row) {
    router.push({
      pathname: "/(doctor)/chat/[id]" as never,
      params: {
        id: r.id,
        kind: r.kind,
        peerName: r.name,
        peerId: r.peerId,
        peerType: r.peerType ?? (r.kind === "patient" ? "patient" : "doctor"),
      },
    });
  }

  if (!rows) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.messagesArchive.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.messagesArchive.title") }} />
      <View style={styles.root}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.foregroundSecondary} />
          <TextInput
            placeholder={t("doctor.messagesArchive.searchPlaceholder")}
            placeholderTextColor={colors.foregroundSecondary}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.foregroundSecondary} />
            </Pressable>
          )}
        </View>

        <View style={styles.filters}>
          <FilterChip label={t("doctor.messagesArchive.filterAll")} active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterChip label={t("doctor.messagesArchive.filterPatients")} active={filter === "patients"} onPress={() => setFilter("patients")} />
          <FilterChip label={t("doctor.messagesArchive.filterPeers")} active={filter === "peers"} onPress={() => setFilter("peers")} />
          <FilterChip label={t("doctor.messagesArchive.filterTeam")} active={filter === "team"} onPress={() => setFilter("team")} />
          <FilterChip label={t("doctor.messagesArchive.filterArchived")} active={filter === "archived"} onPress={() => setFilter("archived")} />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(r) => `${r.kind}-${r.id}`}
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
          ListEmptyComponent={
            <Empty
              icon="chatbubbles-outline"
              title={t("doctor.messagesArchive.empty")}
              sub={search ? t("doctor.messagesArchive.emptyHintSearch") : t("doctor.messagesArchive.emptyHint")}
            />
          }
          renderItem={({ item }) => <ConversationRow item={item} onPress={() => openConversation(item)} />}
        />
      </View>
    </>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ConversationRow({ item, onPress }: { item: Row; onPress: () => void }) {
  const initials = item.name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
  const date = item.lastMessageAt
    ? new Date(item.lastMessageAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : null;
  const iconByKind: Record<Row["kind"], React.ComponentProps<typeof Ionicons>["name"]> = {
    patient: "person",
    peer: "medkit",
    team: "people",
  };
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials || "?"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          {date && <Text style={styles.rowTime}>{date}</Text>}
        </View>
        <View style={styles.rowMetaWrap}>
          <View style={styles.kindChip}>
            <Ionicons name={iconByKind[item.kind]} size={9} color={colors.teal} />
            <Text style={styles.kindChipText}>
              {item.kind === "patient"
                ? t("doctor.messagesArchive.kindPatient")
                : item.kind === "peer"
                  ? t("doctor.messagesArchive.kindPeer")
                  : t("doctor.messagesArchive.kindTeam")}
            </Text>
          </View>
          {item.archived && (
            <View style={[styles.kindChip, { backgroundColor: "#FED7AA" }]}>
              <Ionicons name="archive" size={9} color="#9A3412" />
              <Text style={[styles.kindChipText, { color: "#9A3412" }]}>
                {t("doctor.messagesArchive.archivedTag")}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.rowLast} numberOfLines={1}>
          {item.lastMessage ?? item.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground, paddingVertical: 0 },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.foreground },
  chipTextActive: { color: "#FFFFFF" },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: spacing["2xl"] },
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
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#1E40AF", fontWeight: "800", fontSize: 14 },
  rowHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.xs },
  rowName: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  rowTime: { fontSize: 11, color: colors.foregroundSecondary },
  rowMetaWrap: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  kindChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  kindChipText: { fontSize: 9, fontWeight: "700", color: colors.foreground },
  rowLast: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 4 },
});
