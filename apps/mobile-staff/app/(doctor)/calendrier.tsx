import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, tArray } from "@doktori/mobile-core";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = Math.floor((SCREEN_W - spacing.xl * 2 - spacing.md) / 2);
const MINI_CELL = Math.floor(CARD_W / 7);

function getMonthsLong() {
  return (t("doctor.calendrier.months") as unknown as string[]) ?? ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
}

function getStatusMeta(): Record<string, { label: string; color: string; bg: string; border: string }> {
  return {
    confirmed: { label: t("doctor.calendrier.statusConfirmed"), color: "#0E7490", bg: "#F0FDFA", border: "#0891B2" },
    pending:   { label: t("doctor.calendrier.statusPending"),   color: "#B45309", bg: "#FFFBEB", border: "#F59E0B" },
    completed: { label: t("doctor.calendrier.statusCompleted"), color: "#374151", bg: "#F3F4F6", border: "#9CA3AF" },
    cancelled: { label: t("doctor.calendrier.statusCancelled"), color: "#B91C1C", bg: "#FEF2F2", border: "#EF4444" },
    no_show:   { label: t("doctor.calendrier.statusNoShow"),    color: "#7C3AED", bg: "#F5F3FF", border: "#8B5CF6" },
  };
}

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
function getWeekDates(cursor: Date): Date[] {
  const mon = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}
function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const last = new Date(year, month + 1, 0);
  const cells: (Date | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  return cells;
}

function getDowLetters(): string[] {
  return (t("doctor.calendrier.dowLetters") as unknown as string[]) ?? ["L","M","M","J","V","S","D"];
}

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  practiceId: string | null;
  patientName: string;
  patientPhone: string;
  patientNoShowCount: number;
};

type Practice = {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
};

type PatientSummary = {
  id: string;
  name: string;
  phone: string;
};

type ViewMode = "day" | "week" | "month" | "year" | "settings";

function getViews(): Array<{ id: ViewMode; label: string }> {
  return [
    { id: "day",      label: t("doctor.calendrier.viewDay") },
    { id: "week",     label: t("doctor.calendrier.viewWeek") },
    { id: "month",    label: t("doctor.calendrier.viewMonth") },
    { id: "year",     label: t("doctor.calendrier.viewYear") },
    { id: "settings", label: t("doctor.calendrier.viewSettings") },
  ];
}

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FED7AA", fg: "#9A3412" },
  confirmed: { bg: "#E0F2FE", fg: "#075985" },
  completed: { bg: "#DBEAFE", fg: "#1E40AF" },
  cancelled: { bg: "#E5E7EB", fg: "#4B5563" },
  no_show: { bg: "#FECACA", fg: "#991B1B" },
};

function getStatusLabels(): Record<string, string> {
  return {
    pending: t("doctor.calendrier.statusPending"),
    confirmed: t("doctor.calendrier.statusConfirmed"),
    completed: t("doctor.calendrier.statusCompleted"),
    cancelled: t("doctor.calendrier.statusCancelled"),
    no_show: t("doctor.calendrier.statusNoShow"),
  };
}

function getApptTypes(): Array<{ id: string; label: string }> {
  return [
    { id: "cabinet",     label: t("doctor.calendrier.typesCabinet") },
    { id: "teleconsult", label: t("doctor.calendrier.typesTeleconsult") },
    { id: "domicile",    label: t("doctor.calendrier.typesDomicile") },
  ];
}

const DURATIONS = [15, 20, 30, 45, 60];

