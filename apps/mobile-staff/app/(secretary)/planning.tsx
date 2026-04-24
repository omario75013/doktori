import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Linking,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";
import { useStaffPermissions } from "../../hooks/useStaffPermissions";

const { width: SCREEN_W } = Dimensions.get("window");

type ViewMode = "day" | "week" | "month" | "year";

const MONTHS_SHORT = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];
const MONTHS_LONG = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
  patientPhone: string;
  patientNoShowCount?: number;
  practiceId: string | null;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  confirmed: { label: "Confirmé",   color: "#0E7490", bg: "#F0FDFA", border: "#0891B2" },
  pending:   { label: "En attente", color: "#B45309", bg: "#FFFBEB", border: "#F59E0B" },
  completed: { label: "Terminé",    color: "#374151", bg: "#F3F4F6", border: "#9CA3AF" },
  cancelled: { label: "Annulé",     color: "#B91C1C", bg: "#FEF2F2", border: "#EF4444" },
  no_show:   { label: "Absent",     color: "#7C3AED", bg: "#F5F3FF", border: "#8B5CF6" },
};

// ── Date helpers ──────────────────────────────────────────────────────────────
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(start: string, end: string): string {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  return `${diff} min`;
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function getWeekDates(anchor: Date): Date[] {
  const mon = getWeekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const padding = startDow === 0 ? 6 : startDow - 1;
  const cells: (Date | null)[] = Array(padding).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Root component ────────────────────────────────────────────────────────────
export default function SecretaryPlanning() {
  const { permissions } = useStaffPermissions();
  const [view, setView] = useState<ViewMode>("day");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [all, setAll] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewAppt, setShowNewAppt] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api<Appointment[]>("/api/appointments/doctor", { noRedirect: true });
      setAll(data);
    } catch {
      setError("Impossible de charger le planning");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setUpdating(true);
    try {
      await api(`/api/appointments/${id}/status`, { method: "PATCH", body: { status }, noRedirect: true });
      setAll((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      setSelected((s) => s ? { ...s, status } : s);
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur");
    } finally {
      setUpdating(false);
    }
  }

  const weekDates = useMemo(() => getWeekDates(anchor), [anchor]);

  const dayAppts = useMemo(() =>
    all.filter((a) => isoDate(new Date(a.startsAt)) === isoDate(anchor))
       .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [all, anchor]);

  const weekAppts = useMemo(() => {
    const s = new Set(weekDates.map(isoDate));
    return all
      .filter((a) => s.has(isoDate(new Date(a.startsAt))))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [all, weekDates]);

  const monthGrid = useMemo(() => getMonthGrid(anchor.getFullYear(), anchor.getMonth()), [anchor]);

  const monthAppts = useMemo(() =>
    all.filter((a) => {
      const d = new Date(a.startsAt);
      return d.getFullYear() === anchor.getFullYear() && d.getMonth() === anchor.getMonth();
    }),
    [all, anchor]);

  function navigate(dir: 1 | -1) {
    const d = new Date(anchor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setAnchor(d);
  }

  function periodLabel(): string {
    if (view === "day") {
      return anchor.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    }
    if (view === "week") {
      const mon = weekDates[0];
      const sun = weekDates[6];
      if (mon.getMonth() === sun.getMonth()) {
        return `${mon.getDate()} – ${sun.getDate()} ${MONTHS_SHORT[mon.getMonth()]} ${mon.getFullYear()}`;
      }
      return `${mon.getDate()} ${MONTHS_SHORT[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]} ${sun.getFullYear()}`;
    }
    if (view === "month") return `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;
    return String(anchor.getFullYear());
  }

  const todayStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      {/* Header row: title + action buttons */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Planning</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{todayStr}</Text>
        </View>
        <View style={styles.headerActions}>
          {permissions?.rendezVousCreate && (
            <Pressable
              onPress={() => setShowNewAppt(true)}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <Ionicons name="add" size={22} color={colors.teal} />
            </Pressable>
          )}
          <Pressable onPress={() => setSearchOpen(true)} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="search-outline" size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* View tabs row */}
      <View style={styles.viewTabsRow}>
        <View style={styles.viewToggle}>
          {(["day", "week", "month", "year"] as ViewMode[]).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={[styles.viewToggleBtn, view === v && styles.viewToggleBtnActive]}
            >
              <Text style={[styles.viewToggleTxt, view === v && styles.viewToggleTxtActive]}>
                {v === "day" ? "Jour" : v === "week" ? "Sem." : v === "month" ? "Mois" : "An"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Period navigator */}
      <View style={styles.navRow}>
        <Pressable onPress={() => navigate(-1)} style={styles.navArrow} hitSlop={14}>
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={styles.navLabel} numberOfLines={1}>{periodLabel()}</Text>
        <Pressable onPress={() => navigate(1)} style={styles.navArrow} hitSlop={14}>
          <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : view === "day" ? (
        <DayView appts={dayAppts} refreshing={refreshing} onRefresh={onRefresh} onSelect={setSelected} />
      ) : view === "week" ? (
        <WeekView
          appts={weekAppts}
          weekDates={weekDates}
          anchor={anchor}
          onSelectDay={(d) => { setAnchor(d); setView("day"); }}
          onSelect={setSelected}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : view === "month" ? (
        <MonthView
          key={`${anchor.getFullYear()}-${anchor.getMonth()}`}
          appts={monthAppts}
          grid={monthGrid}
          anchor={anchor}
          onDrillDay={(d) => { setAnchor(d); setView("day"); }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onSelect={setSelected}
        />
      ) : (
        <YearView
          all={all}
          year={anchor.getFullYear()}
          onSelectMonth={(m) => { const d = new Date(anchor); d.setMonth(m); d.setDate(1); setAnchor(d); setView("month"); }}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Detail bottom sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)} />
        {selected && (
          <AppointmentSheet
            appt={selected}
            updating={updating}
            onUpdateStatus={updateStatus}
          />
        )}
      </Modal>

      {/* New appointment modal */}
      <NewAppointmentModal
        visible={showNewAppt}
        defaultDate={isoDate(anchor)}
        onClose={() => setShowNewAppt(false)}
        onCreated={() => { setShowNewAppt(false); load(); }}
        canCreatePatient={permissions?.patientsCreate !== false}
      />

      {/* Search modal */}
      <SearchModal
        visible={searchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        all={all}
        onSelect={(a) => { setSearchOpen(false); setSearchQuery(""); setSelected(a); }}
        onClose={() => { setSearchOpen(false); setSearchQuery(""); }}
      />
    </SafeAreaView>
  );
}

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({ appts, refreshing, onRefresh, onSelect }: {
  appts: Appointment[];
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (a: Appointment) => void;
}) {
  if (appts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="sunny-outline" size={52} color={colors.border} />
        <Text style={styles.emptyTitle}>Journée libre</Text>
        <Text style={styles.emptyText}>Aucun rendez-vous ce jour</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={appts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      renderItem={({ item, index }) => (
        <AppointmentRow item={item} index={index} total={appts.length} onSelect={onSelect} />
      )}
    />
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ appts, weekDates, anchor, onSelectDay, onSelect, refreshing, onRefresh }: {
  appts: Appointment[];
  weekDates: Date[];
  anchor: Date;
  onSelectDay: (d: Date) => void;
  onSelect: (a: Appointment) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const today = isoDate(new Date());
  const grouped = weekDates.map((d) => ({
    date: d,
    appts: appts.filter((a) => isoDate(new Date(a.startsAt)) === isoDate(d)),
  }));

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
    >
      {/* 7-column strip */}
      <View style={styles.weekStrip}>
        {weekDates.map((d, i) => {
          const ds = isoDate(d);
          const isToday = ds === today;
          const isSelected = ds === isoDate(anchor);
          const count = appts.filter((a) => isoDate(new Date(a.startsAt)) === ds).length;
          return (
            <Pressable
              key={ds}
              onPress={() => onSelectDay(d)}
              style={[styles.weekStripCell, isSelected && styles.weekStripCellActive, isToday && !isSelected && styles.weekStripCellToday]}
            >
              <Text style={[styles.weekStripLetter, isSelected && { color: "#FFF" }, isToday && !isSelected && { color: colors.teal }]}>
                {["L", "M", "M", "J", "V", "S", "D"][i]}
              </Text>
              <Text style={[styles.weekStripNum, isSelected && { color: "#FFF" }, isToday && !isSelected && { color: colors.teal }]}>
                {d.getDate()}
              </Text>
              {count > 0 ? (
                <View style={styles.weekDotRow}>
                  {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                    <View key={j} style={[styles.weekDot, isSelected && { backgroundColor: "rgba(255,255,255,0.7)" }]} />
                  ))}
                </View>
              ) : <View style={{ height: 7 }} />}
            </Pressable>
          );
        })}
      </View>

      {/* Appointments grouped by day */}
      {grouped.every((g) => g.appts.length === 0) ? (
        <View style={[styles.emptyState, { marginTop: spacing.xl }]}>
          <Ionicons name="calendar-clear-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>Semaine libre</Text>
          <Text style={styles.emptyText}>Aucun rendez-vous cette semaine</Text>
        </View>
      ) : (
        grouped.map(({ date, appts: dayAppts }) => {
          if (dayAppts.length === 0) return null;
          const isToday = isoDate(date) === today;
          return (
            <View key={isoDate(date)}>
              <View style={styles.weekDayHeader}>
                <View style={[styles.weekDayHeaderDot, isToday && { backgroundColor: colors.teal }]} />
                <Text style={[styles.weekDayHeaderText, isToday && { color: colors.teal }]}>
                  {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                </Text>
                <Text style={styles.weekDayHeaderCount}>{dayAppts.length} RDV</Text>
              </View>
              {dayAppts.map((a) => <CompactCard key={a.id} appt={a} onSelect={onSelect} />)}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ appts, grid, anchor, onDrillDay, onSelect, refreshing, onRefresh }: {
  appts: Appointment[];
  grid: (Date | null)[];
  anchor: Date;
  onDrillDay: (d: Date) => void;
  onSelect: (a: Appointment) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [calSelected, setCalSelected] = useState<string>(isoDate(anchor));
  const today = isoDate(new Date());
  const cellW = Math.floor((SCREEN_W - spacing.xl * 2) / 7);

  const selAppts = appts
    .filter((a) => isoDate(new Date(a.startsAt)) === calSelected)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
    >
      {/* DoW header */}
      <View style={[styles.monthDowRow, { paddingHorizontal: spacing.xl }]}>
        {["L", "M", "M", "J", "V", "S", "D"].map((l, i) => (
          <View key={i} style={{ width: cellW, alignItems: "center" }}>
            <Text style={styles.monthDowText}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={[styles.monthGrid, { paddingHorizontal: spacing.xl }]}>
        {grid.map((d, i) => {
          if (!d) return <View key={`pad-${i}`} style={{ width: cellW, height: 56 }} />;
          const ds = isoDate(d);
          const isToday = ds === today;
          const isSelected = ds === calSelected;
          const dots = appts
            .filter((a) => isoDate(new Date(a.startsAt)) === ds)
            .slice(0, 3)
            .map((a) => (STATUS_META[a.status] ?? STATUS_META.pending).border);
          return (
            <Pressable key={ds} onPress={() => setCalSelected(ds)} style={[styles.monthCell, { width: cellW }]}>
              <View style={[
                styles.monthCellInner,
                isSelected && { backgroundColor: colors.teal },
                isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.teal },
              ]}>
                <Text style={[
                  styles.monthCellNum,
                  isSelected && { color: "#FFF" },
                  isToday && !isSelected && { color: colors.teal, fontWeight: "800" },
                ]}>
                  {d.getDate()}
                </Text>
              </View>
              <View style={styles.monthDotRow}>
                {dots.map((c, j) => <View key={j} style={[styles.monthDot, { backgroundColor: c }]} />)}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Selected day panel */}
      <View style={styles.monthPanel}>
        <View style={styles.monthPanelHeader}>
          <Text style={styles.monthPanelTitle} numberOfLines={1}>
            {new Date(calSelected + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
          {selAppts.length > 0 && (
            <Pressable onPress={() => onDrillDay(new Date(calSelected + "T12:00:00"))} style={styles.drillBtn}>
              <Text style={styles.drillBtnText}>Vue jour</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.teal} />
            </Pressable>
          )}
        </View>
        {selAppts.length === 0 ? (
          <Text style={styles.monthNoAppt}>Aucun rendez-vous</Text>
        ) : (
          selAppts.map((a) => <CompactCard key={a.id} appt={a} onSelect={onSelect} />)
        )}
      </View>
    </ScrollView>
  );
}

// ── Year View ─────────────────────────────────────────────────────────────────
const CARD_W = Math.floor((SCREEN_W - spacing.xl * 2 - spacing.md) / 2);
const MINI_CELL = Math.floor(CARD_W / 7);

function MiniCalendar({ year, month, appts }: { year: number; month: number; appts: Appointment[] }) {
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const dotMap = useMemo(() => {
    const m: Record<string, string> = {};
    appts.forEach((a) => {
      const ds = isoDate(new Date(a.startsAt));
      if (!m[ds]) m[ds] = (STATUS_META[a.status] ?? STATUS_META.pending).border;
    });
    return m;
  }, [appts]);
  const todayStr = isoDate(new Date());

  return (
    <View style={yearStyles.miniCal}>
      {/* DoW header */}
      <View style={yearStyles.miniDowRow}>
        {["L","M","M","J","V","S","D"].map((l, i) => (
          <View key={i} style={[yearStyles.miniCell, { width: MINI_CELL }]}>
            <Text style={yearStyles.miniDowText}>{l}</Text>
          </View>
        ))}
      </View>
      {/* Day grid */}
      <View style={yearStyles.miniGrid}>
        {grid.map((d, i) => {
          if (!d) return <View key={`p-${i}`} style={{ width: MINI_CELL, height: 18 }} />;
          const ds = isoDate(d);
          const isToday = ds === todayStr;
          const dot = dotMap[ds];
          return (
            <View key={ds} style={[yearStyles.miniCell, { width: MINI_CELL, height: 18 }]}>
              <Text style={[yearStyles.miniDayNum, isToday && yearStyles.miniDayToday]}>
                {d.getDate()}
              </Text>
              {dot
                ? <View style={[yearStyles.miniDot, { backgroundColor: dot }]} />
                : <View style={yearStyles.miniDotEmpty} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function YearView({ all, year, onSelectMonth, refreshing, onRefresh }: {
  all: Appointment[];
  year: number;
  onSelectMonth: (m: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const today = new Date();

  const monthData = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => {
      const appts = all.filter((a) => {
        const d = new Date(a.startsAt);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      const confirmed = appts.filter((a) => a.status === "confirmed").length;
      const pending   = appts.filter((a) => a.status === "pending").length;
      const completed = appts.filter((a) => a.status === "completed").length;
      const cancelled = appts.filter((a) => a.status === "cancelled" || a.status === "no_show").length;
      return { month: m, appts, total: appts.length, confirmed, pending, completed, cancelled };
    }),
    [all, year]);

  // Year-level stats
  const yearTotal     = monthData.reduce((s, m) => s + m.total, 0);
  const yearConfirmed = monthData.reduce((s, m) => s + m.confirmed, 0);
  const yearPending   = monthData.reduce((s, m) => s + m.pending, 0);

  return (
    <ScrollView
      contentContainerStyle={yearStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
    >
      {/* Year summary banner */}
      <View style={yearStyles.banner}>
        <View style={yearStyles.bannerStat}>
          <Text style={yearStyles.bannerNum}>{yearTotal}</Text>
          <Text style={yearStyles.bannerLabel}>Total RDV</Text>
        </View>
        <View style={yearStyles.bannerDivider} />
        <View style={yearStyles.bannerStat}>
          <Text style={[yearStyles.bannerNum, { color: "#0891B2" }]}>{yearConfirmed}</Text>
          <Text style={yearStyles.bannerLabel}>Confirmés</Text>
        </View>
        <View style={yearStyles.bannerDivider} />
        <View style={yearStyles.bannerStat}>
          <Text style={[yearStyles.bannerNum, { color: "#F59E0B" }]}>{yearPending}</Text>
          <Text style={yearStyles.bannerLabel}>En attente</Text>
        </View>
      </View>

      {/* 2-column month grid */}
      <View style={yearStyles.grid}>
        {monthData.map(({ month, appts, total, confirmed, pending, cancelled }) => {
          const isCurrent = year === today.getFullYear() && month === today.getMonth();
          return (
            <Pressable
              key={month}
              onPress={() => onSelectMonth(month)}
              style={({ pressed }) => [
                yearStyles.card,
                isCurrent && yearStyles.cardCurrent,
                pressed && { opacity: 0.8 },
              ]}
            >
              {/* Month header */}
              <View style={yearStyles.cardHeader}>
                <Text style={[yearStyles.monthName, isCurrent && { color: colors.teal }]}>
                  {MONTHS_LONG[month]}
                </Text>
                {total > 0 && (
                  <View style={[yearStyles.totalBadge, isCurrent && { backgroundColor: colors.teal }]}>
                    <Text style={[yearStyles.totalBadgeText, isCurrent && { color: "#FFF" }]}>{total}</Text>
                  </View>
                )}
              </View>

              {/* Mini calendar */}
              <MiniCalendar year={year} month={month} appts={appts} />

              {/* Status pills */}
              {total > 0 ? (
                <View style={yearStyles.pills}>
                  {confirmed > 0 && <StatPill count={confirmed} color="#0891B2" />}
                  {pending   > 0 && <StatPill count={pending}   color="#F59E0B" />}
                  {cancelled > 0 && <StatPill count={cancelled} color="#EF4444" />}
                </View>
              ) : (
                <Text style={yearStyles.freeLabel}>Aucun RDV</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function StatPill({ count, color }: { count: number; color: string }) {
  return (
    <View style={[yearStyles.pill, { backgroundColor: color + "20", borderColor: color }]}>
      <View style={[yearStyles.pillDot, { backgroundColor: color }]} />
      <Text style={[yearStyles.pillText, { color }]}>{count}</Text>
    </View>
  );
}

const yearStyles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing["3xl"] },
  banner: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  bannerStat: { flex: 1, alignItems: "center", gap: 2 },
  bannerNum: { fontSize: 20, fontWeight: "800", color: colors.foreground },
  bannerLabel: { fontSize: 11, color: colors.foregroundSecondary, fontWeight: "600" },
  bannerDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    width: CARD_W,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.sm,
    backgroundColor: colors.bg,
    gap: spacing.xs,
  },
  cardCurrent: { borderColor: colors.teal, borderWidth: 1.5 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  monthName: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  totalBadge: {
    backgroundColor: colors.bgSecondary, borderRadius: radii.full,
    minWidth: 22, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  totalBadgeText: { fontSize: 11, fontWeight: "800", color: colors.foregroundSecondary },

  miniCal: { gap: 1 },
  miniDowRow: { flexDirection: "row" },
  miniGrid: { flexDirection: "row", flexWrap: "wrap" },
  miniCell: { alignItems: "center" },
  miniDowText: { fontSize: 7, fontWeight: "700", color: colors.border, textTransform: "uppercase" },
  miniDayNum: { fontSize: 8, color: colors.foregroundSecondary, lineHeight: 11 },
  miniDayToday: { color: colors.teal, fontWeight: "800" },
  miniDot: { width: 4, height: 4, borderRadius: 2 },
  miniDotEmpty: { width: 4, height: 4 },

  pills: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderWidth: 1, borderRadius: radii.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: "700" },
  freeLabel: { fontSize: 10, color: colors.border, fontStyle: "italic", marginTop: 2 },
});

// ── Compact card (week + month panel) ────────────────────────────────────────
function CompactCard({ appt, onSelect }: { appt: Appointment; onSelect: (a: Appointment) => void }) {
  const meta = STATUS_META[appt.status] ?? STATUS_META.pending;
  const initials = appt.patientName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Pressable onPress={() => onSelect(appt)} style={({ pressed }) => [styles.compactCard, pressed && { opacity: 0.8 }]}>
      <View style={[styles.compactAccent, { backgroundColor: meta.border }]} />
      <View style={styles.compactTime}>
        <Text style={styles.compactTimeText}>{fmtTime(appt.startsAt)}</Text>
        <Text style={styles.compactDuration}>{fmtDuration(appt.startsAt, appt.endsAt)}</Text>
      </View>
      <View style={[styles.compactAvatar, { backgroundColor: meta.bg }]}>
        <Text style={[styles.compactAvatarText, { color: meta.border }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.compactName} numberOfLines={1}>{appt.patientName}</Text>
        <Text style={styles.compactReason} numberOfLines={1}>
          {appt.reason ?? (appt.type === "teleconsult" ? "Téléconsultation" : "Consultation")}
        </Text>
      </View>
      <View style={[styles.compactStatusDot, { backgroundColor: meta.border }]} />
    </Pressable>
  );
}

// ── Appointment row (day timeline) ────────────────────────────────────────────
function AppointmentRow({ item, index, total, onSelect }: {
  item: Appointment;
  index: number;
  total: number;
  onSelect: (a: Appointment) => void;
}) {
  const meta = STATUS_META[item.status] ?? STATUS_META.pending;
  const initials = item.patientName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={() => onSelect(item)}>
        <View style={styles.timeCol}>
          <Text style={styles.timeHour}>{fmtTime(item.startsAt)}</Text>
          <Text style={styles.timeDuration}>{fmtDuration(item.startsAt, item.endsAt)}</Text>
        </View>
        <View style={styles.timelineCol}>
          <View style={[styles.timelineDot, { backgroundColor: meta.border }]} />
          {index < total - 1 && <View style={styles.timelineBar} />}
        </View>
        <View style={[styles.cardContent, { borderLeftColor: meta.border }]}>
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: meta.bg }]}>
              <Text style={[styles.avatarText, { color: meta.border }]}>{initials}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.patientName} numberOfLines={1}>{item.patientName}</Text>
              {item.reason ? (
                <Text style={styles.reason} numberOfLines={1}>{item.reason}</Text>
              ) : (
                <Text style={styles.reasonPlaceholder}>
                  {item.type === "teleconsult" ? "Téléconsultation" : item.type === "domicile" ? "À domicile" : "Consultation"}
                </Text>
              )}
            </View>
            <View style={styles.cardRight}>
              <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Pressable onPress={() => Linking.openURL(`tel:${item.patientPhone}`)} style={styles.phoneBtn} hitSlop={8}>
                <Ionicons name="call-outline" size={16} color={colors.teal} />
              </Pressable>
            </View>
          </View>
          {(item.patientNoShowCount ?? 0) > 0 && (
            <View style={styles.warningRow}>
              <Ionicons name="warning-outline" size={12} color="#D97706" />
              <Text style={styles.warningText}>{item.patientNoShowCount} absence(s) précédente(s)</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

// ── New Appointment Modal ─────────────────────────────────────────────────────
type PatientOption = { id: string; name: string; phone: string };

function NewAppointmentModal({ visible, defaultDate, onClose, onCreated, canCreatePatient = true }: {
  visible: boolean;
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
  canCreatePatient?: boolean;
}) {
  const [step, setStep] = useState<"patient" | "new-patient" | "details">("patient");
  const [patientQuery, setPatientQuery] = useState("");
  const [allPatients, setAllPatients] = useState<PatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);

  // New patient form
  const [npName, setNpName] = useState("");
  const [npPhone, setNpPhone] = useState("");
  const [npEmail, setNpEmail] = useState("");
  const [npCreating, setNpCreating] = useState(false);

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [apptType, setApptType] = useState<"cabinet" | "teleconsult" | "domicile">("cabinet");
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setStep("patient");
      setPatientQuery("");
      setSelectedPatient(null);
      setDate(defaultDate);
      setTime("09:00");
      setDuration(30);
      setApptType("cabinet");
      setReason("");
      setNpName("");
      setNpPhone("");
      setNpEmail("");
    }
  }, [visible, defaultDate]);

  // Load patients once
  useEffect(() => {
    if (!visible || allPatients.length > 0) return;
    setPatientsLoading(true);
    api<PatientOption[]>("/api/doctor/patients", { noRedirect: true })
      .then(setAllPatients)
      .catch(() => {})
      .finally(() => setPatientsLoading(false));
  }, [visible]);

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return allPatients.slice(0, 20);
    return allPatients
      .filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q))
      .slice(0, 20);
  }, [patientQuery, allPatients]);

  async function create() {
    if (!selectedPatient) return;
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !time.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("Format invalide", "Date: AAAA-MM-JJ, Heure: HH:MM");
      return;
    }
    setCreating(true);
    try {
      const startsAt = new Date(`${date}T${time}:00`).toISOString();
      const endsAt = new Date(`${date}T${time}:00`);
      endsAt.setMinutes(endsAt.getMinutes() + duration);
      await api("/api/appointments/doctor", {
        method: "POST",
        body: {
          patientId: selectedPatient.id,
          startsAt,
          endsAt: endsAt.toISOString(),
          type: apptType,
          reason: reason.trim() || null,
        },
        noRedirect: true,
      });
      Alert.alert("RDV créé", `Rendez-vous avec ${selectedPatient.name} confirmé.`);
      onCreated();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  }

  async function createPatient() {
    const name = npName.trim();
    const phone = npPhone.trim().replace(/\s+/g, "");
    if (!name) { Alert.alert("Champ requis", "Le nom est obligatoire."); return; }
    if (!phone) { Alert.alert("Champ requis", "Le numéro de téléphone est obligatoire."); return; }
    setNpCreating(true);
    try {
      const created = await api<PatientOption>("/api/doctor/patients", {
        method: "POST",
        body: { name, phone, email: npEmail.trim() || undefined },
        noRedirect: true,
      });
      setAllPatients((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setSelectedPatient(created);
      setStep("details");
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible de créer le patient");
    } finally {
      setNpCreating(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { maxHeight: "90%" }]}>
        <View style={styles.sheetHandle} />

        {/* Header */}
        <View style={newApptStyles.modalHeader}>
          {step !== "patient" ? (
            <Pressable onPress={() => setStep("patient")} hitSlop={10}>
              <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            </Pressable>
          ) : (
            <View style={{ width: 20 }} />
          )}
          <Text style={newApptStyles.modalTitle}>
            {step === "patient" ? "Sélectionner un patient" : step === "new-patient" ? "Nouveau patient" : "Détails du rendez-vous"}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={20} color={colors.foregroundSecondary} />
          </Pressable>
        </View>

        {step === "patient" ? (
          <>
            {/* Patient search */}
            <View style={newApptStyles.searchBar}>
              <Ionicons name="search-outline" size={16} color={colors.foregroundSecondary} />
              <TextInput
                style={newApptStyles.searchInput}
                value={patientQuery}
                onChangeText={setPatientQuery}
                placeholder="Nom ou téléphone…"
                placeholderTextColor={colors.foregroundSecondary}
                autoFocus
              />
              {patientQuery.length > 0 && (
                <Pressable onPress={() => setPatientQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.foregroundSecondary} />
                </Pressable>
              )}
            </View>

            {patientsLoading ? (
              <ActivityIndicator color={colors.teal} style={{ marginVertical: spacing.xl }} />
            ) : (
              <FlatList
                data={filteredPatients}
                keyExtractor={(p) => p.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 280 }}
                ListEmptyComponent={
                  <Text style={newApptStyles.emptyText}>Aucun patient trouvé</Text>
                }
                renderItem={({ item }) => {
                  const initials = item.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <Pressable
                      onPress={() => { setSelectedPatient(item); setStep("details"); }}
                      style={({ pressed }) => [newApptStyles.patientRow, pressed && { backgroundColor: colors.bgSecondary }]}
                    >
                      <View style={newApptStyles.patientAvatar}>
                        <Text style={newApptStyles.patientAvatarText}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={newApptStyles.patientName}>{item.name}</Text>
                        <Text style={newApptStyles.patientPhone}>{item.phone}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.border} />
                    </Pressable>
                  );
                }}
              />
            )}
            {/* Create new patient shortcut — gated by patientsCreate permission */}
            {canCreatePatient && (
              <Pressable
                style={({ pressed }) => [newApptStyles.createPatientBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setStep("new-patient")}
              >
                <Ionicons name="person-add-outline" size={18} color={colors.teal} />
                <Text style={newApptStyles.createPatientBtnText}>Créer un nouveau patient</Text>
              </Pressable>
            )}
          </>
        ) : step === "new-patient" ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.md }}>
            <View>
              <Text style={newApptStyles.fieldLabel}>Nom complet *</Text>
              <TextInput
                style={newApptStyles.fieldInput}
                value={npName}
                onChangeText={setNpName}
                placeholder="Prénom Nom"
                placeholderTextColor={colors.foregroundSecondary}
                autoFocus
              />
            </View>
            <View>
              <Text style={newApptStyles.fieldLabel}>Téléphone *</Text>
              <TextInput
                style={newApptStyles.fieldInput}
                value={npPhone}
                onChangeText={setNpPhone}
                placeholder="+216 XX XXX XXX"
                placeholderTextColor={colors.foregroundSecondary}
                keyboardType="phone-pad"
              />
            </View>
            <View>
              <Text style={newApptStyles.fieldLabel}>Email (optionnel)</Text>
              <TextInput
                style={newApptStyles.fieldInput}
                value={npEmail}
                onChangeText={setNpEmail}
                placeholder="patient@email.com"
                placeholderTextColor={colors.foregroundSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <Pressable
              style={({ pressed }) => [newApptStyles.createBtn, (npCreating || pressed) && { opacity: 0.75 }]}
              onPress={createPatient}
              disabled={npCreating}
            >
              {npCreating
                ? <ActivityIndicator color="#FFF" />
                : <Text style={newApptStyles.createBtnText}>Créer et sélectionner</Text>}
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.md }}>
            {/* Selected patient chip */}
            <Pressable onPress={() => setStep("patient")} style={newApptStyles.patientChip}>
              <View style={newApptStyles.chipAvatar}>
                <Text style={newApptStyles.chipAvatarText}>
                  {selectedPatient!.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={newApptStyles.chipName}>{selectedPatient!.name}</Text>
                <Text style={newApptStyles.chipPhone}>{selectedPatient!.phone}</Text>
              </View>
              <Text style={newApptStyles.changeBtn}>Changer</Text>
            </Pressable>

            {/* Date + Time */}
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={newApptStyles.fieldLabel}>Date</Text>
                <TextInput
                  style={newApptStyles.fieldInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={colors.foregroundSecondary}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={newApptStyles.fieldLabel}>Heure</Text>
                <TextInput
                  style={newApptStyles.fieldInput}
                  value={time}
                  onChangeText={setTime}
                  placeholder="09:00"
                  placeholderTextColor={colors.foregroundSecondary}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>

            {/* Duration */}
            <View>
              <Text style={newApptStyles.fieldLabel}>Durée</Text>
              <View style={newApptStyles.pillRow}>
                {[15, 20, 30, 45, 60].map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDuration(d)}
                    style={[newApptStyles.pill, duration === d && newApptStyles.pillActive]}
                  >
                    <Text style={[newApptStyles.pillText, duration === d && newApptStyles.pillTextActive]}>
                      {d} min
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Type */}
            <View>
              <Text style={newApptStyles.fieldLabel}>Type</Text>
              <View style={newApptStyles.pillRow}>
                {([["cabinet", "Cabinet"], ["teleconsult", "Téléconsult"], ["domicile", "Domicile"]] as const).map(([val, label]) => (
                  <Pressable
                    key={val}
                    onPress={() => setApptType(val)}
                    style={[newApptStyles.pill, apptType === val && newApptStyles.pillActive]}
                  >
                    <Text style={[newApptStyles.pillText, apptType === val && newApptStyles.pillTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Reason */}
            <View>
              <Text style={newApptStyles.fieldLabel}>Motif (optionnel)</Text>
              <TextInput
                style={[newApptStyles.fieldInput, { height: 72, textAlignVertical: "top" }]}
                value={reason}
                onChangeText={setReason}
                placeholder="Raison de la consultation…"
                placeholderTextColor={colors.foregroundSecondary}
                multiline
              />
            </View>

            {/* Summary */}
            {date && time && (
              <View style={newApptStyles.summary}>
                <Ionicons name="calendar-outline" size={16} color={colors.teal} />
                <Text style={newApptStyles.summaryText}>
                  {new Date(`${date}T${time}:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  {" à "}{time} · {duration} min · {apptType === "cabinet" ? "Cabinet" : apptType === "teleconsult" ? "Téléconsultation" : "Domicile"}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [newApptStyles.createBtn, (creating || pressed) && { opacity: 0.75 }]}
              onPress={create}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#FFF" />
                : <Text style={newApptStyles.createBtnText}>Créer le rendez-vous</Text>}
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const newApptStyles = StyleSheet.create({
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  createPatientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
    borderStyle: "dashed",
  },
  createPatientBtnText: { fontSize: 14, fontWeight: "600", color: colors.teal },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
  emptyText: { textAlign: "center", color: colors.foregroundSecondary, padding: spacing.xl, fontSize: 14 },
  patientRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  patientAvatar: {
    width: 38, height: 38, borderRadius: radii.full,
    backgroundColor: colors.teal, alignItems: "center", justifyContent: "center",
  },
  patientAvatarText: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  patientName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  patientPhone: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },
  patientChip: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: "#F0FDFA", borderWidth: 1, borderColor: colors.teal,
    borderRadius: radii.lg, padding: spacing.md,
  },
  chipAvatar: {
    width: 36, height: 36, borderRadius: radii.full,
    backgroundColor: colors.tealDark, alignItems: "center", justifyContent: "center",
  },
  chipAvatarText: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  chipName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  chipPhone: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },
  changeBtn: { fontSize: 12, color: colors.teal, fontWeight: "700" },
  fieldLabel: {
    fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs,
  },
  fieldInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    fontSize: 15, color: colors.foreground,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  pillActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  pillText: { fontSize: 13, fontWeight: "600", color: colors.foregroundSecondary },
  pillTextActive: { color: "#FFF" },
  summary: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.sm,
    backgroundColor: "#F0FDFA", borderRadius: radii.md, padding: spacing.md,
  },
  summaryText: { flex: 1, fontSize: 13, color: colors.teal, fontWeight: "600", textTransform: "capitalize" },
  createBtn: {
    backgroundColor: colors.teal, borderRadius: radii.md,
    paddingVertical: spacing.md + 2, alignItems: "center",
  },
  createBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});

