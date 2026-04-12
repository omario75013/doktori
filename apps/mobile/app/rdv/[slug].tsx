import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { getPatient } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  slug: string;
  specialty: string;
  city: string;
  address: string;
  photoUrl: string | null;
  consultationFee: number | null;
  consultationMode?: string;
  teleconsultFee?: number | null;
}

interface AppointmentType {
  id: string;
  name: string;
  durationMinutes: number;
  fee: number | null;
  color: string;
}

interface Practice {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  isPrimary: boolean;
}

interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface Question {
  id: string;
  label: string;
  kind: "text" | "choice" | "file" | "yesno";
  choices: string[] | null;
  required: boolean;
  displayOrder: number;
}

type Step = "type" | "practice" | "slots" | "questionnaire" | "form" | "payment";
type DependentRelation = "enfant" | "parent" | "conjoint" | "autre";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDates(): Array<{ value: string; label: string }> {
  const arr = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    arr.push({
      value: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return arr;
}

const DATES = buildDates();
const RELATIONS: Array<{ value: DependentRelation; label: string }> = [
  { value: "enfant", label: "Enfant" },
  { value: "parent", label: "Parent" },
  { value: "conjoint", label: "Conjoint(e)" },
  { value: "autre", label: "Autre" },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  // Doctor data
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);

  // Step
  const [step, setStep] = useState<Step>("slots");

  // Appointment types
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);

  // Practices
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);

  // Date & slot
  const [selectedDate, setSelectedDate] = useState(DATES[0].value);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Questionnaire
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Patient form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");

  // Dependent booking
  const [forSelf, setForSelf] = useState(true);
  const [dependentName, setDependentName] = useState("");
  const [dependentDob, setDependentDob] = useState("");
  const [dependentRelation, setDependentRelation] = useState<DependentRelation>("enfant");

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentPolling, setPaymentPolling] = useState(false);

  // ── Load doctor + types + practices ──────────────────────────────────────────

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

        if (typesData.status === "fulfilled" && typesData.value.length > 0) {
          setTypes(typesData.value);
          startStep = "type";
        }

        if (practicesData.status === "fulfilled") {
          const pList = practicesData.value;
          setPractices(pList);
          if (pList.length === 1) {
            setSelectedPractice(pList[0]);
          }
        }

        setStep(startStep);
      } catch {
        Alert.alert("Erreur", "Médecin introuvable");
        router.back();
      } finally {
        setDoctorLoading(false);
      }
    }
    load();
  }, [slug]);

  // ── Pre-fill patient info ─────────────────────────────────────────────────

  useEffect(() => {
    getPatient().then((p) => {
      if (p?.name) setName(p.name);
      if (p?.phone) setPhone(p.phone);
    });
  }, []);

  // ── Load slots ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!doctor || step !== "slots") return;
    setSlotsLoading(true);
    setSelectedTime(null);
    const params = new URLSearchParams({ doctorId: doctor.id, date: selectedDate });
    if (selectedType) params.set("duration", String(selectedType.durationMinutes));
    apiFetch<Slot[]>(`/api/appointments?${params.toString()}`)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [doctor, selectedDate, step]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleTypeSelected(type: AppointmentType) {
    setSelectedType(type);
    if (practices.length > 1) {
      setStep("practice");
    } else {
      setStep("slots");
    }
  }

  function handlePracticeSelected(practice: Practice) {
    setSelectedPractice(practice);
    setStep("slots");
  }

  async function handleSlotSelected(time: string) {
    setSelectedTime(time);

    if (selectedType) {
      try {
        const qs = await apiFetch<Question[]>(
          `/api/appointment-types/questions-public?typeId=${selectedType.id}`
        );
        if (qs.length > 0) {
          setQuestions(qs);
          setAnswers({});
          setStep("questionnaire");
          return;
        }
      } catch {
        // ignore — fall through to form
      }
    }
    setStep("form");
  }

  async function handleSubmit() {
    if (!doctor || !selectedTime || !name || !phone) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        doctorId: doctor.id,
        patientName: name,
        patientPhone: phone,
        date: selectedDate,
        startTime: selectedTime,
        reason: reason || undefined,
        appointmentTypeId: selectedType?.id,
        practiceId: selectedPractice?.id,
        beneficiaryRelation: forSelf ? "self" : dependentRelation,
        beneficiaryName: forSelf ? undefined : dependentName.trim() || undefined,
        beneficiaryDateOfBirth: forSelf ? undefined : dependentDob || undefined,
        questionnaire: Object.keys(answers).length > 0 ? answers : undefined,
      };

      const result = await apiFetch<{ id: string; paymentUrl?: string }>(
        "/api/appointments",
        { method: "POST", body: JSON.stringify(body) }
      );

      setAppointmentId(result.id);

      if (result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
        setStep("payment");
      } else {
        router.replace(`/rdv/${result.id}/confirmation`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Impossible de réserver";
      Alert.alert("Erreur", msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenPayment() {
    if (!paymentUrl) return;
    const result = await WebBrowser.openBrowserAsync(paymentUrl);
    if (result.type === "cancel" || result.type === "dismiss") {
      // User came back — poll appointment status
      await pollPaymentStatus();
    }
  }

  const pollPaymentStatus = useCallback(async () => {
    if (!appointmentId) return;
    setPaymentPolling(true);
    try {
      const appt = await apiFetch<{ id: string; status: string }>(
        `/api/appointments/${appointmentId}`
      );
      if (appt.status === "confirmed" || appt.status === "paid") {
        router.replace(`/rdv/${appointmentId}/confirmation`);
      } else {
        Alert.alert(
          "Paiement en attente",
          "Le paiement n'a pas encore été confirmé. Réessayez ou contactez le support.",
          [{ text: "OK" }]
        );
      }
    } catch {
      Alert.alert("Erreur", "Impossible de vérifier le statut du paiement.");
    } finally {
      setPaymentPolling(false);
    }
  }, [appointmentId]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const availableSlots = slots.filter((s) => s.available);
  const fee = selectedType?.fee ?? doctor?.consultationFee ?? null;
  const feeDisplay = fee != null ? `${(fee / 1000).toFixed(0)} DT` : "Gratuit";

  if (doctorLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!doctor) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>

      {/* Doctor header */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avec {doctor.name}</Text>
        <Text style={styles.doctorMeta}>{doctor.specialty} · {doctor.city}</Text>
        {fee != null && (
          <Text style={styles.fee}>{feeDisplay}</Text>
        )}
      </View>

      {/* ── STEP: type selection ── */}
      {step === "type" && (
        <View style={styles.section}>
          <Text style={styles.label}>Motif de consultation</Text>
          <Text style={styles.sublabel}>
            Sélectionnez le type de consultation. La durée et le tarif s'adaptent automatiquement.
          </Text>
          {types.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => handleTypeSelected(t)}
              style={styles.typeCard}
            >
              <View style={[styles.typeColor, { backgroundColor: t.color || colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.typeName}>{t.name}</Text>
                <Text style={styles.typeMeta}>
                  {t.durationMinutes} min
                  {t.fee != null ? ` · ${(t.fee / 1000).toFixed(0)} DT` : ""}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── STEP: practice selection ── */}
      {step === "practice" && practices.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.label}>Choisissez un cabinet</Text>
          {practices.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => handlePracticeSelected(p)}
              style={styles.practiceCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.practiceName}>{p.name}</Text>
                <Text style={styles.practiceAddress}>{p.address}</Text>
                <Text style={styles.practiceCity}>{p.city}</Text>
              </View>
              {p.isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Principal</Text>
                </View>
              )}
            </Pressable>
          ))}
          <Pressable onPress={() => setStep("type")} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Changer le motif</Text>
          </Pressable>
        </View>
      )}

      {/* ── STEP: date + slot ── */}
      {step === "slots" && (
        <>
          {selectedType && (
            <View style={styles.selectedTypePill}>
              <Text style={styles.selectedTypePillText}>
                {selectedType.name} · {selectedType.durationMinutes} min
              </Text>
              <Pressable onPress={() => setStep("type")}>
                <Text style={styles.changeLink}>Changer</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Choisissez une date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {DATES.map((d) => (
                  <Pressable
                    key={d.value}
                    onPress={() => setSelectedDate(d.value)}
                    style={[
                      styles.dateChip,
                      selectedDate === d.value && styles.dateChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateChipText,
                        selectedDate === d.value && styles.dateChipTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Choisissez un créneau</Text>
            {slotsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
            ) : availableSlots.length === 0 ? (
              <Text style={styles.empty}>Aucun créneau disponible ce jour</Text>
            ) : (
              <View style={styles.slotGrid}>
                {availableSlots.map((slot) => (
                  <Pressable
                    key={slot.startTime}
                    onPress={() => handleSlotSelected(slot.startTime)}
                    style={[
                      styles.slot,
                      selectedTime === slot.startTime && styles.slotActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        selectedTime === slot.startTime && styles.slotTextActive,
                      ]}
                    >
                      {slot.startTime}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      {/* ── STEP: questionnaire ── */}
      {step === "questionnaire" && (
        <View style={styles.section}>
          <Text style={styles.label}>Questions préalables</Text>
          <Text style={styles.sublabel}>
            Le médecin a besoin de ces informations avant votre consultation.
          </Text>

          {questions.map((q) => (
            <View key={q.id} style={styles.questionBlock}>
              <Text style={styles.questionLabel}>
                {q.label}
                {q.required && <Text style={{ color: colors.red }}> *</Text>}
              </Text>

              {q.kind === "text" && (
                <TextInput
                  style={styles.input}
                  placeholder="Votre réponse"
                  placeholderTextColor={colors.slate500}
                  value={answers[q.id] ?? ""}
                  onChangeText={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                  multiline
                />
              )}

              {q.kind === "choice" && q.choices && (
                <View style={styles.choicesRow}>
                  {q.choices.map((choice) => (
                    <Pressable
                      key={choice}
                      onPress={() => setAnswers((a) => ({ ...a, [q.id]: choice }))}
                      style={[
                        styles.choiceChip,
                        answers[q.id] === choice && styles.choiceChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          answers[q.id] === choice && styles.choiceChipTextActive,
                        ]}
                      >
                        {choice}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {q.kind === "yesno" && (
                <View style={styles.yesnoRow}>
                  {(["Oui", "Non"] as const).map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      style={[
                        styles.yesnoBtn,
                        answers[q.id] === opt && styles.yesnoBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.yesnoBtnText,
                          answers[q.id] === opt && styles.yesnoBtnTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {q.kind === "file" && (
                <View style={styles.filePlaceholder}>
                  <Text style={styles.filePlaceholderText}>
                    Téléversement bientôt disponible
                  </Text>
                </View>
              )}
            </View>
          ))}

          <Button
            title="Continuer"
            onPress={() => setStep("form")}
            style={{ marginTop: spacing.md }}
            disabled={questions
              .filter((q) => q.required && q.kind !== "file")
              .some((q) => !answers[q.id])}
          />
          <Pressable onPress={() => setStep("slots")} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Changer le créneau</Text>
          </Pressable>
        </View>
      )}

      {/* ── STEP: patient form ── */}
      {step === "form" && (
        <View style={styles.section}>
          {/* Booking summary chip */}
          <View style={styles.summaryChip}>
            <Text style={styles.summaryChipText}>
              {selectedDate} à {selectedTime}
              {selectedType ? ` · ${selectedType.name}` : ""}
            </Text>
            <Pressable onPress={() => setStep("slots")}>
              <Text style={styles.changeLink}>Changer</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Vos coordonnées</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom complet"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.slate500}
          />
          <TextInput
            style={styles.input}
            placeholder="+216 XX XXX XXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={colors.slate500}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Motif (optionnel)"
            value={reason}
            onChangeText={setReason}
            multiline
            placeholderTextColor={colors.slate500}
          />

          {/* Pour moi / Pour un proche toggle */}
          <Text style={[styles.label, { marginTop: spacing.md }]}>Pour qui ?</Text>
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setForSelf(true)}
              style={[styles.toggleBtn, forSelf && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleBtnText, forSelf && styles.toggleBtnTextActive]}>
                Pour moi
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setForSelf(false)}
              style={[styles.toggleBtn, !forSelf && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleBtnText, !forSelf && styles.toggleBtnTextActive]}>
                Pour un proche
              </Text>
            </Pressable>
          </View>

          {!forSelf && (
            <View style={styles.dependentBlock}>
              <TextInput
                style={styles.input}
                placeholder="Nom du proche"
                value={dependentName}
                onChangeText={setDependentName}
                placeholderTextColor={colors.slate500}
              />
              <TextInput
                style={styles.input}
                placeholder="Date de naissance (JJ/MM/AAAA)"
                value={dependentDob}
                onChangeText={setDependentDob}
                placeholderTextColor={colors.slate500}
                keyboardType="numeric"
              />
              <Text style={styles.relationLabel}>Relation</Text>
              <View style={styles.choicesRow}>
                {RELATIONS.map((r) => (
                  <Pressable
                    key={r.value}
                    onPress={() => setDependentRelation(r.value)}
                    style={[
                      styles.choiceChip,
                      dependentRelation === r.value && styles.choiceChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        dependentRelation === r.value && styles.choiceChipTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Button
            title={submitting ? "Réservation..." : "Confirmer le RDV"}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!name || !phone || (!forSelf && !dependentName)}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}

      {/* ── STEP: payment ── */}
      {step === "payment" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paiement requis</Text>
          <Text style={styles.sublabel}>
            Ce rendez-vous nécessite un paiement en ligne pour être confirmé.
          </Text>

          <View style={styles.paymentAmountBox}>
            <Text style={styles.paymentAmountLabel}>Montant à payer</Text>
            <Text style={styles.paymentAmount}>{feeDisplay}</Text>
          </View>

          <Button
            title={paymentPolling ? "Vérification..." : "Payer en ligne"}
            onPress={handleOpenPayment}
            loading={paymentPolling}
            style={{ marginTop: spacing.md }}
          />
          <Button
            title="J'ai déjà payé"
            onPress={pollPaymentStatus}
            variant="secondary"
            loading={paymentPolling}
            style={{ marginTop: spacing.sm }}
          />
          <Text style={styles.paymentNote}>
            Vous serez redirigé vers Flouci pour effectuer le paiement en toute sécurité.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  section: {
    backgroundColor: colors.white,
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: colors.ink },
  doctorMeta: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  fee: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: 4 },

  label: { fontSize: 14, fontWeight: "600", color: colors.slate500, marginBottom: 4 },
  sublabel: { fontSize: 13, color: colors.slate500, marginBottom: spacing.sm, lineHeight: 18 },

  // Appointment type cards
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mist,
  },
  typeColor: { width: 4, height: 40, borderRadius: 2 },
  typeName: { fontSize: 15, fontWeight: "600", color: colors.ink },
  typeMeta: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.slate500 },

  // Practice cards
  practiceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mist,
  },
  practiceName: { fontSize: 15, fontWeight: "600", color: colors.ink },
  practiceAddress: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  practiceCity: { fontSize: 12, color: colors.slate500 },
  primaryBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  primaryBadgeText: { fontSize: 11, color: colors.white, fontWeight: "600" },

  // Selected type pill above date picker
  selectedTypePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  selectedTypePillText: { fontSize: 13, fontWeight: "600", color: colors.white },
  changeLink: { fontSize: 13, color: colors.white, textDecorationLine: "underline" },

  // Date chip
  dateChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.mist, borderRadius: radius.sm },
  dateChipActive: { backgroundColor: colors.primary },
  dateChipText: { fontSize: 13, color: colors.slate500 },
  dateChipTextActive: { color: colors.white },

  // Slot grid
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  slot: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.mist,
    borderRadius: radius.sm,
    minWidth: 72,
    alignItems: "center",
  },
  slotActive: { backgroundColor: colors.primary },
  slotText: { fontSize: 14, color: colors.slate500 },
  slotTextActive: { color: colors.white, fontWeight: "600" },
  empty: { color: colors.slate500, textAlign: "center", marginTop: 12 },

  // Questionnaire
  questionBlock: { marginTop: spacing.md },
  questionLabel: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6 },

  choicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mist,
  },
  choiceChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceChipText: { fontSize: 13, color: colors.slate500 },
  choiceChipTextActive: { color: colors.white, fontWeight: "600" },

  yesnoRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  yesnoBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mist,
  },
  yesnoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  yesnoBtnText: { fontSize: 14, color: colors.slate500 },
  yesnoBtnTextActive: { color: colors.white, fontWeight: "600" },

  filePlaceholder: {
    marginTop: 4,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
  },
  filePlaceholderText: { fontSize: 13, color: colors.slate500, fontStyle: "italic" },

  // Form
  input: {
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    fontSize: 15,
    color: colors.ink,
  },

  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  summaryChipText: { fontSize: 13, fontWeight: "600", color: colors.white, flex: 1 },

  // Toggle Pour moi / Pour un proche
  toggleRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mist,
  },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleBtnText: { fontSize: 14, color: colors.slate500 },
  toggleBtnTextActive: { color: colors.white, fontWeight: "600" },

  dependentBlock: { marginTop: spacing.sm },
  relationLabel: { fontSize: 13, fontWeight: "600", color: colors.slate500, marginTop: spacing.sm, marginBottom: 4 },

  // Back link
  backLink: { marginTop: spacing.sm, alignItems: "center" },
  backLinkText: { fontSize: 13, color: colors.primary },

  // Payment
  paymentAmountBox: {
    backgroundColor: colors.mist,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentAmountLabel: { fontSize: 13, color: colors.slate500 },
  paymentAmount: { fontSize: 32, fontWeight: "700", color: colors.primary, marginTop: 4 },
  paymentNote: {
    fontSize: 12,
    color: colors.slate500,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
