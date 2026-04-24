import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const SPECIALTIES = [
  "Médecine générale",
  "Cardiologie",
  "Pédiatrie",
  "Dermatologie",
  "Gynécologie",
  "Ophtalmologie",
  "Neurologie",
  "Orthopédie",
];

const TOTAL_STEPS = 3;

export default function DoctorSignup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 — Identité
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 — Profil médical
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [diplomaYear, setDiplomaYear] = useState("");

  // Step 3 — Confirmation
  const [accepted, setAccepted] = useState(false);

  function validateStep1(): string | null {
    if (!firstName.trim()) return "Prénom requis";
    if (!lastName.trim()) return "Nom requis";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "Adresse email invalide";
    if (!phone.trim()) return "Numéro de téléphone requis";
    if (!password || password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
    return null;
  }

  function validateStep2(): string | null {
    if (!specialty.trim()) return "Spécialité requise";
    if (!city.trim()) return "Ville requise";
    if (diplomaYear.trim()) {
      const y = parseInt(diplomaYear, 10);
      if (isNaN(y) || y < 1950 || y > 2030) return "Année du diplôme invalide (1950–2030)";
    }
    return null;
  }

  function goNext() {
    if (step === 1) {
      const err = validateStep1();
      if (err) { Alert.alert("Champ invalide", err); return; }
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) { Alert.alert("Champ invalide", err); return; }
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => s - 1);
  }

  async function submit() {
    if (!accepted) {
      Alert.alert("Conditions", "Veuillez accepter les conditions d'utilisation");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        specialty: specialty.trim(),
        city: city.trim(),
      };
      if (diplomaYear.trim()) {
        body.diplomaYear = parseInt(diplomaYear, 10);
      }
      await api<{ ok: boolean; message: string }>("/api/auth/doctor-register", {
        method: "POST",
        skipAuth: true,
        body,
      });
      setSubmitted(true);
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return <SuccessScreen />;
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i < step ? styles.progressSegmentActive : styles.progressSegmentInactive,
                  i < TOTAL_STEPS - 1 && { marginRight: 4 },
                ]}
              />
            ))}
          </View>
          <Text style={styles.stepLabel}>Étape {step}/{TOTAL_STEPS}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <Step1
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              password={password}
              setPassword={setPassword}
            />
          )}
          {step === 2 && (
            <Step2
              specialty={specialty}
              setSpecialty={setSpecialty}
              city={city}
              setCity={setCity}
              diplomaYear={diplomaYear}
              setDiplomaYear={setDiplomaYear}
            />
          )}
          {step === 3 && (
            <Step3
              firstName={firstName}
              lastName={lastName}
              email={email}
              phone={phone}
              specialty={specialty}
              city={city}
              diplomaYear={diplomaYear}
              accepted={accepted}
              setAccepted={setAccepted}
            />
          )}

          {/* Navigation buttons */}
          <View style={styles.navRow}>
            {step > 1 && (
              <Pressable
                style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
                onPress={goBack}
              >
                <Text style={styles.backButtonText}>Retour</Text>
              </Pressable>
            )}
            {step < TOTAL_STEPS ? (
              <Pressable
                style={({ pressed }) => [
                  styles.nextButton,
                  { backgroundColor: colors.teal },
                  pressed && { opacity: 0.75 },
                  step === 1 && { flex: 1 },
                ]}
                onPress={goNext}
              >
                <Text style={styles.nextButtonText}>Suivant</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.nextButton,
                  { backgroundColor: colors.teal },
                  (loading || pressed) && { opacity: 0.75 },
                ]}
                onPress={submit}
                disabled={loading}
              >
                <Text style={styles.nextButtonText}>
                  {loading ? "Envoi…" : "Envoyer la demande"}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Step 1: Identité ─────────────────────────────────────────────────────────

type Step1Props = {
  firstName: string; setFirstName: (v: string) => void;
  lastName: string; setLastName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  password: string; setPassword: (v: string) => void;
};

function Step1({ firstName, setFirstName, lastName, setLastName, email, setEmail, phone, setPhone, password, setPassword }: Step1Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Votre identité</Text>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Prénom</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Prénom"
            autoCapitalize="words"
          />
        </View>
        <View style={{ width: spacing.sm }} />
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nom"
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="prenom.nom@exemple.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Téléphone</Text>
        <View style={styles.phoneRow}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixText}>+216</Text>
          </View>
          <TextInput
            style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="XX XXX XXX"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="8 caractères minimum"
          secureTextEntry
          autoComplete="new-password"
        />
      </View>
    </View>
  );
}