// ── Search modal ──────────────────────────────────────────────────────────────
function SearchModal({ visible, query, onQueryChange, all, onSelect, onClose }: {
  visible: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  all: Appointment[];
  onSelect: (a: Appointment) => void;
  onClose: () => void;
}) {
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all
      .filter((a) =>
        a.patientName.toLowerCase().includes(q) ||
        (a.reason?.toLowerCase().includes(q) ?? false) ||
        a.patientPhone.includes(q)
      )
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .slice(0, 50);
  }, [query, all]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.searchModal}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.foregroundSecondary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={onQueryChange}
            placeholder="Nom du patient, motif, téléphone…"
            placeholderTextColor={colors.foregroundSecondary}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => onQueryChange("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.foregroundSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={onClose} style={styles.searchCancelBtn}>
          <Text style={styles.searchCancelText}>Annuler</Text>
        </Pressable>
      </View>

      {/* Results */}
      <View style={styles.searchResults}>
        {query.trim().length === 0 ? (
          <View style={styles.searchHint}>
            <Ionicons name="search-outline" size={40} color={colors.border} />
            <Text style={styles.searchHintText}>Rechercher un rendez-vous</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.searchHint}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.border} />
            <Text style={styles.searchHintText}>Aucun résultat pour « {query} »</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
            renderItem={({ item }) => {
              const meta = STATUS_META[item.status] ?? STATUS_META.pending;
              const initials = item.patientName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              const dateStr = new Date(item.startsAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
              return (
                <Pressable onPress={() => onSelect(item)} style={({ pressed }) => [styles.searchItem, pressed && { opacity: 0.75 }]}>
                  <View style={[styles.searchItemAvatar, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.searchItemAvatarText, { color: meta.border }]}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchItemName} numberOfLines={1}>{item.patientName}</Text>
                    <Text style={styles.searchItemMeta} numberOfLines={1}>
                      {dateStr} · {fmtTime(item.startsAt)}{item.reason ? ` · ${item.reason}` : ""}
                    </Text>
                  </View>
                  <View style={[styles.searchItemBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                    <Text style={[styles.searchItemBadgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

// ── Appointment bottom sheet ───────────────────────────────────────────────────
function AppointmentSheet({ appt, updating, onUpdateStatus }: {
  appt: Appointment;
  updating: boolean;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const meta = STATUS_META[appt.status] ?? STATUS_META.pending;
  const initials = appt.patientName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetPatientRow}>
        <View style={[styles.sheetAvatar, { backgroundColor: meta.bg }]}>
          <Text style={[styles.sheetAvatarText, { color: meta.border }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetName}>{appt.patientName}</Text>
          <Pressable onPress={() => Linking.openURL(`tel:${appt.patientPhone}`)}>
            <Text style={styles.sheetPhone}>{appt.patientPhone}</Text>
          </Pressable>
        </View>
        <View style={[styles.sheetStatusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
          <Text style={[styles.sheetStatusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <InfoRow icon="time-outline" label="Heure"
          value={`${fmtTime(appt.startsAt)} → ${fmtTime(appt.endsAt)} (${fmtDuration(appt.startsAt, appt.endsAt)})`} />
        {appt.reason && <InfoRow icon="chatbubble-outline" label="Motif" value={appt.reason} />}
        <InfoRow icon="medkit-outline" label="Type"
          value={appt.type === "teleconsult" ? "Téléconsultation" : appt.type === "domicile" ? "À domicile" : "Cabinet"}
          last />
      </View>

      {(appt.patientNoShowCount ?? 0) > 0 && (
        <View style={styles.sheetWarning}>
          <Ionicons name="warning-outline" size={14} color="#B45309" />
          <Text style={styles.sheetWarningText}>
            Patient avec {appt.patientNoShowCount} absence(s) non justifiée(s)
          </Text>
        </View>
      )}

      <View style={styles.actionGrid}>
        {appt.status === "pending" && (
          <ActionBtn label="Confirmer" icon="checkmark-circle-outline" color="#0891B2"
            onPress={() => onUpdateStatus(appt.id, "confirmed")} disabled={updating} />
        )}
        {appt.status !== "completed" && appt.status !== "cancelled" && (
          <ActionBtn label="Terminé" icon="checkmark-done-outline" color="#059669"
            onPress={() => onUpdateStatus(appt.id, "completed")} disabled={updating} />
        )}
        {appt.status !== "no_show" && appt.status !== "cancelled" && appt.status !== "completed" && (
          <ActionBtn label="Absent" icon="person-remove-outline" color="#7C3AED"
            onPress={() => onUpdateStatus(appt.id, "no_show")} disabled={updating} />
        )}
        {appt.status !== "cancelled" && (
          <ActionBtn label="Annuler" icon="close-circle-outline" color="#DC2626"
            onPress={() =>
              Alert.alert("Annuler ce RDV ?", "Cette action ne peut pas être annulée.", [
                { text: "Non", style: "cancel" },
                { text: "Oui, annuler", style: "destructive", onPress: () => onUpdateStatus(appt.id, "cancelled") },
              ])
            }
            disabled={updating}
          />
        )}
      </View>

      <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${appt.patientPhone}`)}>
        <Ionicons name="call" size={18} color="#FFF" />
        <Text style={styles.callBtnText}>Appeler {appt.patientName.split(" ")[0]}</Text>
      </Pressable>
    </View>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, last }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Ionicons name={icon} size={16} color={colors.teal} style={{ width: 22 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function ActionBtn({ label, icon, color, onPress, disabled }: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, { borderColor: color }, (pressed || disabled) && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  subtitle: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1, textTransform: "capitalize" },

  // Header actions
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },

  // View tabs row
  viewTabsRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  viewToggleBtnActive: {
    backgroundColor: colors.bg,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  viewToggleTxt: { fontSize: 12, fontWeight: "600", color: colors.foregroundSecondary },
  viewToggleTxtActive: { color: colors.teal, fontWeight: "700" },

  // Period navigator
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
    textTransform: "capitalize",
  },

  // Day timeline list
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing["3xl"], paddingTop: spacing.xs },
  card: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.xs },
  timeCol: { width: 52, alignItems: "flex-end", paddingRight: spacing.sm, paddingTop: 12 },
  timeHour: { fontSize: 13, fontWeight: "800", color: colors.teal },
  timeDuration: { fontSize: 10, color: colors.foregroundSecondary, marginTop: 1 },
  timelineCol: { width: 20, alignItems: "center", paddingTop: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineBar: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  cardContent: {
    flex: 1, marginLeft: spacing.sm, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3,
    backgroundColor: colors.bg, padding: spacing.md, marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: { width: 38, height: 38, borderRadius: radii.full, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "800" },
  cardInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  reason: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },
  reasonPlaceholder: { fontSize: 12, color: colors.border, marginTop: 1, fontStyle: "italic" },
  cardRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: "700" },
  phoneBtn: { width: 28, height: 28, borderRadius: radii.full, backgroundColor: "#F0FDFA", alignItems: "center", justifyContent: "center" },
  warningRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  warningText: { fontSize: 11, color: "#B45309" },

  // Compact card (week + month panel)
  compactCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: spacing.xl, marginBottom: spacing.xs,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg, overflow: "hidden",
  },
  compactAccent: { width: 3, alignSelf: "stretch" },
  compactTime: { width: 56, alignItems: "center", paddingVertical: spacing.sm },
  compactTimeText: { fontSize: 12, fontWeight: "800", color: colors.teal },
  compactDuration: { fontSize: 10, color: colors.foregroundSecondary, marginTop: 1 },
  compactAvatar: { width: 32, height: 32, borderRadius: radii.full, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },
  compactAvatarText: { fontSize: 12, fontWeight: "800" },
  compactName: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  compactReason: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 1 },
  compactStatusDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: spacing.md },

  // Week view
  weekStrip: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  weekStripCell: {
    flex: 1, alignItems: "center", paddingVertical: spacing.sm,
    borderRadius: radii.lg, gap: 2,
  },
  weekStripCellActive: { backgroundColor: colors.teal },
  weekStripCellToday: { borderWidth: 1.5, borderColor: colors.teal },
  weekStripLetter: { fontSize: 10, fontWeight: "700", color: colors.foregroundSecondary, textTransform: "uppercase" },
  weekStripNum: { fontSize: 16, fontWeight: "800", color: colors.foreground },
  weekDotRow: { flexDirection: "row", gap: 2 },
  weekDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.teal },
  weekDayHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    marginTop: spacing.sm, gap: spacing.sm,
  },
  weekDayHeaderDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  weekDayHeaderText: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.foreground, textTransform: "capitalize" },
  weekDayHeaderCount: { fontSize: 11, color: colors.foregroundSecondary },

  // Month view
  monthDowRow: { flexDirection: "row", paddingTop: spacing.sm, paddingBottom: spacing.xs },
  monthDowText: { fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary, textTransform: "uppercase" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", paddingBottom: spacing.md },
  monthCell: { height: 56, alignItems: "center", paddingTop: 4 },
  monthCellInner: {
    width: 34, height: 34, borderRadius: radii.full,
    alignItems: "center", justifyContent: "center",
  },
  monthCellNum: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  monthDotRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  monthDot: { width: 5, height: 5, borderRadius: 3 },
  monthPanel: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, marginTop: spacing.xs,
  },
  monthPanelHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, gap: spacing.sm,
  },
  monthPanelTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.foreground, textTransform: "capitalize" },
  drillBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  drillBtnText: { fontSize: 12, color: colors.teal, fontWeight: "700" },
  monthNoAppt: {
    fontSize: 13, color: colors.foregroundSecondary,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
  },


  // Empty states
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  retryBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, marginTop: spacing.xs },
  retryText: { color: "#FFF", fontWeight: "700" },

  // Bottom sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii["3xl"],
    borderTopRightRadius: radii["3xl"],
    padding: spacing.xl,
    paddingBottom: spacing["3xl"],
    gap: spacing.lg,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: radii.full, alignSelf: "center", marginBottom: 4 },
  sheetPatientRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sheetAvatar: { width: 52, height: 52, borderRadius: radii.full, alignItems: "center", justifyContent: "center" },
  sheetAvatarText: { fontSize: 20, fontWeight: "800" },
  sheetName: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  sheetPhone: { fontSize: 13, color: colors.teal, fontWeight: "600", marginTop: 2 },
  sheetStatusBadge: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  sheetStatusText: { fontSize: 12, fontWeight: "700" },
  infoCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm, backgroundColor: colors.bg },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 12, fontWeight: "600", color: colors.foregroundSecondary, width: 52 },
  infoValue: { flex: 1, fontSize: 13, color: colors.foreground },
  sheetWarning: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: radii.md, padding: spacing.md,
  },
  sheetWarningText: { flex: 1, fontSize: 13, color: "#B45309" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionBtn: {
    flex: 1, minWidth: "45%", flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: spacing.xs,
    paddingVertical: spacing.sm + 2, borderRadius: radii.md,
    borderWidth: 1.5, backgroundColor: colors.bg,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  callBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, backgroundColor: colors.teal,
    borderRadius: radii.md, paddingVertical: spacing.md,
  },
  callBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },

  // Search modal
  searchModal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: colors.foreground,
  },
  searchCancelBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  searchCancelText: { fontSize: 14, color: colors.teal, fontWeight: "600" },
  searchResults: {
    flex: 1, backgroundColor: colors.bg,
  },
  searchHint: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: spacing.sm, padding: spacing.xl,
  },
  searchHintText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  searchItemAvatar: {
    width: 40, height: 40, borderRadius: radii.full,
    alignItems: "center", justifyContent: "center",
  },
  searchItemAvatarText: { fontSize: 14, fontWeight: "800" },
  searchItemName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  searchItemMeta: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  searchItemBadge: {
    borderWidth: 1, borderRadius: radii.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  searchItemBadgeText: { fontSize: 11, fontWeight: "700" },
});
