import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";

type DayOff = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  practiceId?: string | null;
};

type Status = "upcoming" | "ongoing" | "past";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-TN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString("fr-TN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysBetween(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1);
}

function statusOf(r: DayOff, today: string): Status {
  if (r.endDate < today) return "past";
  if (r.startDate > today) return "upcoming";
  return "ongoing";
}

export default function SecretaryCongesScreen() {
  const [rows, setRows] = useState<DayOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<DayOff | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api<DayOff[]>("/api/doctor/days-off", { noRedirect: true });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError(t("secretary.conges.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const ongoing = rows.filter((r) => statusOf(r, today) === "ongoing");
  const upcoming = rows.filter((r) => statusOf(r, today) === "upcoming");
  const past = rows.filter((r) => statusOf(r, today) === "past");

  function renderCard(r: DayOff) {
    const st = statusOf(r, today);
    const badgeBg =
      st === "ongoing" ? "#F59E0B" : st === "upcoming" ? colors.teal : colors.border;
    const badgeLabel =
      st === "ongoing"
        ? t("secretary.conges.badgeOngoing")
        : st === "upcoming"
          ? t("secretary.conges.badgeUpcoming")
          : t("secretary.conges.badgePast");
    const n = daysBetween(r.startDate, r.endDate);
    const durationLabel =
      n > 1
        ? t("secretary.conges.durationPlural").replace("{n}", String(n))
        : t("secretary.conges.duration").replace("{n}", String(n));

    return (
      <Pressable
        key={r.id}
        style={[s.card, st === "past" && s.cardPast]}
        onPress={() => setSelected(r)}
      >
        <View style={s.cardLeft}>
          <View style={[s.dot, { backgroundColor: badgeBg }]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.dateRange, st === "past" && s.textPast]}>
              {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
            </Text>
            <Text style={s.duration}>{durationLabel}</Text>
            {r.reason ? (
              <Text style={s.reason} numberOfLines={1}>
                {r.reason}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[s.badge, { backgroundColor: badgeBg }]}>
          <Text style={s.badgeText}>{badgeLabel}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("secretary.conges.title"),
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{ paddingHorizontal: spacing.sm }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.banner}>
          <Ionicons name="information-circle" size={18} color={colors.teal} />
          <Text style={s.bannerText}>{t("secretary.conges.infoBanner")}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["2xl"] }} />
        ) : error ? (
          <View style={s.empty}>
            <Ionicons name="alert-circle-outline" size={42} color={colors.danger} />
            <Text style={s.emptyText}>{error}</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.border} />
            <Text style={s.emptyText}>{t("secretary.conges.empty")}</Text>
            <Text style={s.emptyHint}>{t("secretary.conges.emptyHint")}</Text>
          </View>
        ) : (
          <>
            {ongoing.length > 0 && (
              <>
                <Text style={s.sectionLabel}>{t("secretary.conges.ongoing")}</Text>
                {ongoing.map(renderCard)}
              </>
            )}
            {upcoming.length > 0 && (
              <>
                <Text style={[s.sectionLabel, ongoing.length > 0 && { marginTop: spacing.xl }]}>
                  {t("secretary.conges.upcoming")}
                </Text>
                {upcoming.map(renderCard)}
              </>
            )}
            {past.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: spacing.xl }]}>
                  {t("secretary.conges.past")}
                </Text>
                {past.map(renderCard)}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={selected !== null}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{t("secretary.conges.details")}</Text>
              <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            {selected ? (
              <>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>{t("secretary.conges.from")}</Text>
                  <Text style={s.detailValue}>{fmtDateLong(selected.startDate)}</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>{t("secretary.conges.to")}</Text>
                  <Text style={s.detailValue}>{fmtDateLong(selected.endDate)}</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>{t("secretary.conges.reasonLabel")}</Text>
                  <Text style={s.detailValue}>
                    {selected.reason || t("secretary.conges.noReason")}
                  </Text>
                </View>

                <Pressable style={s.closeBtn} onPress={() => setSelected(null)}>
                  <Text style={s.closeBtnText}>{t("secretary.conges.close")}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.sm },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bannerText: { flex: 1, fontSize: 12, color: colors.foregroundSecondary, lineHeight: 17 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardPast: { opacity: 0.55 },
  cardLeft: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  dateRange: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  duration: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  reason: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2, fontStyle: "italic" },
  textPast: { color: colors.foregroundSecondary },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { alignItems: "center", paddingVertical: spacing["3xl"], gap: spacing.sm },
  emptyText: { fontSize: 15, fontWeight: "600", color: colors.foreground, textAlign: "center" },
  emptyHint: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center", paddingHorizontal: spacing.xl },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing["3xl"],
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  detailLabel: { fontSize: 11, fontWeight: "600", color: colors.foregroundSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: 14, color: colors.foreground },
  closeBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