export default function CalendrierScreen() {
  const VIEWS = getViews();
  const [view, setView] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [patientList, setPatientList] = useState<PatientSummary[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, pracList, patients] = await Promise.all([
        api<Appointment[]>("/api/appointments/doctor"),
        api<Practice[]>("/api/doctor/practices").catch(() => [] as Practice[]),
        api<PatientSummary[]>("/api/doctor/patients").catch(() => [] as PatientSummary[]),
      ]);
      setAppointments(list);
      setPractices(Array.isArray(pracList) ? pracList.filter((p) => p.isActive) : []);
      setPatientList(Array.isArray(patients) ? patients : []);
    } catch (e) {
      console.warn("calendar load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); void load(); }, [load]);

  const weekDates = useMemo(() => getWeekDates(cursor), [cursor]);
  const monthGrid = useMemo(() => getMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const dayAppts = useMemo(() =>
    appointments
      .filter((a) => isoDate(new Date(a.startsAt)) === isoDate(cursor))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [appointments, cursor]);

  const weekAppts = useMemo(() => {
    const s = new Set(weekDates.map(isoDate));
    return appointments.filter((a) => s.has(isoDate(new Date(a.startsAt))));
  }, [appointments, weekDates]);

  const monthAppts = useMemo(() =>
    appointments.filter((a) => {
      const d = new Date(a.startsAt);
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    }),
    [appointments, cursor]);

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t("doctor.calendrier.title")}</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          {view !== "settings" && (
            <Pressable hitSlop={8} onPress={() => setSearchOpen(true)} style={styles.searchIconBtn}>
              <Ionicons name="search-outline" size={20} color={colors.foreground} />
            </Pressable>
          )}
          {view !== "settings" && (
            <Pressable
              style={styles.addBtn}
              onPress={() => setShowNewModal(true)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>{t("doctor.calendrier.add")}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* View switcher — segmented control style */}
      <View style={styles.viewTabs}>
        {VIEWS.map((v) => (
          <Pressable
            key={v.id}
            onPress={() => setView(v.id)}
            style={[styles.viewTab, view === v.id && styles.viewTabActive]}
          >
            <Text
              style={[
                styles.viewTabText,
                view === v.id && styles.viewTabTextActive,
              ]}
              numberOfLines={1}
            >
              {v.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : view === "settings" ? (
        <AgendaSettings practices={practices} />
      ) : view === "day" ? (
        <DayView
          date={cursor}
          setDate={setCursor}
          appts={dayAppts}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onSelect={setSelectedAppt}
        />
      ) : view === "week" ? (
        <WeekView
          appts={weekAppts}
          weekDates={weekDates}
          anchor={cursor}
          onSelectDay={setCursor}
          onSelect={setSelectedAppt}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : view === "month" ? (
        <MonthView
          appts={monthAppts}
          grid={monthGrid}
          anchor={cursor}
          onDrillDay={(d) => { setCursor(d); setView("day"); }}
          onSelect={setSelectedAppt}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        <YearView
          all={appointments}
          year={cursor.getFullYear()}
          onSelectMonth={(m) => {
            const d = new Date(cursor);
            d.setMonth(m);
            d.setDate(1);
            setCursor(d);
            setView("month");
          }}
          onYearChange={(y) => {
            const d = new Date(cursor);
            d.setFullYear(y);
            setCursor(d);
          }}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* New appointment modal */}
      <Modal
        visible={showNewModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewModal(false)}
      >
        <NewApptModal
          patients={patientList}
          onClose={() => setShowNewModal(false)}
          onCreated={async () => {
            setShowNewModal(false);
            await load();
          }}
        />
      </Modal>

      {/* Appointment detail modal */}
      <Modal
        visible={!!selectedAppt}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedAppt(null)}
      >
        {selectedAppt && (
          <ApptDetailSheet
            appt={selectedAppt}
            onClose={() => setSelectedAppt(null)}
            onAction={async (action) => {
              if (action === "refresh") {
                setSelectedAppt(null);
                await load();
                return;
              }
              try {
                await api(`/api/appointments/${selectedAppt.id}/status`, {
                  method: "PATCH",
                  body: { status: action },
                });
                setSelectedAppt(null);
                await load();
              } catch (e) {
                Alert.alert(t("doctor.calendrier.errorTitle"), e instanceof Error ? e.message : t("doctor.calendrier.actionFailed"));
              }
            }}
          />
        )}
      </Modal>

      {/* Search modal */}
      <SearchModal
        visible={searchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        all={appointments}
        onSelect={(a) => { setSearchOpen(false); setSearchQuery(""); setSelectedAppt(a); }}
        onClose={() => { setSearchOpen(false); setSearchQuery(""); }}
      />
    </SafeAreaView>
  );
}

// ─── New Appointment Modal ───────────────────────────────────────────────────
function NewApptModal({
  patients,
  onClose,
  onCreated,
}: {
  patients: PatientSummary[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [npName, setNpName] = useState("");
  const [npPhone, setNpPhone] = useState("");
  const [npEmail, setNpEmail] = useState("");
  const [npDob, setNpDob] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  });
  const [hh, setHh] = useState("09");
  const [mm, setMm] = useState("00");
  const [duration, setDuration] = useState(20);
  const [apptType, setApptType] = useState("cabinet");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const APPT_TYPES = getApptTypes();

  const suggestions = useMemo(() => {
    if (!patientQuery || patientQuery.length < 2) return [];
    const q = patientQuery.toLowerCase();
    return patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q))
      )
      .slice(0, 4);
  }, [patients, patientQuery]);

  function selectPatient(p: PatientSummary) {
    setSelectedPatient(p);
    setPatientQuery(p.name);
    setShowSuggestions(false);
    setShowNewPatientForm(false);
  }

  function clearPatient() {
    setSelectedPatient(null);
    setPatientQuery("");
    setShowSuggestions(false);
    setShowNewPatientForm(false);
  }

  async function handleCreatePatient() {
    if (!npName.trim()) { Alert.alert("Validation", t("doctor.calendrier.validationNameRequired")); return; }
    if (!npPhone.trim()) { Alert.alert("Validation", t("doctor.calendrier.validationPhoneRequired")); return; }
    setCreatingPatient(true);
    try {
      const created = await api<PatientSummary>("/api/doctor/patients", {
        method: "POST",
        body: {
          name: npName.trim(),
          phone: npPhone.trim(),
          ...(npEmail.trim() ? { email: npEmail.trim() } : {}),
          ...(npDob.trim() ? { dateOfBirth: npDob.trim() } : {}),
        },
      });
      selectPatient({ id: created.id, name: created.name, phone: created.phone });
      setNpName(""); setNpPhone(""); setNpEmail(""); setNpDob("");
      setShowNewPatientForm(false);
    } catch (e) {
      Alert.alert(t("doctor.calendrier.errorTitle"), e instanceof Error ? e.message : t("doctor.calendrier.creationFailed"));
    } finally {
      setCreatingPatient(false);
    }
  }

  async function handleSubmit() {
    if (!selectedPatient) {
      Alert.alert("Validation", t("doctor.calendrier.validationPatientRequired"));
      return;
    }
    const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    if (!dateMatch) {
      Alert.alert("Validation", t("doctor.calendrier.validationDateFormat"));
      return;
    }
    const hhNum = parseInt(hh, 10);
    const mmNum = parseInt(mm, 10);
    if (isNaN(hhNum) || hhNum < 0 || hhNum > 23 || isNaN(mmNum) || mmNum < 0 || mmNum > 59) {
      Alert.alert("Validation", t("doctor.calendrier.validationInvalidTime"));
      return;
    }
    const hhPad = String(hhNum).padStart(2, "0");
    const mmPad = String(mmNum).padStart(2, "0");
    const startsAt = new Date(`${dateStr}T${hhPad}:${mmPad}:00`);
    if (isNaN(startsAt.getTime())) {
      Alert.alert("Validation", t("doctor.calendrier.validationInvalidDateTime"));
      return;
    }
    const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);

    setSubmitting(true);
    try {
      await api("/api/appointments/doctor", {
        method: "POST",
        body: {
          patientId: selectedPatient.id,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          type: apptType,
          reason: reason.trim() || undefined,
        },
      });
      onCreated();
    } catch (e) {
      Alert.alert(t("doctor.calendrier.errorTitle"), e instanceof Error ? e.message : t("doctor.calendrier.creationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.modalBg}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.modalSheet}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>{t("doctor.calendrier.newApptTitle")}</Text>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.lg }}>
          {/* Patient lookup */}
          <Text style={styles.fieldLabel}>{t("doctor.calendrier.patient")}</Text>
          {selectedPatient ? (
            <View style={styles.patientChip}>
              <Ionicons name="person-circle" size={18} color={colors.teal} />
              <View style={{ flex: 1 }}>
                <Text style={styles.patientChipName}>{selectedPatient.name}</Text>
                <Text style={styles.patientChipPhone}>{selectedPatient.phone}</Text>
              </View>
              <Pressable onPress={clearPatient} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.foregroundSecondary} />
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.textInput}
                placeholder={t("doctor.calendrier.searchPatient")}
                placeholderTextColor={colors.foregroundSecondary}
                value={patientQuery}
                onChangeText={(t) => {
                  setPatientQuery(t);
                  setShowSuggestions(true);
                  setShowNewPatientForm(false);
                }}
                onFocus={() => setShowSuggestions(true)}
                autoCorrect={false}
              />
              {showSuggestions && patientQuery.length >= 1 && (
                <View style={styles.suggestionList}>
                  {suggestions.map((p) => (
                    <Pressable key={p.id} style={styles.suggestionRow} onPress={() => selectPatient(p)}>
                      <Text style={styles.suggestionName}>{p.name}</Text>
                      {p.phone ? <Text style={styles.suggestionPhone}>{p.phone}</Text> : null}
                    </Pressable>
                  ))}
                  <Pressable
                    style={styles.createPatientRow}
                    onPress={() => { setShowSuggestions(false); setShowNewPatientForm(true); setNpName(patientQuery); }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={colors.teal} />
                    <Text style={styles.createPatientText}>{t("doctor.calendrier.createNewPatient")}</Text>
                  </Pressable>
                </View>
              )}
              {!showSuggestions && !showNewPatientForm && patientQuery.length === 0 && (
                <Pressable style={styles.createPatientBtn} onPress={() => setShowNewPatientForm(true)}>
                  <Ionicons name="person-add-outline" size={15} color={colors.teal} />
                  <Text style={styles.createPatientText}>{t("doctor.calendrier.newPatient")}</Text>
                </Pressable>
              )}
            </>
          )}
          {showNewPatientForm && (
            <View style={styles.newPatientForm}>
              <Text style={styles.newPatientFormTitle}>{t("doctor.calendrier.newPatientTitle")}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("doctor.calendrier.fullName")}
                placeholderTextColor={colors.foregroundSecondary}
                value={npName}
                onChangeText={setNpName}
                autoCapitalize="words"
              />
              <TextInput
                style={[styles.textInput, { marginTop: spacing.xs }]}
                placeholder={t("doctor.calendrier.phone")}
                placeholderTextColor={colors.foregroundSecondary}
                value={npPhone}
                onChangeText={setNpPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.textInput, { marginTop: spacing.xs }]}
                placeholder={t("doctor.calendrier.emailOptional")}
                placeholderTextColor={colors.foregroundSecondary}
                value={npEmail}
                onChangeText={setNpEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.textInput, { marginTop: spacing.xs }]}
                placeholder={t("doctor.calendrier.dobOptional")}
                placeholderTextColor={colors.foregroundSecondary}
                value={npDob}
                onChangeText={setNpDob}
                keyboardType="numbers-and-punctuation"
              />
              <View style={styles.newPatientActions}>
                <Pressable style={styles.newPatientCancel} onPress={() => setShowNewPatientForm(false)}>
                  <Text style={styles.newPatientCancelText}>{t("doctor.calendrier.cancel")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.newPatientSave, creatingPatient && styles.submitBtnDisabled]}
                  onPress={handleCreatePatient}
                  disabled={creatingPatient}
                >
                  {creatingPatient
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.newPatientSaveText}>{t("doctor.calendrier.createAndSelect")}</Text>
                  }
                </Pressable>
              </View>
            </View>
          )}

          {/* Date */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t("doctor.calendrier.dateLabel")}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="2025-06-15"
            placeholderTextColor={colors.foregroundSecondary}
            value={dateStr}
            onChangeText={setDateStr}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          {/* Time */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t("doctor.calendrier.startTime")}</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.textInput, styles.timeInput]}
              placeholder="09"
              placeholderTextColor={colors.foregroundSecondary}
              value={hh}
              onChangeText={(t) => setHh(t.replace(/\D/g, "").slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.timeSep}>:</Text>
            <TextInput
              style={[styles.textInput, styles.timeInput]}
              placeholder="00"
              placeholderTextColor={colors.foregroundSecondary}
              value={mm}
              onChangeText={(t) => setMm(t.replace(/\D/g, "").slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          {/* Duration */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t("doctor.calendrier.duration")}</Text>
          <View style={styles.pillRow}>
            {DURATIONS.map((d) => (
              <Pressable
                key={d}
                style={[styles.pill, duration === d && styles.pillActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.pillText, duration === d && styles.pillTextActive]}>
                  {d} min
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Type */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t("doctor.calendrier.type")}</Text>
          <View style={styles.pillRow}>
            {APPT_TYPES.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.pill, apptType === t.id && styles.pillActive]}
                onPress={() => setApptType(t.id)}
              >
                <Text style={[styles.pillText, apptType === t.id && styles.pillTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Reason */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t("doctor.calendrier.reasonOptional")}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t("doctor.calendrier.reasonPlaceholder")}
            placeholderTextColor={colors.foregroundSecondary}
            value={reason}
            onChangeText={setReason}
          />

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>{t("doctor.calendrier.createAppt")}</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Day view ───────────────────────────────────────────────────────────────
function DayView({
  date,
  setDate,
  appts,
  refreshing,
  onRefresh,
  onSelect,
}: {
  date: Date;
  setDate: (d: Date) => void;
  appts: Appointment[];
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (a: Appointment) => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: spacing.md, padding: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
    >
      <DateNav
        date={date}
        label={date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
      />
      {appts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="sunny-outline" size={52} color={colors.border} />
          <Text style={styles.emptyTitle}>{t("doctor.calendrier.freeDayTitle")}</Text>
          <Text style={styles.emptyText}>{t("doctor.calendrier.freeDayText")}</Text>
        </View>
      ) : (
        appts.map((a) => <ApptCard key={a.id} appt={a} onPress={() => onSelect(a)} />)
      )}
    </ScrollView>
  );
}

// ─── Week view ──────────────────────────────────────────────────────────────
function WeekView({ appts, weekDates, anchor, onSelectDay, onSelect, refreshing, onRefresh }: {
  appts: Appointment[];
  weekDates: Date[];
  anchor: Date;
  onSelectDay: (d: Date) => void;
  onSelect: (a: Appointment) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const DOW_LETTERS = getDowLetters();
  const today = isoDate(new Date());
  const grouped = weekDates.map((d) => ({
    date: d,
    appts: appts
      .filter((a) => isoDate(new Date(a.startsAt)) === isoDate(d))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  }));

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
    >
      {/* 7-column day strip */}
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
                {DOW_LETTERS[i]}
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

      {/* Appointments by day */}
      {grouped.every((g) => g.appts.length === 0) ? (
        <View style={[styles.emptyState, { marginTop: spacing.xl }]}>
          <Ionicons name="calendar-clear-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>{t("doctor.calendrier.freeWeekTitle")}</Text>
          <Text style={styles.emptyText}>{t("doctor.calendrier.freeWeekText")}</Text>
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
                <Text style={styles.weekDayHeaderCount}>{dayAppts.length} {t("doctor.calendrier.rdv")}</Text>
              </View>
              {dayAppts.map((a) => <CompactCard key={a.id} appt={a} onSelect={onSelect} />)}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ─── Month view ─────────────────────────────────────────────────────────────
function MonthView({ appts, grid, anchor, onDrillDay, onSelect, refreshing, onRefresh }: {
  appts: Appointment[];
  grid: (Date | null)[];
  anchor: Date;
  onDrillDay: (d: Date) => void;
  onSelect: (a: Appointment) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const DOW_LETTERS = getDowLetters();
  const STATUS_META = getStatusMeta();
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
        {DOW_LETTERS.map((l, i) => (
          <View key={i} style={{ width: cellW, alignItems: "center" }}>
            <Text style={styles.monthDowText}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={[styles.monthGrid2, { paddingHorizontal: spacing.xl }]}>
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
            <Pressable key={ds} onPress={() => setCalSelected(ds)} style={[styles.monthCell2, { width: cellW }]}>
              <View style={[
                styles.monthCellInner,
                isSelected && { backgroundColor: colors.teal },
                isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.teal },
              ]}>
                <Text style={[
                  styles.monthCellNum2,
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
              <Text style={styles.drillBtnText}>{t("doctor.calendrier.dayView")}</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.teal} />
            </Pressable>
          )}
        </View>
        {selAppts.length === 0 ? (
          <Text style={styles.monthNoAppt}>{t("doctor.calendrier.noAppt")}</Text>
        ) : (
          selAppts.map((a) => <CompactCard key={a.id} appt={a} onSelect={onSelect} />)
        )}
      </View>
    </ScrollView>
  );
}

// ─── Compact card (week + month) ─────────────────────────────────────────────
function CompactCard({ appt, onSelect }: { appt: Appointment; onSelect: (a: Appointment) => void }) {
  const STATUS_META = getStatusMeta();
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
          {appt.reason ?? (appt.type === "teleconsult" ? t("doctor.calendrier.teleconsultation") : t("doctor.calendrier.consultation"))}
        </Text>
      </View>
      <View style={[styles.compactStatusDot, { backgroundColor: meta.border }]} />
    </Pressable>
  );
}

// ─── Year view (rich mini-calendar version) ─────────────────────────────────
function MiniCalendar({ year, month, appts }: { year: number; month: number; appts: Appointment[] }) {
  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const cells: (Date | null)[] = Array(startDay).fill(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
    return cells;
  }, [year, month]);

  const dotMap = useMemo(() => {
    const STATUS_META = getStatusMeta();
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
      <View style={yearStyles.miniDowRow}>
        {getDowLetters().map((l, i) => (
          <View key={i} style={[yearStyles.miniCell, { width: MINI_CELL }]}>
            <Text style={yearStyles.miniDowText}>{l}</Text>
          </View>
        ))}
      </View>
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

function StatPill({ count, color }: { count: number; color: string }) {
  return (
    <View style={[yearStyles.pill, { backgroundColor: color + "20", borderColor: color }]}>
      <View style={[yearStyles.pillDot, { backgroundColor: color }]} />
      <Text style={[yearStyles.pillText, { color }]}>{count}</Text>
    </View>
  );
}

function YearView({ all, year, onSelectMonth, onYearChange, refreshing, onRefresh }: {
  all: Appointment[];
  year: number;
  onSelectMonth: (m: number) => void;
  onYearChange: (y: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const MONTHS_LONG = getMonthsLong();
  const today = new Date();

  const monthData = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => {
      const appts = all.filter((a) => {
        const d = new Date(a.startsAt);
        return d.getFullYear() === year && d.getMonth() === m;
      });
      const confirmed = appts.filter((a) => a.status === "confirmed").length;
      const pending   = appts.filter((a) => a.status === "pending").length;
      const cancelled = appts.filter((a) => a.status === "cancelled" || a.status === "no_show").length;
      return { month: m, appts, total: appts.length, confirmed, pending, cancelled };
    }),
    [all, year]);

  const yearTotal     = monthData.reduce((s, m) => s + m.total, 0);
  const yearConfirmed = monthData.reduce((s, m) => s + m.confirmed, 0);
  const yearPending   = monthData.reduce((s, m) => s + m.pending, 0);

  return (
    <ScrollView
      contentContainerStyle={yearStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
    >
      <View style={yearStyles.yearNav}>
        <Pressable onPress={() => onYearChange(year - 1)} hitSlop={14}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={yearStyles.yearNavLabel}>{year}</Text>
        <Pressable onPress={() => onYearChange(year + 1)} hitSlop={14}>
          <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={yearStyles.banner}>
        <View style={yearStyles.bannerStat}>
          <Text style={yearStyles.bannerNum}>{yearTotal}</Text>
          <Text style={yearStyles.bannerLabel}>{t("doctor.calendrier.yearTotal")}</Text>
        </View>
        <View style={yearStyles.bannerDivider} />
        <View style={yearStyles.bannerStat}>
          <Text style={[yearStyles.bannerNum, { color: "#0891B2" }]}>{yearConfirmed}</Text>
          <Text style={yearStyles.bannerLabel}>{t("doctor.calendrier.yearConfirmed")}</Text>
        </View>
        <View style={yearStyles.bannerDivider} />
        <View style={yearStyles.bannerStat}>
          <Text style={[yearStyles.bannerNum, { color: "#F59E0B" }]}>{yearPending}</Text>
          <Text style={yearStyles.bannerLabel}>{t("doctor.calendrier.yearPending")}</Text>
        </View>
      </View>

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
              <MiniCalendar year={year} month={month} appts={appts} />
              {total > 0 ? (
                <View style={yearStyles.pills}>
                  {confirmed > 0 && <StatPill count={confirmed} color="#0891B2" />}
                  {pending   > 0 && <StatPill count={pending}   color="#F59E0B" />}
                  {cancelled > 0 && <StatPill count={cancelled} color="#EF4444" />}
                </View>
              ) : (
                <Text style={yearStyles.freeLabel}>{t("doctor.calendrier.yearNoAppt")}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Agenda settings types & helpers ─────────────────────────────────────────
type DaySchedule = {
  dayOfWeek: number;
  open: boolean;
  morningOpen: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonOpen: boolean;
  afternoonStart: string;
  afternoonEnd: string;
  slotDuration: number;
};
type ApiSlot = {
  id: string;
  practiceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
};

const DAY_ORDER_AGENDA = [1, 2, 3, 4, 5, 6, 0];
function getAgendaDayNames(): string[] {
  const arr = tArray("doctor.calendrier.agendaDayNames");
  return arr.length ? arr : ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
}
const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60];

function buildDefaultDays(): DaySchedule[] {
  return DAY_ORDER_AGENDA.map((dow) => ({
    dayOfWeek: dow,
    open: false,
    morningOpen: true,
    morningStart: "08:00",
    morningEnd: "12:00",
    afternoonOpen: true,
    afternoonStart: "14:00",
    afternoonEnd: "18:00",
    slotDuration: 20,
  }));
}

function mergeApiSlots(defaults: DaySchedule[], slots: ApiSlot[]): DaySchedule[] {
  return defaults.map((d) => {
    const daySlots = slots.filter((s) => s.dayOfWeek === d.dayOfWeek && s.isActive);
    if (daySlots.length === 0) return d;
    const morning = daySlots.find((s) => s.startTime < "12:00");
    const afternoon = daySlots.find((s) => s.startTime >= "12:00");
    return {
      ...d,
      open: true,
      morningOpen: !!morning,
      morningStart: morning?.startTime ?? d.morningStart,
      morningEnd: morning?.endTime ?? d.morningEnd,
      afternoonOpen: !!afternoon,
      afternoonStart: afternoon?.startTime ?? d.afternoonStart,
      afternoonEnd: afternoon?.endTime ?? d.afternoonEnd,
      slotDuration: (morning ?? afternoon)?.slotDuration ?? d.slotDuration,
    };
  });
}

// ─── Agenda settings component ────────────────────────────────────────────────
function AgendaSettings({ practices }: { practices: Practice[] }) {
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(
    practices.length > 0 ? practices[0].id : null
  );
  const [days, setDays] = useState<DaySchedule[]>(buildDefaultDays());
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!selectedPracticeId) return;
    setLoadingSchedule(true);
    setFeedback(null);
    api<ApiSlot[]>("/api/schedules")
      .then((slots) => {
        const filtered = slots.filter((s) => s.practiceId === selectedPracticeId);
        setDays(mergeApiSlots(buildDefaultDays(), filtered));
      })
      .catch(() => setDays(buildDefaultDays()))
      .finally(() => setLoadingSchedule(false));
  }, [selectedPracticeId]);

  function updateDay(idx: number, patch: Partial<DaySchedule>) {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function toggleExpand(dow: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dow)) next.delete(dow);
      else next.add(dow);
      return next;
    });
  }

  async function save() {
    if (!selectedPracticeId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const slots = days.flatMap((d) => {
        if (!d.open) return [];
        const entries = [];
        if (d.morningOpen) entries.push({ dayOfWeek: d.dayOfWeek, startTime: d.morningStart, endTime: d.morningEnd, slotDuration: d.slotDuration, isActive: true });
        if (d.afternoonOpen) entries.push({ dayOfWeek: d.dayOfWeek, startTime: d.afternoonStart, endTime: d.afternoonEnd, slotDuration: d.slotDuration, isActive: true });
        return entries;
      });
      await api("/api/schedules", { method: "PUT", body: { slots, practiceId: selectedPracticeId } });
      setFeedback({ type: "success", msg: t("doctor.calendrier.agendaSaved") });
    } catch (e: unknown) {
      setFeedback({ type: "error", msg: e instanceof Error ? e.message : t("doctor.calendrier.agendaSaveFailed") });
    } finally {
      setSaving(false);
    }
  }

  const openCount = days.filter((d) => d.open).length;

  if (practices.length === 0) {
    return (
      <View style={agendaStyles.emptyPractice}>
        <Ionicons name="business-outline" size={40} color={colors.border} />
        <Text style={agendaStyles.emptyPracticeTitle}>{t("doctor.calendrier.agendaNoCabinet")}</Text>
        <Text style={agendaStyles.emptyPracticeText}>
          {t("doctor.calendrier.agendaNoCabinetText")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={agendaStyles.container}>
      {/* Practice tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={agendaStyles.practiceTabRow}>
        {practices.map((p) => (
          <Pressable
            key={p.id}
            style={[agendaStyles.practiceTab, selectedPracticeId === p.id && agendaStyles.practiceTabActive]}
            onPress={() => setSelectedPracticeId(p.id)}
          >
            <Text style={[agendaStyles.practiceTabName, selectedPracticeId === p.id && agendaStyles.practiceTabNameActive]}>
              {p.name}
            </Text>
            <Text style={[agendaStyles.practiceTabCity, selectedPracticeId === p.id && agendaStyles.practiceTabCityActive]}>
              {p.city}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loadingSchedule ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          {/* Summary banner */}
          <View style={agendaStyles.banner}>
            <Ionicons name="time-outline" size={15} color={colors.teal} />
            <Text style={agendaStyles.bannerText}>
              {openCount === 0
                ? t("doctor.calendrier.agendaNoOpenDays")
                : `${openCount} ${t("doctor.calendrier.agendaOpenDays")}`}
            </Text>
          </View>

          {/* Day rows */}
          {days.map((d, idx) => {
            const name = getAgendaDayNames()[DAY_ORDER_AGENDA.indexOf(d.dayOfWeek)];
            const isExpanded = expanded.has(d.dayOfWeek);
            const summary = [
              d.morningOpen && `${d.morningStart}–${d.morningEnd}`,
              d.afternoonOpen && `${d.afternoonStart}–${d.afternoonEnd}`,
            ].filter(Boolean).join(" · ");
            return (
              <View key={d.dayOfWeek} style={agendaStyles.dayCard}>
                <Pressable
                  style={agendaStyles.dayHeader}
                  onPress={() => { if (d.open) toggleExpand(d.dayOfWeek); }}
                >
                  <Pressable
                    hitSlop={8}
                    style={[agendaStyles.toggle, d.open && agendaStyles.toggleOn]}
                    onPress={() => {
                      updateDay(idx, { open: !d.open });
                      if (!d.open) setExpanded((prev) => { const next = new Set(prev); next.add(d.dayOfWeek); return next; });
                    }}
                  >
                    <View style={[agendaStyles.toggleThumb, d.open && agendaStyles.toggleThumbOn]} />
                  </Pressable>
                  <Text style={[agendaStyles.dayName, !d.open && agendaStyles.dayNameOff]}>{name}</Text>
                  {d.open && summary ? (
                    <Text style={agendaStyles.daySummary} numberOfLines={1}>{summary}</Text>
                  ) : null}
                  {d.open && (
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.foregroundSecondary} />
                  )}
                </Pressable>

                {d.open && isExpanded && (
                  <View style={agendaStyles.dayBody}>
                    <AgendaPeriodRow
                      label={t("doctor.calendrier.agendaMatin")}
                      open={d.morningOpen}
                      start={d.morningStart}
                      end={d.morningEnd}
                      onToggle={() => updateDay(idx, { morningOpen: !d.morningOpen })}
                      onStartChange={(v) => updateDay(idx, { morningStart: v })}
                      onEndChange={(v) => updateDay(idx, { morningEnd: v })}
                    />
                    <AgendaPeriodRow
                      label={t("doctor.calendrier.agendaApresMidi")}
                      open={d.afternoonOpen}
                      start={d.afternoonStart}
                      end={d.afternoonEnd}
                      onToggle={() => updateDay(idx, { afternoonOpen: !d.afternoonOpen })}
                      onStartChange={(v) => updateDay(idx, { afternoonStart: v })}
                      onEndChange={(v) => updateDay(idx, { afternoonEnd: v })}
                    />
                    <View style={agendaStyles.slotSection}>
                      <Text style={agendaStyles.periodLabel}>{t("doctor.calendrier.agendaSlotDuration")}</Text>
                      <View style={agendaStyles.slotPillRow}>
                        {SLOT_DURATIONS.map((dur) => (
                          <Pressable
                            key={dur}
                            style={[agendaStyles.slotPill, d.slotDuration === dur && agendaStyles.slotPillActive]}
                            onPress={() => updateDay(idx, { slotDuration: dur })}
                          >
                            <Text style={[agendaStyles.slotPillText, d.slotDuration === dur && agendaStyles.slotPillTextActive]}>
                              {dur} min
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {/* Feedback */}
          {feedback && (
            <View style={[agendaStyles.feedback, feedback.type === "success" ? agendaStyles.feedbackSuccess : agendaStyles.feedbackError]}>
              <Ionicons
                name={feedback.type === "success" ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={feedback.type === "success" ? "#0E7490" : "#B91C1C"}
              />
              <Text style={[agendaStyles.feedbackText, feedback.type === "success" ? agendaStyles.feedbackTextSuccess : agendaStyles.feedbackTextError]}>
                {feedback.msg}
              </Text>
            </View>
          )}

          {/* Save */}
          <Pressable style={[agendaStyles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={agendaStyles.saveBtnText}>{t("doctor.calendrier.agendaSave")}</Text>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function AgendaPeriodRow({
  label, open, start, end, onToggle, onStartChange, onEndChange,
}: {
  label: string;
  open: boolean;
  start: string;
  end: string;
  onToggle: () => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  return (
    <View style={agendaStyles.periodRow}>
      <Pressable style={agendaStyles.periodToggleRow} onPress={onToggle}>
        <View style={[agendaStyles.miniToggle, open && agendaStyles.miniToggleOn]}>
          <View style={[agendaStyles.miniToggleThumb, open && agendaStyles.miniToggleThumbOn]} />
        </View>
        <Text style={[agendaStyles.periodLabel, !open && { color: colors.border }]}>{label}</Text>
      </Pressable>
      {open && (
        <View style={agendaStyles.timeInputRow}>
          <TextInput
            style={agendaStyles.timeInput}
            value={start}
            onChangeText={onStartChange}
            placeholder="08:00"
            placeholderTextColor={colors.border}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
          <Text style={agendaStyles.timeSep}>–</Text>
          <TextInput
            style={agendaStyles.timeInput}
            value={end}
            onChangeText={onEndChange}
            placeholder="12:00"
            placeholderTextColor={colors.border}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
      )}
    </View>
  );
}

// ─── Appointment card + detail sheet ────────────────────────────────────────
function ApptCard({
  appt,
  compact,
  onPress,
}: {
  appt: Appointment;
  compact?: boolean;
  onPress: () => void;
}) {
  const STATUS_LABELS = getStatusLabels();
  const start = new Date(appt.startsAt);
  const hhmm = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const tone = STATUS_TONES[appt.status] ?? { bg: colors.bgSecondary, fg: colors.teal };
  return (
    <Pressable style={[styles.row, compact && styles.rowCompact]} onPress={onPress}>
      <View style={styles.time}>
        <Text style={styles.timeText}>{hhmm}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.patient}>{appt.patientName}</Text>
        {appt.reason && !compact && <Text style={styles.reason}>{appt.reason}</Text>}
      </View>
      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
        <Text style={[styles.badgeText, { color: tone.fg }]}>
          {STATUS_LABELS[appt.status] ?? appt.status}
        </Text>
      </View>
    </Pressable>
  );
}

function ApptDetailSheet({
  appt,
  onClose,
  onAction,
}: {
  appt: Appointment;
  onClose: () => void;
  onAction: (
    action: "confirmed" | "completed" | "no_show" | "cancelled" | "refresh"
  ) => void;
}) {
  const STATUS_LABELS = getStatusLabels();
  const start = new Date(appt.startsAt);
  const end = new Date(appt.endsAt);
    const date = start.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hhmm = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // Derive current duration in minutes
  const currentDurationMin = Math.round((end.getTime() - start.getTime()) / 60000);
  const closestDuration =
    DURATIONS.reduce((prev, cur) =>
      Math.abs(cur - currentDurationMin) < Math.abs(prev - currentDurationMin) ? cur : prev
    );

  // Edit section state
  const [editReason, setEditReason] = useState(appt.reason ?? "");
  const [editType, setEditType] = useState(appt.type ?? "cabinet");
  const [savingEdit, setSavingEdit] = useState(false);

  // Prescription section state
  const [prescOpen, setPrescOpen] = useState(false);
  const [prescContent, setPrescContent] = useState("");
  const [sendingPresc, setSendingPresc] = useState(false);

  async function handleSendPrescription() {
    const trimmed = prescContent.trim();
    if (trimmed.length < 3) {
      Alert.alert("Validation", t("doctor.calendrier.prescValidation"));
      return;
    }
    setSendingPresc(true);
    try {
      await api("/api/prescriptions", {
        method: "POST",
        body: { appointmentId: appt.id, content: trimmed },
      });
      Alert.alert(t("doctor.calendrier.success"), t("doctor.calendrier.prescSuccess"));
      setPrescOpen(false);
      setPrescContent("");
    } catch (e) {
      Alert.alert(t("doctor.calendrier.errorTitle"), e instanceof Error ? e.message : t("doctor.calendrier.actionFailed"));
    } finally {
      setSendingPresc(false);
    }
  }

  // Reschedule section state
  const [reschedDateStr, setReschedDateStr] = useState(() => {
    const y = start.getFullYear();
    const mo = String(start.getMonth() + 1).padStart(2, "0");
    const d = String(start.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  });
  const [reschedHh, setReschedHh] = useState(
    start.toLocaleTimeString("fr-FR", { hour: "2-digit" }).replace(":", "").slice(0, 2)
  );
  const [reschedMm, setReschedMm] = useState(
    start.toLocaleTimeString("fr-FR", { minute: "2-digit" }).padStart(2, "0").slice(-2)
  );
  const [reschedDuration, setReschedDuration] = useState(closestDuration);
  const [savingResched, setSavingResched] = useState(false);

  async function handleSaveEdit() {
    setSavingEdit(true);
    try {
      await api(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        body: { reason: editReason.trim() || null, type: editType },
      });
      onAction("refresh");
    } catch (e) {
      Alert.alert(t("doctor.calendrier.errorTitle"), e instanceof Error ? e.message : t("doctor.calendrier.saveFailed"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleApplyResched() {
    const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(reschedDateStr);
    if (!dateMatch) {
      Alert.alert("Validation", t("doctor.calendrier.validationDateFormat"));
      return;
    }
    const hhNum = parseInt(reschedHh, 10);
    const mmNum = parseInt(reschedMm, 10);
    if (
      isNaN(hhNum) ||
      hhNum < 0 ||
      hhNum > 23 ||
      isNaN(mmNum) ||
      mmNum < 0 ||
      mmNum > 59
    ) {
      Alert.alert("Validation", t("doctor.calendrier.validationInvalidTime"));
      return;
    }
    const hhPad = String(hhNum).padStart(2, "0");
    const mmPad = String(mmNum).padStart(2, "0");
    const newStart = new Date(`${reschedDateStr}T${hhPad}:${mmPad}:00`);
    if (isNaN(newStart.getTime())) {
      Alert.alert("Validation", t("doctor.calendrier.validationInvalidDateTime"));
      return;
    }
    const newEnd = new Date(newStart.getTime() + reschedDuration * 60 * 1000);

    setSavingResched(true);
    try {
      await api(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        body: {
          startsAt: newStart.toISOString(),
          endsAt: newEnd.toISOString(),
        },
      });
      onAction("refresh");
    } catch (e) {
      Alert.alert(t("doctor.calendrier.errorTitle"), e instanceof Error ? e.message : t("doctor.calendrier.reschedFailed"));
    } finally {
      setSavingResched(false);
    }
  }

  return (
    <View style={styles.modalBg}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>{t("doctor.calendrier.detailTitle")}</Text>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.modalBody}>
            <InfoRow icon="calendar" label={t("doctor.calendrier.detailDate")} value={`${date} · ${hhmm}`} />
            <InfoRow icon="person" label={t("doctor.calendrier.patient")} value={appt.patientName} />
            <InfoRow icon="call" label={t("doctor.calendrier.detailPhone")} value={appt.patientPhone} />
            {appt.reason && <InfoRow icon="document-text" label={t("doctor.calendrier.editReasonLabel")} value={appt.reason} />}
            <InfoRow
              icon="flag"
              label={t("doctor.calendrier.detailStatus")}
              value={STATUS_LABELS[appt.status] ?? appt.status}
            />
          </View>

          <View style={styles.modalActions}>
            <ActionBtn
              icon="checkmark-circle"
              label={t("doctor.calendrier.actionConfirm")}
              tone="primary"
              onPress={() => onAction("confirmed")}
            />
            <ActionBtn
              icon="checkmark-done"
              label={t("doctor.calendrier.actionComplete")}
              tone="primary"
              onPress={() => onAction("completed")}
            />
            <ActionBtn
              icon="alert-circle"
              label={t("doctor.calendrier.actionAbsent")}
              tone="warning"
              onPress={() => onAction("no_show")}
            />
            <ActionBtn
              icon="close-circle"
              label={t("doctor.calendrier.cancel")}
              tone="danger"
              onPress={() =>
                Alert.alert(t("doctor.calendrier.cancelConfirmTitle"), t("doctor.calendrier.cancelConfirmText"), [
                  { text: t("doctor.calendrier.cancelNo"), style: "cancel" },
                  { text: t("doctor.calendrier.cancelYes"), style: "destructive", onPress: () => onAction("cancelled") },
                ])
              }
            />
          </View>

          {/* ── Éditer section ── */}
          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>{t("doctor.calendrier.editSectionTitle")}</Text>

            <Text style={styles.fieldLabel}>{t("doctor.calendrier.editReasonLabel")}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t("doctor.calendrier.editReasonPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              value={editReason}
              onChangeText={setEditReason}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>{t("doctor.calendrier.type")}</Text>
            <View style={styles.pillRow}>
              {getApptTypes().map((at) => (
                <Pressable
                  key={at.id}
                  style={[styles.pill, editType === at.id && styles.pillActive]}
                  onPress={() => setEditType(at.id)}
                >
                  <Text
                    style={[styles.pillText, editType === at.id && styles.pillTextActive]}
                  >
                    {at.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.saveBtn, savingEdit && styles.submitBtnDisabled]}
              onPress={handleSaveEdit}
              disabled={savingEdit}
            >
              {savingEdit ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{t("doctor.calendrier.editSave")}</Text>
              )}
            </Pressable>
          </View>

          {/* ── Ordonnance section ── */}
          {appt.status === "completed" && (
            <View style={[styles.editSection, { marginBottom: spacing.sm }]}>
              <Pressable
                style={styles.prescToggleBtn}
                onPress={() => setPrescOpen((v) => !v)}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={colors.teal}
                />
                <Text style={styles.prescToggleBtnText}>{t("doctor.calendrier.prescToggle")}</Text>
                <Ionicons
                  name={prescOpen ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.teal}
                />
              </Pressable>

              {prescOpen && (
                <View style={styles.prescForm}>
                  <TextInput
                    style={styles.prescInput}
                    placeholder={t("doctor.calendrier.prescPlaceholder")}
                    placeholderTextColor={colors.foregroundSecondary}
                    value={prescContent}
                    onChangeText={(t) => {
                      if (t.length <= 2000) setPrescContent(t);
                    }}
                    multiline
                    textAlignVertical="top"
                    maxLength={2000}
                  />
                  <Text style={styles.prescCharCount}>
                    {prescContent.length} / 2000
                  </Text>
                  <Pressable
                    style={[styles.saveBtn, sendingPresc && styles.submitBtnDisabled]}
                    onPress={handleSendPrescription}
                    disabled={sendingPresc}
                  >
                    {sendingPresc ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>{t("doctor.calendrier.prescSend")}</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* ── Reprogrammer section ── */}
          <View style={[styles.editSection, { marginBottom: spacing.xl }]}>
            <Text style={styles.editSectionTitle}>{t("doctor.calendrier.reschedTitle")}</Text>

            <Text style={styles.fieldLabel}>{t("doctor.calendrier.dateLabel")}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2025-06-15"
              placeholderTextColor={colors.foregroundSecondary}
              value={reschedDateStr}
              onChangeText={setReschedDateStr}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>{t("doctor.calendrier.reschedTimeLabel")}</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.textInput, styles.timeInput]}
                placeholder="09"
                placeholderTextColor={colors.foregroundSecondary}
                value={reschedHh}
                onChangeText={(t) => setReschedHh(t.replace(/\D/g, "").slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.timeSep}>:</Text>
              <TextInput
                style={[styles.textInput, styles.timeInput]}
                placeholder="00"
                placeholderTextColor={colors.foregroundSecondary}
                value={reschedMm}
                onChangeText={(t) => setReschedMm(t.replace(/\D/g, "").slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>{t("doctor.calendrier.duration")}</Text>
            <View style={styles.pillRow}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d}
                  style={[styles.pill, reschedDuration === d && styles.pillActive]}
                  onPress={() => setReschedDuration(d)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      reschedDuration === d && styles.pillTextActive,
                    ]}
                  >
                    {d} min
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.saveBtn, savingResched && styles.submitBtnDisabled]}
              onPress={handleApplyResched}
              disabled={savingResched}
            >
              {savingResched ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>{t("doctor.calendrier.reschedApply")}</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.teal} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  tone: "primary" | "warning" | "danger";
  onPress: () => void;
}) {
  const color =
    tone === "primary" ? colors.teal : tone === "warning" ? "#C2410C" : colors.danger;
  return (
    <Pressable style={[styles.actionBtn, { borderColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function DateNav({
  label,
  onPrev,
  onNext,
}: {
  date: Date;
  label: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.dateNav}>
      <Pressable onPress={onPrev} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </Pressable>
      <Text style={styles.dateNavLabel}>{label}</Text>
      <Pressable onPress={onNext} style={styles.navBtn}>
        <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <View style={styles.emptyBlock}>
      <Ionicons name="calendar-outline" size={28} color={colors.foregroundSecondary} />
      <Text style={styles.emptyBlockText}>{message}</Text>
    </View>
  );
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d: Date) {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - dow);
  r.setHours(0, 0, 0, 0);
  return r;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  viewTabs: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: 4,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  viewTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  viewTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foregroundSecondary,
  },
  viewTabTextActive: { color: colors.teal, fontWeight: "700" },

  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  navBtn: {
    height: 36,
    width: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  dateNavLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    textTransform: "capitalize",
  },

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
  rowCompact: { padding: spacing.sm },
  time: {
    width: 62,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  timeText: { color: colors.teal, fontWeight: "700", fontFamily: "monospace" },
  patient: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  reason: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },

  // Week view (secretary-style)
  weekStrip: {
    flexDirection: "row", paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4,
  },
  weekStripCell: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radii.lg, gap: 2 },
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

  // Month view (secretary-style)
  monthDowRow: { flexDirection: "row", paddingTop: spacing.sm, paddingBottom: spacing.xs },
  monthDowText: { fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary, textTransform: "uppercase" },
  monthGrid2: { flexDirection: "row", flexWrap: "wrap", paddingBottom: spacing.md },
  monthCell2: { height: 56, alignItems: "center", paddingTop: 4 },
  monthCellInner: { width: 34, height: 34, borderRadius: radii.full, alignItems: "center", justifyContent: "center" },
  monthCellNum2: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  monthDotRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  monthDot: { width: 5, height: 5, borderRadius: 3 },
  monthPanel: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.xs },
  monthPanelHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, gap: spacing.sm,
  },
  monthPanelTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.foreground, textTransform: "capitalize" },
  drillBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  drillBtnText: { fontSize: 12, color: colors.teal, fontWeight: "700" },
  monthNoAppt: { fontSize: 13, color: colors.foregroundSecondary, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },

  // Compact card (shared by week + month)
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

  // Empty states
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },

  searchIconBtn: { padding: spacing.xs },

  settingsCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  settingsTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  settingsBody: { fontSize: 13, color: colors.foregroundSecondary, lineHeight: 18 },
  settingsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingsEmpty: { fontSize: 13, color: colors.foregroundSecondary, fontStyle: "italic" },
  practiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  practiceName: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  practiceCity: { fontSize: 12, color: colors.foregroundSecondary },

  emptyBlock: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyBlockText: { color: colors.foregroundSecondary, fontSize: 13 },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    maxHeight: "90%",
    flexShrink: 1,
    padding: spacing.lg,
    paddingBottom: spacing["2xl"],
    gap: spacing.md,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  modalClose: {
    height: 36,
    width: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  modalBody: { gap: spacing.sm },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoLabel: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: { fontSize: 14, color: colors.foreground, fontWeight: "600", marginTop: 2 },
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minWidth: "47%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  actionBtnText: { fontWeight: "700", fontSize: 13 },

  // ── Shared form styles ──
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bgSecondary,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timeInput: {
    width: 64,
    textAlign: "center",
  },
  timeSep: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  pillActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foregroundSecondary,
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  submitBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  suggestionList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    marginTop: -spacing.xs,
    overflow: "hidden",
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
    flex: 1,
  },
  suggestionPhone: {
    fontSize: 12,
    color: colors.foregroundSecondary,
  },
  createPatientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createPatientBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
  },
  createPatientText: {
    fontSize: 13,
    color: colors.teal,
    fontWeight: "600",
  },
  patientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  patientChipName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  patientChipPhone: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginTop: 1,
  },
  newPatientForm: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: colors.bgSecondary,
    gap: spacing.xs,
  },
  newPatientFormTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.teal,
    marginBottom: spacing.xs,
  },
  newPatientActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  newPatientCancel: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  newPatientCancelText: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    fontWeight: "600",
  },
  newPatientSave: {
    flex: 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: "center",
  },
  newPatientSaveText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
  },

  // ── Edit / Reschedule sections ──
  editSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    gap: spacing.xs,
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Prescription section ──
  prescToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
  },
  prescToggleBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.teal,
  },
  prescForm: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  prescInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bg,
    minHeight: 80,
  },
  prescCharCount: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    textAlign: "right",
  },
});

// ─── Year styles ──────────────────────────────────────────────────────────────
const yearStyles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing["3xl"] },
  yearNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.sm },
  yearNavLabel: { fontSize: 20, fontWeight: "800", color: colors.foreground },
  banner: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  bannerStat: { flex: 1, alignItems: "center", gap: 2 },
  bannerNum: { fontSize: 20, fontWeight: "800", color: colors.foreground },
  bannerLabel: { fontSize: 11, color: colors.foregroundSecondary, fontWeight: "600" },
  bannerDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    width: CARD_W, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: spacing.sm, backgroundColor: colors.bg, gap: spacing.xs,
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
    borderWidth: 1, borderRadius: radii.full, paddingHorizontal: 6, paddingVertical: 2,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 10, fontWeight: "700" },
  freeLabel: { fontSize: 10, color: colors.border, fontStyle: "italic", marginTop: 2 },
});

// ─── Search modal ─────────────────────────────────────────────────────────────
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
      <View style={searchStyles.bar}>
        <View style={searchStyles.inputWrap}>
          <Ionicons name="search-outline" size={18} color={colors.foregroundSecondary} />
          <TextInput
            style={searchStyles.input}
            value={query}
            onChangeText={onQueryChange}
            placeholder={t("doctor.calendrier.searchBarPlaceholder")}
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
        <Pressable onPress={onClose} style={{ paddingHorizontal: spacing.sm }}>
          <Text style={searchStyles.cancelText}>{t("doctor.calendrier.cancel")}</Text>
        </Pressable>
      </View>

      <View style={searchStyles.results}>
        {query.trim().length === 0 ? (
          <View style={searchStyles.hint}>
            <Ionicons name="search-outline" size={40} color={colors.border} />
            <Text style={searchStyles.hintText}>{t("doctor.calendrier.searchHint")}</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={searchStyles.hint}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.border} />
            <Text style={searchStyles.hintText}>{t("doctor.calendrier.searchNoResultFor")} {query} »</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
            renderItem={({ item }) => {
              const STATUS_META = getStatusMeta();
              const meta = STATUS_META[item.status] ?? STATUS_META.pending;
              const initials = item.patientName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              const dateStr = new Date(item.startsAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
              const timeStr = new Date(item.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
              return (
                <Pressable onPress={() => onSelect(item)} style={({ pressed }) => [searchStyles.item, pressed && { opacity: 0.75 }]}>
                  <View style={[searchStyles.avatar, { backgroundColor: meta.bg }]}>
                    <Text style={[searchStyles.avatarText, { color: meta.border }]}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={searchStyles.name} numberOfLines={1}>{item.patientName}</Text>
                    <Text style={searchStyles.meta} numberOfLines={1}>
                      {dateStr} · {timeStr}{item.reason ? ` · ${item.reason}` : ""}
                    </Text>
                  </View>
                  <View style={[searchStyles.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                    <Text style={[searchStyles.badgeText, { color: meta.color }]}>{meta.label}</Text>
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

const searchStyles = StyleSheet.create({
  bar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  inputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: colors.bgSecondary, borderRadius: radii.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 15, color: colors.foreground },
  cancelText: { fontSize: 14, color: colors.teal, fontWeight: "600" },
  results: { flex: 1, backgroundColor: colors.bg },
  hint: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  hintText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  item: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.md, backgroundColor: colors.bg,
  },
  avatar: { width: 40, height: 40, borderRadius: radii.full, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "800" },
  name: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  meta: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
});

// ─── Agenda settings styles ───────────────────────────────────────────────────
const agendaStyles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },

  emptyPractice: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing["2xl"] },
  emptyPracticeTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  emptyPracticeText: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center", lineHeight: 18 },

  practiceTabRow: { gap: spacing.sm, paddingBottom: spacing.xs },
  practiceTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    minWidth: 100,
  },
  practiceTabActive: { borderColor: colors.teal, backgroundColor: `${colors.teal}18` },
  practiceTabName: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  practiceTabNameActive: { color: colors.teal },
  practiceTabCity: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 1 },
  practiceTabCityActive: { color: colors.teal },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: `${colors.teal}12`,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${colors.teal}30`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bannerText: { fontSize: 13, fontWeight: "600", color: colors.teal },

  dayCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: colors.teal },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" },
  toggleThumbOn: { alignSelf: "flex-end" },
  dayName: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  dayNameOff: { color: colors.foregroundSecondary },
  daySummary: { fontSize: 11, color: colors.foregroundSecondary, flexShrink: 1 },

  dayBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.bgSecondary,
  },

  periodRow: { gap: spacing.xs },
  periodToggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  miniToggle: {
    width: 28,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  miniToggleOn: { backgroundColor: colors.teal },
  miniToggleThumb: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff" },
  miniToggleThumbOn: { alignSelf: "flex-end" },
  periodLabel: { fontSize: 13, fontWeight: "600", color: colors.foreground },

  timeInputRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  timeInput: {
    width: 64,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  timeSep: { fontSize: 16, fontWeight: "700", color: colors.foregroundSecondary },

  slotSection: { gap: spacing.xs },
  slotPillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  slotPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  slotPillActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  slotPillText: { fontSize: 12, fontWeight: "600", color: colors.foregroundSecondary },
  slotPillTextActive: { color: "#fff" },

  feedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  feedbackSuccess: { backgroundColor: "#F0FDFA", borderColor: "#0891B2" },
  feedbackError: { backgroundColor: "#FEF2F2", borderColor: "#EF4444" },
  feedbackText: { fontSize: 13, fontWeight: "600", flex: 1 },
  feedbackTextSuccess: { color: "#0E7490" },
  feedbackTextError: { color: "#B91C1C" },

  saveBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
