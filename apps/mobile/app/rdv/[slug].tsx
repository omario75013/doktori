import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  ActivityIndicator, Alert, Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Stethoscope, MapPin, Clock, Calendar, ChevronRight,
  User, Phone as PhoneIcon, FileText, Users, CreditCard,
  CheckCircle2, ArrowLeft, Shield,
} from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { getPatient } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Doctor { id: string; name: string; slug: string; specialty: string; city: string; address: string; photoUrl: string | null; consultationFee: number | null; consultationMode?: string; teleconsultFee?: number | null; }
interface AppointmentType { id: string; name: string; durationMinutes: number; fee: number | null; color: string; }
interface Practice { id: string; name: string; address: string; city: string; phone: string | null; isPrimary: boolean; }
interface Slot { startTime: string; endTime: string; available: boolean; }
interface Question { id: string; label: string; kind: "text" | "choice" | "file" | "yesno"; choices: string[] | null; required: boolean; displayOrder: number; }
type Step = "type" | "practice" | "slots" | "questionnaire" | "form" | "payment";
type DependentRelation = "enfant" | "parent" | "conjoint" | "autre";

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildDates() {
  const arr = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const isToday = i === 0;
    const isTomorrow = i === 1;
    arr.push({
      value: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString("fr-FR", { weekday: "short" }),
      date: d.getDate().toString(),
      month: d.toLocaleDateString("fr-FR", { month: "short" }),
      label: isToday ? "Auj." : isTomorrow ? "Demain" : d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
    });
  }
  return arr;
}

const DATES = buildDates();
const RELATIONS: Array<{ value: DependentRelation; label: string }> = [
  { value: "enfant", label: "Enfant" }, { value: "parent", label: "Parent" },
  { value: "conjoint", label: "Conjoint(e)" }, { value: "autre", label: "Autre" },
];

const STEP_ORDER: Step[] = ["type", "practice", "slots", "questionnaire", "form", "payment"];
const STEP_LABELS: Record<Step, string> = {
  type: "Motif", practice: "Cabinet", slots: "Créneau",
  questionnaire: "Questions", form: "Infos", payment: "Paiement",
};

// ─── Progress Bar ───────────────────────────────────────────────────────────

