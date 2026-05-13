import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";

type Vitals = {
  bp_systolic?: number | string;
  bp_diastolic?: number | string;
  heart_rate?: number | string;
  temperature?: number | string;
  weight?: number | string;
  height?: number | string;
  spo2?: number | string;
  respiratory_rate?: number | string;
};

type ConsultationNote = {
  id?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals: Vitals;
  icd10Codes: { code: string; label: string }[];
};

const EMPTY: ConsultationNote = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
  vitals: {},
  icd10Codes: [],
};

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  patientId: string | null;
  patientName?: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function ConsultationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointmentId = String(id);

  const [note, setNote] = useState<ConsultationNote>(EMPTY);
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const apptData = await api<Appointment>(`/api/appointments/${appointmentId}`).catch(
          () => null
        );
        if (!cancelled && apptData) setAppt(apptData);

        try {
          const noteData = await api<{
            id: string;
            subjective: string | null;
            objective: string | null;
            assessment: string | null;
            plan: string | null;
            vitals: Vitals | null;
            icd10Codes: { code: string; label: string }[] | null;
          }>(`/api/consultation-notes/${appointmentId}`);
          if (!cancelled && noteData) {
            setNote({
              id: noteData.id,
              subjective: noteData.subjective ?? "",
              objective: noteData.objective ?? "",
              assessment: noteData.assessment ?? "",
              plan: noteData.plan ?? "",
              vitals: noteData.vitals ?? {},
              icd10Codes: noteData.icd10Codes ?? [],
            });
          }
        } catch {
          // 404 = no note yet — normal
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const save = useCallback(
    async (current: ConsultationNote) => {
      setSaveStatus("saving");
      try {
        const cleanVitals: Record<string, number> = {};
        for (const [k, v] of Object.entries(current.vitals)) {
          if (v !== "" && v !== undefined && v !== null) {
            const num = typeof v === "number" ? v : parseFloat(String(v));
            if (!isNaN(num)) cleanVitals[k] = num;
          }
        }
        const saved = await api<{ id: string }>(`/api/consultation-notes`, {
          method: "POST",
          body: {
            appointmentId,
            subjective: current.subjective || null,
            objective: current.objective || null,
            assessment: current.assessment || null,
            plan: current.plan || null,
            vitals: Object.keys(cleanVitals).length > 0 ? cleanVitals : null,
            icd10_codes: current.icd10Codes.length > 0 ? current.icd10Codes : null,
          },
        });
        setNote((prev) => ({ ...prev, id: saved.id }));
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [appointmentId]
  );

  const scheduleAutoSave = useCallback(
    (updated: ConsultationNote) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void save(updated);
      }, 800);
    },
    [save]
  );

  const updateNote = useCallback(
    (patch: Partial<ConsultationNote>) => {
      setNote((prev) => {
        const updated = { ...prev, ...patch };
        scheduleAutoSave(updated);
        setSaveStatus("idle");
        return updated;
      });
    },
    [scheduleAutoSave]
  );

  function handleManualSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void save(note);
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.rdvConsultation.title") }} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
        </View>
      </>
    );
  }

  const formattedDate = appt?.startsAt
    ? new Date(appt.startsAt).toLocaleString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const vitalsFields: { key: keyof Vitals; label: string; unit: string }[] = [
    { key: "bp_systolic", label: t("doctor.rdvConsultation.vitals.bpSys"), unit: "mmHg" },
    { key: "bp_diastolic", label: t("doctor.rdvConsultation.vitals.bpDia"), unit: "mmHg" },
    { key: "heart_rate", label: t("doctor.rdvConsultation.vitals.hr"), unit: "bpm" },
    { key: "temperature", label: t("doctor.rdvConsultation.vitals.temp"), unit: "°C" },
    { key: "weight", label: t("doctor.rdvConsultation.vitals.weight"), unit: "kg" },
    { key: "height", label: t("doctor.rdvConsultation.vitals.height"), unit: "cm" },
    { key: "spo2", label: t("doctor.rdvConsultation.vitals.spo2"), unit: "%" },
    { key: "respiratory_rate", label: t("doctor.rdvConsultation.vitals.rr"), unit: "/min" },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.rdvConsultation.title"),
          headerRight: () => (
            <View style={styles.saveStatus}>
              {saveStatus === "saving" && (
                <ActivityIndicator size="small" color={colors.foregroundSecondary} />
              )}
              {saveStatus === "saved" && (
                <Ionicons name="checkmark-circle" size={18} color={colors.teal} />
              )}
              {saveStatus === "error" && (
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
              )}
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {formattedDate && (
            <Text style={styles.subtitle}>
              {appt?.patientName ? `${appt.patientName} · ` : ""}
              {formattedDate}
            </Text>
          )}

          {/* Vitals */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("doctor.rdvConsultation.vitalsTitle")}</Text>
            <View style={styles.vitalsGrid}>
              {vitalsFields.map((f) => (
                <View key={f.key} style={styles.vitalsCell}>
                  <Text style={styles.vitalsLabel}>
                    {f.label} <Text style={styles.vitalsUnit}>({f.unit})</Text>
                  </Text>
                  <TextInput
                    style={styles.vitalsInput}
                    value={
                      note.vitals[f.key] === undefined || note.vitals[f.key] === null
                        ? ""
                        : String(note.vitals[f.key])
                    }
                    onChangeText={(v) =>
                      updateNote({ vitals: { ...note.vitals, [f.key]: v } })
                    }
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.foregroundSecondary}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* SOAP */}
          <View style={styles.card}>
            <SoapField
              letter="S"
              label={t("doctor.rdvConsultation.subjective")}
              placeholder={t("doctor.rdvConsultation.subjectivePh")}
              value={note.subjective}
              onChange={(v) => updateNote({ subjective: v })}
            />
            <SoapField
              letter="O"
              label={t("doctor.rdvConsultation.objective")}
              placeholder={t("doctor.rdvConsultation.objectivePh")}
              value={note.objective}
              onChange={(v) => updateNote({ objective: v })}
            />
            <SoapField
              letter="A"
              label={t("doctor.rdvConsultation.assessment")}
              placeholder={t("doctor.rdvConsultation.assessmentPh")}
              value={note.assessment}
              onChange={(v) => updateNote({ assessment: v })}
            />
            <SoapField
              letter="P"
              label={t("doctor.rdvConsultation.plan")}
              placeholder={t("doctor.rdvConsultation.planPh")}
              value={note.plan}
              onChange={(v) => updateNote({ plan: v })}
            />
          </View>

          {/* Quick action chips */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("doctor.rdvConsultation.quickActions")}
            </Text>
            <View style={styles.chipsRow}>
              <Pressable
                style={styles.chip}
                onPress={() => {
                  Alert.alert(
                    t("doctor.rdvConsultation.title"),
                    t("doctor.rdvConsultation.notAvailableYet")
                  );
                }}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.teal} />
                <Text style={styles.chipText}>
                  {t("doctor.rdvConsultation.actionNewPresc")}
                </Text>
              </Pressable>
              <Pressable
                style={styles.chip}
                onPress={() => {
                  router.push("/(doctor)/more/certificats");
                }}
              >
                <Ionicons name="ribbon-outline" size={16} color={colors.teal} />
                <Text style={styles.chipText}>
                  {t("doctor.rdvConsultation.actionNewCert")}
                </Text>
              </Pressable>
              <Pressable
                style={styles.chip}
                onPress={() => {
                  Alert.alert(
                    t("doctor.rdvConsultation.title"),
                    t("doctor.rdvConsultation.notAvailableYet")
                  );
                }}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.teal} />
                <Text style={styles.chipText}>
                  {t("doctor.rdvConsultation.actionFollowup")}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[
              styles.saveBtn,
              saveStatus === "saving" && { opacity: 0.7 },
            ]}
            onPress={handleManualSave}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="save" size={16} color="#FFF" />
                <Text style={styles.saveBtnText}>
                  {t("doctor.rdvConsultation.save")}
                </Text>
              </>
            )}
          </Pressable>
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function SoapField({
  letter,
  label,
  placeholder,
  value,
  onChange,
}: {
  letter: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.soapBlock}>
      <View style={styles.soapHeader}>
        <View style={styles.soapLetter}>
          <Text style={styles.soapLetterText}>{letter}</Text>
        </View>
        <Text style={styles.soapLabel}>{label}</Text>
      </View>
      <TextInput
        style={styles.soapInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.foregroundSecondary}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  subtitle: { fontSize: 13, color: colors.foregroundSecondary, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  vitalsCell: { width: "47%", gap: 4 },
  vitalsLabel: { fontSize: 11, fontWeight: "600", color: colors.foreground },
  vitalsUnit: { color: colors.foregroundSecondary, fontWeight: "400" },
  vitalsInput: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    fontFamily: "monospace",
  },
  soapBlock: { gap: spacing.xs },
  soapHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  soapLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  soapLetterText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  soapLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  soapInput: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.foreground },
  saveBtn: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
  },
  saveBtnText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  saveStatus: { paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center" },
});
