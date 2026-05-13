import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, colors, radii, spacing, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

const SPECIALTIES: { label: string; value: string }[] = [
  { label: "Généraliste", value: "generaliste" },
  { label: "Pédiatre", value: "pediatre" },
  { label: "Cardiologue", value: "cardiologue" },
  { label: "Gynécologue", value: "gynecologue" },
  { label: "Dermatologue", value: "dermatologue" },
  { label: "Kinésithérapeute", value: "kinesitherapeute" },
];

type Doctor = {
  id: string;
  name: string;
  specialty: string | null;
  slug: string;
  photoUrl: string | null;
  homeVisitFee?: number | null;
};

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function buildDays(): { iso: string; label: string }[] {
  const arr: { iso: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    arr.push({ iso, label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` });
  }
  return arr;
}

const TIME_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export default function PatientDomicile() {
  useLocale();
  const router = useRouter();

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/(patient)/plus-menu" as never);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  const [step, setStep] = useState<"form" | "done">("form");
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchingDocs, setSearchingDocs] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const days = useMemo(() => buildDays(), []);

  const loadDoctors = useCallback(async (spec: string) => {
    setSearchingDocs(true);
    try {
      const token = await getPatientToken();
      const params = new URLSearchParams({ specialty: spec, homeVisit: "1", limit: "20" });
      const res = await api<{ hits: Doctor[] }>(`/api/search?${params}`, {
        token: token ?? undefined,
      });
      setDoctors(res.hits ?? []);
    } catch {
      setDoctors([]);
    } finally {
      setSearchingDocs(false);
    }
  }, []);

  function onSelectSpecialty(value: string) {
    setSpecialty(value);
    setDoctor(null);
    loadDoctors(value);
  }

  const canSubmit =
    doctor && date && time && address.trim().length > 3 && patientName.trim() && patientPhone.trim();

  async function submit() {
    if (!canSubmit || !doctor || !date || !time) return;
    setSubmitting(true);
    try {
      const token = await getPatientToken();
      await api("/api/home-visit/request", {
        method: "POST",
        token: token ?? undefined,
        body: {
          doctorId: doctor.id,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          address: address.trim(),
          preferredDate: date,
          preferredTime: time,
          reason: reason.trim() || undefined,
        },
      });
      setStep("done");
    } catch (e: unknown) {
      const msg = (e instanceof Error && e.message) || t("patient.domicile.errorGeneric");
      Alert.alert(t("patient.domicile.errorTitle"), msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/(patient)/plus-menu" as never)} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={styles.title}>{t("patient.domicile.title")}</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={colors.teal} />
          </View>
          <Text style={styles.successTitle}>{t("patient.domicile.successTitle")}</Text>
          <Text style={styles.successText}>{t("patient.domicile.successText")}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(patient)/plus-menu" as never)}>
            <Text style={styles.primaryBtnText}>{t("patient.domicile.successCta")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(patient)/plus-menu" as never)} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.title}>{t("patient.domicile.title")}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.banner}>
          <Ionicons name="home" size={20} color={colors.teal} />
          <Text style={styles.bannerText}>{t("patient.domicile.banner")}</Text>
        </View>

        {/* Specialty */}
        <Text style={styles.label}>{t("patient.domicile.specialty")}</Text>
        <View style={styles.chipsRow}>
          {SPECIALTIES.map((s) => {
            const active = specialty === s.value;
            return (
              <Pressable
                key={s.value}
                onPress={() => onSelectSpecialty(s.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Doctor */}
        {specialty && (
          <>
            <Text style={styles.label}>{t("patient.domicile.doctor")}</Text>
            {searchingDocs ? (
              <ActivityIndicator color={colors.teal} style={{ marginVertical: spacing.md }} />
            ) : doctors.length === 0 ? (
              <Text style={styles.helperText}>{t("patient.domicile.noDoctors")}</Text>
            ) : (
              <Pressable style={styles.selectBox} onPress={() => setPickerOpen(true)}>
                <Text style={[styles.selectText, !doctor && styles.placeholder]}>
                  {doctor ? `Dr. ${doctor.name}` : t("patient.domicile.selectDoctor")}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.foregroundSecondary} />
              </Pressable>
            )}
          </>
        )}

        {/* Date */}
        {doctor && (
          <>
            <Text style={styles.label}>{t("patient.domicile.date")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
              {days.map((d) => {
                const active = date === d.iso;
                return (
                  <Pressable key={d.iso} onPress={() => setDate(d.iso)} style={[styles.dayPill, active && styles.dayPillActive]}>
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>{d.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Time */}
        {doctor && date && (
          <>
            <Text style={styles.label}>{t("patient.domicile.time")}</Text>
            <View style={styles.chipsRow}>
              {TIME_SLOTS.map((s) => {
                const active = time === s;
                return (
                  <Pressable key={s} onPress={() => setTime(s)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Address + identity */}
        {doctor && date && time && (
          <>
            <Text style={styles.label}>{t("patient.domicile.nameLabel")}</Text>
            <TextInput
              value={patientName}
              onChangeText={setPatientName}
              placeholder={t("patient.domicile.namePh")}
              placeholderTextColor={colors.foregroundSecondary}
              style={styles.input}
            />

            <Text style={styles.label}>{t("patient.domicile.phoneLabel")}</Text>
            <TextInput
              value={patientPhone}
              onChangeText={setPatientPhone}
              placeholder={t("patient.domicile.phonePh")}
              placeholderTextColor={colors.foregroundSecondary}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Text style={styles.label}>{t("patient.domicile.address")}</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder={t("patient.domicile.addressPh")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
              style={[styles.input, styles.multi]}
            />

            <Text style={styles.label}>{t("patient.domicile.reason")}</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t("patient.domicile.reasonPh")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
              style={[styles.input, styles.multi]}
            />
          </>
        )}

        <Pressable
          disabled={!canSubmit || submitting}
          onPress={submit}
          style={[styles.primaryBtn, (!canSubmit || submitting) && styles.btnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>{t("patient.domicile.submit")}</Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Doctor picker modal */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("patient.domicile.selectDoctor")}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {doctors.map((d) => {
                const active = doctor?.id === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      setDoctor(d);
                      setPickerOpen(false);
                    }}
                    style={[styles.docRow, active && styles.docRowActive]}
                  >
                    <View style={styles.docAvatar}>
                      <Ionicons name="person" size={20} color={colors.teal} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>Dr. {d.name}</Text>
                      {!!d.specialty && <Text style={styles.docSpec}>{d.specialty}</Text>}
                    </View>
                    {d.homeVisitFee != null && (
                      <Text style={styles.docFee}>{(d.homeVisitFee / 1000).toFixed(0)} DT</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.foreground, textAlign: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerText: { flex: 1, fontSize: 13, color: colors.foreground },
  label: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginTop: spacing.sm },
  helperText: { fontSize: 13, color: colors.foregroundSecondary, fontStyle: "italic" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 13, color: colors.foreground },
  chipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  dayRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  dayPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  dayPillActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  dayText: { fontSize: 13, color: colors.foreground },
  dayTextActive: { color: "#FFFFFF", fontWeight: "700" },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
  },
  selectText: { fontSize: 14, color: colors.foreground },
  placeholder: { color: colors.foregroundSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  multi: { minHeight: 72, textAlignVertical: "top" },
  primaryBtn: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.bg,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: spacing.sm },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  docRowActive: { borderColor: colors.teal, backgroundColor: colors.bgSecondary },
  docAvatar: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  docName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  docSpec: { fontSize: 12, color: colors.foregroundSecondary },
  docFee: { fontSize: 13, fontWeight: "700", color: colors.teal },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  successIcon: { marginBottom: spacing.sm },
  successTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, textAlign: "center" },
  successText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
});