// ─── Step 2: Profil médical ───────────────────────────────────────────────────

type Step2Props = {
  specialty: string; setSpecialty: (v: string) => void;
  city: string; setCity: (v: string) => void;
  diplomaYear: string; setDiplomaYear: (v: string) => void;
};

function Step2({ specialty, setSpecialty, city, setCity, diplomaYear, setDiplomaYear }: Step2Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Profil médical</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Spécialité</Text>
        <TextInput
          style={styles.input}
          value={specialty}
          onChangeText={setSpecialty}
          placeholder="Ex: Médecine générale"
          autoCapitalize="words"
        />
        <View style={styles.chips}>
          {SPECIALTIES.map((s) => (
            <Pressable
              key={s}
              style={({ pressed }) => [
                styles.chip,
                specialty === s && styles.chipActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setSpecialty(s)}
            >
              <Text
                style={[styles.chipText, specialty === s && styles.chipTextActive]}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Ville</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Ex: Tunis"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Année du diplôme (optionnel)</Text>
        <TextInput
          style={styles.input}
          value={diplomaYear}
          onChangeText={setDiplomaYear}
          placeholder="Ex: 2010"
          keyboardType="numeric"
          maxLength={4}
        />
      </View>
    </View>
  );
}

// ─── Step 3: Confirmation ─────────────────────────────────────────────────────

type Step3Props = {
  firstName: string; lastName: string;
  email: string; phone: string;
  specialty: string; city: string; diplomaYear: string;
  accepted: boolean; setAccepted: (v: boolean) => void;
};

function Step3({ firstName, lastName, email, phone, specialty, city, diplomaYear, accepted, setAccepted }: Step3Props) {
  const rows: { label: string; value: string }[] = [
    { label: "Prénom", value: firstName },
    { label: "Nom", value: lastName },
    { label: "Email", value: email },
    { label: "Téléphone", value: `+216 ${phone}` },
    { label: "Spécialité", value: specialty },
    { label: "Ville", value: city },
    ...(diplomaYear ? [{ label: "Année du diplôme", value: diplomaYear }] : []),
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Confirmation</Text>
      <Text style={styles.stepSubtitle}>
        Vérifiez vos informations avant d'envoyer votre demande.
      </Text>

      <View style={styles.summaryCard}>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[styles.summaryRow, i < rows.length - 1 && styles.summaryRowBorder]}
          >
            <Text style={styles.summaryLabel}>{row.label}</Text>
            <Text style={styles.summaryValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={styles.checkboxRow}
        onPress={() => setAccepted(!accepted)}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>
          J'accepte les conditions d'utilisation
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <View style={styles.successIconInner}>
            <Text style={styles.successCheckmark}>✓</Text>
          </View>
        </View>
        <Text style={styles.successTitle}>Demande envoyée !</Text>
        <Text style={styles.successMessage}>
          Notre équipe examinera votre dossier et vous contactera dans les 48h ouvrables.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: colors.teal, alignSelf: "stretch", marginTop: spacing.xl },
            pressed && { opacity: 0.75 },
          ]}
          onPress={() => router.replace("/(auth)/patient-login")}
        >
          <Text style={styles.nextButtonText}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  progressContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  progressBar: {
    flexDirection: "row",
    height: 4,
  },
  progressSegment: {
    flex: 1,
    borderRadius: 2,
  },
  progressSegmentActive: { backgroundColor: colors.teal },
  progressSegmentInactive: { backgroundColor: colors.border },
  stepLabel: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    fontWeight: "600",
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  stepContainer: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.foregroundSecondary,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row" },
  field: { gap: spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: "#FFFFFF",
  },
  phoneRow: { flexDirection: "row" },
  phonePrefix: {
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: colors.border,
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
    backgroundColor: colors.bg ?? "#F5F5F5",
  },
  phonePrefixText: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    borderColor: colors.teal,
    backgroundColor: colors.teal + "15",
  },
  chipText: {
    fontSize: 13,
    color: colors.foregroundSecondary,
  },
  chipTextActive: {
    color: colors.teal,
    fontWeight: "600",
  },
  // Summary card
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    color: colors.foreground,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  // Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.foreground,
    flex: 1,
  },
  // Navigation
  navRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
  },
  nextButton: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Success screen
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#22C55E" + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  successCheckmark: {
    fontSize: 40,
    color: "#22C55E",
    fontWeight: "700",
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    color: colors.foregroundSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