function StepProgress({ current, steps }: { current: Step; steps: Step[] }) {
  const currentIdx = steps.indexOf(current);
  return (
    <View style={progressStyles.container}>
      {steps.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <View key={s} style={progressStyles.step}>
            <View style={[
              progressStyles.dot,
              isDone && progressStyles.dotDone,
              isActive && progressStyles.dotActive,
            ]}>
              {isDone ? <CheckCircle2 size={14} color={colors.white} /> : (
                <Text style={[progressStyles.dotText, (isDone || isActive) && progressStyles.dotTextActive]}>
                  {i + 1}
                </Text>
              )}
            </View>
            {i < steps.length - 1 && (
              <View style={[progressStyles.line, isDone && progressStyles.lineDone]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  step: { flexDirection: "row", alignItems: "center", flex: 1 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: colors.green },
  dotActive: { backgroundColor: colors.primary, ...shadow.sm },
  dotText: { fontSize: 12, fontWeight: "700", color: colors.slate400 },
  dotTextActive: { color: colors.white },
  line: { flex: 1, height: 2, backgroundColor: colors.slate100, marginHorizontal: 4 },
  lineDone: { backgroundColor: colors.green },
});

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function BookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [step, setStep] = useState<Step>("slots");
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const [selectedDate, setSelectedDate] = useState(DATES[0].value);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [forSelf, setForSelf] = useState(true);
  const [dependentName, setDependentName] = useState("");
  const [dependentDob, setDependentDob] = useState("");
  const [dependentRelation, setDependentRelation] = useState<DependentRelation>("enfant");
  const [submitting, setSubmitting] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentPolling, setPaymentPolling] = useState(false);

  // Active steps for progress bar
  const activeSteps = [
    types.length > 0 ? "type" : null,
    practices.length > 1 ? "practice" : null,
    "slots",
    questions.length > 0 ? "questionnaire" : null,
    "form",
    paymentUrl ? "payment" : null,
  ].filter(Boolean) as Step[];

  useEffect(() => {
    async function load() {
      try {
        const d = await apiFetch<Doctor>(`/api/doctors/by-slug/${slug}`);
        setDoctor(d);
        const [typesData, practicesData] = await Promise.allSettled([
          apiFetch<AppointmentType[]>(`/api/appointment-types?doctorId=${d.id}`),
          apiFetch<Practice[]>(`/api/doctors/${d.id}/practices`),
        ]);
        let startStep: Step = "slots";
        if (typesData.status === "fulfilled" && typesData.value.length > 0) { setTypes(typesData.value); startStep = "type"; }
        if (practicesData.status === "fulfilled") { const pList = practicesData.value; setPractices(pList); if (pList.length === 1) setSelectedPractice(pList[0]); }
        setStep(startStep);
      } catch { Alert.alert("Erreur", "Médecin introuvable"); router.back(); }
      finally { setDoctorLoading(false); }
    }
    load();
  }, [slug]);

  useEffect(() => { getPatient().then((p) => { if (p?.name) setName(p.name); if (p?.phone) setPhone(p.phone); }); }, []);

  useEffect(() => {
    if (!doctor || step !== "slots") return;
    setSlotsLoading(true); setSelectedTime(null);
    const params = new URLSearchParams({ doctorId: doctor.id, date: selectedDate });
    if (selectedType) params.set("duration", String(selectedType.durationMinutes));
    apiFetch<Slot[]>(`/api/appointments?${params.toString()}`).then(setSlots).catch(() => setSlots([])).finally(() => setSlotsLoading(false));
  }, [doctor, selectedDate, step]);

  function handleTypeSelected(type: AppointmentType) {
    setSelectedType(type);
    setStep(practices.length > 1 ? "practice" : "slots");
  }

  function handlePracticeSelected(practice: Practice) { setSelectedPractice(practice); setStep("slots"); }

  async function handleSlotSelected(time: string) {
    setSelectedTime(time);
    if (selectedType) {
      try {
        const qs = await apiFetch<Question[]>(`/api/appointment-types/questions-public?typeId=${selectedType.id}`);
        if (qs.length > 0) { setQuestions(qs); setAnswers({}); setStep("questionnaire"); return; }
      } catch {}
    }
    setStep("form");
  }

  async function handleSubmit() {
    if (!doctor || !selectedTime || !name || !phone) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        doctorId: doctor.id, patientName: name, patientPhone: phone,
        date: selectedDate, startTime: selectedTime, reason: reason || undefined,
        appointmentTypeId: selectedType?.id, practiceId: selectedPractice?.id,
        beneficiaryRelation: forSelf ? "self" : dependentRelation,
        beneficiaryName: forSelf ? undefined : dependentName.trim() || undefined,
        beneficiaryDateOfBirth: forSelf ? undefined : dependentDob || undefined,
        questionnaire: Object.keys(answers).length > 0 ? answers : undefined,
      };
      const result = await apiFetch<{ id: string; paymentUrl?: string }>("/api/appointments", { method: "POST", body: JSON.stringify(body) });
      setAppointmentId(result.id);
      if (result.paymentUrl) { setPaymentUrl(result.paymentUrl); setStep("payment"); }
      else { router.replace(`/rdv/${result.id}/confirmation`); }
    } catch (e: unknown) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible de réserver");
    } finally { setSubmitting(false); }
  }

  async function handleOpenPayment() {
    if (!paymentUrl) return;
    const result = await WebBrowser.openBrowserAsync(paymentUrl);
    if (result.type === "cancel" || result.type === "dismiss") await pollPaymentStatus();
  }

  const pollPaymentStatus = useCallback(async () => {
    if (!appointmentId) return;
    setPaymentPolling(true);
    try {
      const appt = await apiFetch<{ id: string; status: string }>(`/api/appointments/${appointmentId}`);
      if (appt.status === "confirmed" || appt.status === "paid") router.replace(`/rdv/${appointmentId}/confirmation`);
      else Alert.alert("Paiement en attente", "Le paiement n'a pas encore été confirmé.");
    } catch { Alert.alert("Erreur", "Impossible de vérifier le statut."); }
    finally { setPaymentPolling(false); }
  }, [appointmentId]);

  const availableSlots = slots.filter((s) => s.available);
  // Only show fee for teleconsult (prepaid via platform) — cabinet fees are paid in person
  const fee = selectedType?.fee ?? null;
  const feeDisplay = fee != null ? `${(fee / 1000).toFixed(0)} DT` : null;

  if (doctorLoading) return <LoadingSpinner message="Chargement..." />;
  if (!doctor) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {/* Doctor mini header */}
      <View style={[styles.doctorHeader, shadow.sm]}>
        <View style={styles.doctorAvatar}>
          <Text style={styles.doctorInitial}>{doctor.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.doctorMeta}>{doctor.specialty} · {doctor.city}</Text>
        </View>
      </View>

      {/* Progress */}
      <StepProgress current={step} steps={activeSteps} />

      {/* ── STEP: type ── */}
      {step === "type" && (
        <View style={[styles.section, shadow.sm]}>
          <SectionHeader icon={<Stethoscope size={18} color={colors.primary} />} title="Motif de consultation" />
          <Text style={styles.hint}>Sélectionnez le type de consultation</Text>
          {types.map((t) => (
            <Pressable key={t.id} onPress={() => handleTypeSelected(t)} style={[styles.typeCard, shadow.sm]}>
              <View style={[styles.typeAccent, { backgroundColor: t.color || colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.typeName}>{t.name}</Text>
                <View style={styles.typeMetaRow}>
                  <Clock size={12} color={colors.slate400} />
                  <Text style={styles.typeMeta}>{t.durationMinutes} min</Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.slate400} />
            </Pressable>
          ))}
        </View>
      )}

      {/* ── STEP: practice ── */}
      {step === "practice" && practices.length > 1 && (
        <View style={[styles.section, shadow.sm]}>
          <SectionHeader icon={<MapPin size={18} color={colors.red} />} title="Choisissez un cabinet" />
          {practices.map((p) => (
            <Pressable key={p.id} onPress={() => handlePracticeSelected(p)} style={[styles.practiceCard, shadow.sm]}>
              <View style={styles.practiceIcon}><MapPin size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.practiceName}>{p.name}</Text>
                <Text style={styles.practiceAddr}>{p.address}, {p.city}</Text>
              </View>
              {p.isPrimary && <View style={styles.primaryTag}><Text style={styles.primaryTagText}>Principal</Text></View>}
            </Pressable>
          ))}
          <BackLink onPress={() => setStep("type")} text="Changer le motif" />
        </View>
      )}

      {/* ── STEP: slots ── */}
      {step === "slots" && (
        <>
          {selectedType && (
            <View style={[styles.selectedPill, shadow.sm]}>
              <Stethoscope size={14} color={colors.white} />
              <Text style={styles.selectedPillText}>{selectedType.name} · {selectedType.durationMinutes} min</Text>
              <Pressable onPress={() => setStep("type")}><Text style={styles.pillChange}>Changer</Text></Pressable>
            </View>
          )}

          <View style={[styles.section, shadow.sm]}>
            <SectionHeader icon={<Calendar size={18} color={colors.primary} />} title="Date" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {DATES.map((d) => {
                  const active = selectedDate === d.value;
                  return (
                    <Pressable key={d.value} onPress={() => setSelectedDate(d.value)} style={[styles.dateCard, active && styles.dateCardActive]}>
                      <Text style={[styles.dateDay, active && styles.dateDayActive]}>{d.day}</Text>
                      <Text style={[styles.dateNum, active && styles.dateNumActive]}>{d.date}</Text>
                      <Text style={[styles.dateMonth, active && styles.dateMonthActive]}>{d.month}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={[styles.section, shadow.sm]}>
            <SectionHeader icon={<Clock size={18} color={colors.primary} />} title="Créneau" />
            {slotsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : availableSlots.length === 0 ? (
              <View style={styles.emptySlots}>
                <Calendar size={32} color={colors.slate200} />
                <Text style={styles.emptyText}>Aucun créneau disponible</Text>
                <Text style={styles.emptyHint}>Essayez une autre date</Text>
              </View>
            ) : (
              <View style={styles.slotGrid}>
                {availableSlots.map((slot) => {
                  const active = selectedTime === slot.startTime;
                  return (
                    <Pressable key={slot.startTime} onPress={() => handleSlotSelected(slot.startTime)} style={[styles.slot, active && styles.slotActive, active && shadow.sm]}>
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot.startTime}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}

      {/* ── STEP: questionnaire ── */}
      {step === "questionnaire" && (
        <View style={[styles.section, shadow.sm]}>
          <SectionHeader icon={<FileText size={18} color={colors.primary} />} title="Questions préalables" />
          <Text style={styles.hint}>Le médecin a besoin de ces informations</Text>
          {questions.map((q) => (
            <View key={q.id} style={styles.qBlock}>
              <Text style={styles.qLabel}>{q.label}{q.required && <Text style={{ color: colors.red }}> *</Text>}</Text>
              {q.kind === "text" && (
                <TextInput style={styles.input} placeholder="Votre réponse" placeholderTextColor={colors.slate400} value={answers[q.id] ?? ""} onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} multiline />
              )}
              {q.kind === "choice" && q.choices && (
                <View style={styles.chipRow}>{q.choices.map((c) => (
                  <Pressable key={c} onPress={() => setAnswers((a) => ({ ...a, [q.id]: c }))} style={[styles.chip, answers[q.id] === c && styles.chipActive]}>
                    <Text style={[styles.chipText, answers[q.id] === c && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                ))}</View>
              )}
              {q.kind === "yesno" && (
                <View style={styles.chipRow}>{["Oui", "Non"].map((opt) => (
                  <Pressable key={opt} onPress={() => setAnswers((a) => ({ ...a, [q.id]: opt }))} style={[styles.chip, { flex: 1 }, answers[q.id] === opt && styles.chipActive]}>
                    <Text style={[styles.chipText, { textAlign: "center" }, answers[q.id] === opt && styles.chipTextActive]}>{opt}</Text>
                  </Pressable>
                ))}</View>
              )}
              {q.kind === "file" && (
                <View style={styles.filePlaceholder}><Text style={styles.fileText}>Téléversement bientôt disponible</Text></View>
              )}
            </View>
          ))}
          <Button title="Continuer" onPress={() => setStep("form")} size="lg" style={{ marginTop: spacing.lg }}
            disabled={questions.filter((q) => q.required && q.kind !== "file").some((q) => !answers[q.id])} />
          <BackLink onPress={() => setStep("slots")} text="Changer le créneau" />
        </View>
      )}

      {/* ── STEP: form ── */}
      {step === "form" && (
        <View style={[styles.section, shadow.sm]}>
          {/* Summary */}
          <View style={[styles.summaryCard, shadow.sm]}>
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.summaryText}>
              {DATES.find(d => d.value === selectedDate)?.label ?? selectedDate} à {selectedTime}
              {selectedType ? ` · ${selectedType.name}` : ""}
            </Text>
            <Pressable onPress={() => setStep("slots")}><Text style={styles.summaryChange}>Modifier</Text></Pressable>
          </View>

          <SectionHeader icon={<User size={18} color={colors.primary} />} title="Vos coordonnées" />
          <TextInput style={styles.input} placeholder="Nom complet" value={name} onChangeText={setName} placeholderTextColor={colors.slate400} />
          <TextInput style={styles.input} placeholder="+216 XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.slate400} />
          <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} placeholder="Motif (optionnel)" value={reason} onChangeText={setReason} multiline placeholderTextColor={colors.slate400} />

          {/* Toggle */}
          <View style={styles.toggleHeader}>
            <Users size={16} color={colors.primary} />
            <Text style={styles.toggleTitle}>Pour qui ?</Text>
          </View>
          <View style={styles.toggleRow}>
            <Pressable onPress={() => setForSelf(true)} style={[styles.toggleBtn, forSelf && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, forSelf && styles.toggleBtnTextActive]}>Pour moi</Text>
            </Pressable>
            <Pressable onPress={() => setForSelf(false)} style={[styles.toggleBtn, !forSelf && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, !forSelf && styles.toggleBtnTextActive]}>Pour un proche</Text>
            </Pressable>
          </View>

          {!forSelf && (
            <View style={styles.dependentBlock}>
              <TextInput style={styles.input} placeholder="Nom du proche" value={dependentName} onChangeText={setDependentName} placeholderTextColor={colors.slate400} />
              <TextInput style={styles.input} placeholder="Date de naissance (JJ/MM/AAAA)" value={dependentDob} onChangeText={setDependentDob} keyboardType="numeric" placeholderTextColor={colors.slate400} />
              <Text style={styles.relationLabel}>Relation</Text>
              <View style={styles.chipRow}>
                {RELATIONS.map((r) => (
                  <Pressable key={r.value} onPress={() => setDependentRelation(r.value)} style={[styles.chip, dependentRelation === r.value && styles.chipActive]}>
                    <Text style={[styles.chipText, dependentRelation === r.value && styles.chipTextActive]}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Button title="Confirmer le RDV" onPress={handleSubmit} loading={submitting} disabled={!name || !phone || (!forSelf && !dependentName)} size="lg" icon={<CheckCircle2 size={18} color={colors.white} />} style={{ marginTop: spacing.lg }} />
        </View>
      )}

      {/* ── STEP: payment ── */}
      {step === "payment" && (
        <View style={[styles.section, shadow.sm]}>
          <SectionHeader icon={<CreditCard size={18} color={colors.primary} />} title="Paiement requis" />
          <Text style={styles.hint}>Ce rendez-vous nécessite un paiement en ligne</Text>

          <View style={[styles.paymentBox, shadow.sm]}>
            <Text style={styles.paymentLabel}>Montant à payer</Text>
            <Text style={styles.paymentAmount}>{feeDisplay ?? "—"}</Text>
          </View>

          <Button title={paymentPolling ? "Vérification..." : "Payer en ligne"} onPress={handleOpenPayment} loading={paymentPolling} size="lg" icon={<CreditCard size={18} color={colors.white} />} style={{ marginTop: spacing.md }} />
          <Button title="J'ai déjà payé" onPress={pollPaymentStatus} variant="secondary" loading={paymentPolling} size="md" style={{ marginTop: spacing.sm }} />

          <View style={styles.securityRow}>
            <Shield size={14} color={colors.green} />
            <Text style={styles.securityText}>Paiement sécurisé via Flouci</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionHeader}>{icon}<Text style={styles.sectionTitle}>{title}</Text></View>
  );
}

function BackLink({ onPress, text }: { onPress: () => void; text: string }) {
  return (
    <Pressable onPress={onPress} style={styles.backLink}>
      <ArrowLeft size={14} color={colors.primary} /><Text style={styles.backLinkText}>{text}</Text>
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Doctor header
  doctorHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.white, margin: spacing.md, marginBottom: 0,
    padding: spacing.md, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  doctorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" },
  doctorInitial: { fontSize: 18, fontWeight: "700", color: colors.primary },
  doctorName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  doctorMeta: { fontSize: 13, color: colors.slate500, marginTop: 1 },

  // Section
  section: {
    backgroundColor: colors.white, margin: spacing.md, marginBottom: 0,
    padding: spacing.lg, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, letterSpacing: -0.2 },
  hint: { fontSize: 13, color: colors.slate500, marginBottom: spacing.md, lineHeight: 18 },

  // Type cards
  typeCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md, marginTop: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  typeAccent: { width: 4, height: 36, borderRadius: 2 },
  typeName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  typeMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  typeMeta: { fontSize: 13, color: colors.slate500 },

  // Practice cards
  practiceCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md, marginTop: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  practiceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryFaint, alignItems: "center", justifyContent: "center" },
  practiceName: { fontSize: 15, fontWeight: "600", color: colors.ink },
  practiceAddr: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  primaryTag: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  primaryTagText: { fontSize: 11, color: colors.white, fontWeight: "700" },

  // Selected pill
  selectedPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  selectedPillText: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.white },
  pillChange: { fontSize: 13, color: "rgba(255,255,255,0.8)", textDecorationLine: "underline" },

  // Date cards
  dateCard: {
    alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.bg, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border, minWidth: 56,
  },
  dateCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDay: { fontSize: 11, fontWeight: "600", color: colors.slate400, textTransform: "uppercase" },
  dateDayActive: { color: "rgba(255,255,255,0.8)" },
  dateNum: { fontSize: 20, fontWeight: "800", color: colors.ink, marginVertical: 2 },
  dateNumActive: { color: colors.white },
  dateMonth: { fontSize: 11, color: colors.slate400 },
  dateMonthActive: { color: "rgba(255,255,255,0.8)" },

  // Slots
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.sm },
  slot: {
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.bg, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, minWidth: 76, alignItems: "center",
  },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: 15, fontWeight: "600", color: colors.slate500 },
  slotTextActive: { color: colors.white },
  emptySlots: { alignItems: "center", paddingVertical: spacing.xl },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.slate500, marginTop: spacing.sm },
  emptyHint: { fontSize: 13, color: colors.slate400, marginTop: 4 },

  // Questionnaire
  qBlock: { marginTop: spacing.md },
  qLabel: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.slate500 },
  chipTextActive: { color: colors.white },
  filePlaceholder: { marginTop: 4, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.border, alignItems: "center" },
  fileText: { fontSize: 13, color: colors.slate400, fontStyle: "italic" },

  // Form
  input: {
    backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.slate200,
    marginTop: spacing.sm, fontSize: 15, color: colors.ink,
  },
  summaryCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.primaryFaint, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.primaryLight,
  },
  summaryText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.primary },
  summaryChange: { fontSize: 13, color: colors.primaryDark, fontWeight: "600" },
  toggleHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.lg, marginBottom: spacing.xs },
  toggleTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  toggleRow: { flexDirection: "row", gap: 8, marginTop: spacing.xs },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bg },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleBtnText: { fontSize: 14, fontWeight: "600", color: colors.slate500 },
  toggleBtnTextActive: { color: colors.white },
  dependentBlock: { marginTop: spacing.sm },
  relationLabel: { fontSize: 13, fontWeight: "600", color: colors.slate500, marginTop: spacing.md, marginBottom: 4 },

  // Back
  backLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.md, paddingVertical: spacing.sm },
  backLinkText: { fontSize: 14, color: colors.primary, fontWeight: "600" },

  // Payment
  paymentBox: {
    backgroundColor: colors.primaryFaint, borderRadius: radius.xl,
    padding: spacing.lg, alignItems: "center",
    borderWidth: 1, borderColor: colors.primaryLight,
  },
  paymentLabel: { fontSize: 13, color: colors.slate500, fontWeight: "600" },
  paymentAmount: { fontSize: 36, fontWeight: "900", color: colors.primary, marginTop: 4, letterSpacing: -1 },
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.lg },
  securityText: { fontSize: 12, color: colors.greenDark, fontWeight: "600" },
});
