import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  BackHandler,
  Switch,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  cin: string | null;
  nationality: string | null;
  cnamNumber: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  heightCm: number | null;
  weightKg: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
};

type EditState = {
  name: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  cin: string;
  nationality: string;
  cnamNumber: string;
  insuranceProvider: string;
  insuranceNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  heightCm: string;
  weightKg: string;
  occupation: string;
  maritalStatus: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
};

async function getPatientToken(): Promise<string | null> {
  const SecureStore = await import("expo-secure-store").catch(() => null);
  return SecureStore ? SecureStore.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

function toEdit(p: Patient): EditState {
  return {
    name: p.name ?? "",
    email: p.email ?? "",
    dateOfBirth: p.dateOfBirth ?? "",
    gender: p.gender ?? "",
    bloodType: p.bloodType ?? "",
    cin: p.cin ?? "",
    nationality: p.nationality ?? "",
    cnamNumber: p.cnamNumber ?? "",
    insuranceProvider: p.insuranceProvider ?? "",
    insuranceNumber: p.insuranceNumber ?? "",
    emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactPhone: p.emergencyContactPhone ?? "",
    emergencyContactRelation: p.emergencyContactRelation ?? "",
    heightCm: p.heightCm != null ? String(p.heightCm) : "",
    weightKg: p.weightKg ?? "",
    occupation: p.occupation ?? "",
    maritalStatus: p.maritalStatus ?? "",
    addressStreet: p.addressStreet ?? "",
    addressCity: p.addressCity ?? "",
    addressPostalCode: p.addressPostalCode ?? "",
  };
}

const MARITAL_LABELS: Record<string, string> = {
  single: "Célibataire",
  married: "Marié(e)",
  divorced: "Divorcé(e)",
  widowed: "Veuf/Veuve",
};

const GENDER_LABELS: Record<string, string> = { M: "Homme", F: "Femme" };

export default function PatientProfil() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/(patient)/home" as never);
      return true;
    });
    return () => sub.remove();
  }, []);

  async function load() {
    try {
      const token = await getPatientToken();
      if (!token) { router.replace("/(auth)/patient-login"); return; }
      const p = await api<Patient>("/api/patients/me", { token });
      setPatient(p);
      setEdit(toEdit(p));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    if (patient) setEdit(toEdit(patient));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function set(field: keyof EditState) {
    return (val: string) => setEdit((e) => e ? { ...e, [field]: val } : e);
  }

  async function save() {
    if (!edit || !patient) return;
    setSaving(true);
    try {
      const token = await getPatientToken();
      const body: Record<string, unknown> = {
        name: edit.name.trim() || undefined,
        email: edit.email.trim() || null,
        dateOfBirth: edit.dateOfBirth.trim() || null,
        gender: (edit.gender as "M" | "F" | "") || null,
        bloodType: edit.bloodType.trim() || null,
        cin: edit.cin.trim() || null,
        nationality: edit.nationality.trim() || null,
        cnamNumber: edit.cnamNumber.trim() || null,
        insuranceProvider: edit.insuranceProvider.trim() || null,
        insuranceNumber: edit.insuranceNumber.trim() || null,
        emergencyContactName: edit.emergencyContactName.trim() || null,
        emergencyContactPhone: edit.emergencyContactPhone.trim() || null,
        emergencyContactRelation: edit.emergencyContactRelation.trim() || null,
        heightCm: edit.heightCm.trim() ? parseInt(edit.heightCm) : null,
        weightKg: edit.weightKg.trim() ? parseFloat(edit.weightKg) : null,
        occupation: edit.occupation.trim() || null,
        maritalStatus: (edit.maritalStatus as "single" | "married" | "divorced" | "widowed" | "") || null,
        addressStreet: edit.addressStreet.trim() || null,
        addressCity: edit.addressCity.trim() || null,
        addressPostalCode: edit.addressPostalCode.trim() || null,
      };
      // Remove undefined values
      for (const k of Object.keys(body)) {
        if (body[k] === undefined) delete body[k];
      }
      const updated = await api<Patient>("/api/patients/me", {
        method: "PATCH",
        token: token ?? undefined,
        body,
      });
      setPatient(updated);
      setEdit(toEdit(updated));
      setEditing(false);
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  function handleSOS() {
    Alert.alert(
      "Urgence",
      "Choisissez une action",
      [
        { text: "SAMU (190)", onPress: () => Linking.openURL("tel:190") },
        { text: "Ambulance (15)", onPress: () => Linking.openURL("tel:15") },
        { text: "Pompiers (1009)", onPress: () => Linking.openURL("tel:1009") },
        { text: "Annuler", style: "cancel" },
      ]
    );
  }

  async function logout() {
    Alert.alert("Se déconnecter ?", "Vous devrez vous reconnecter.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          const SS = await import("expo-secure-store");
          await SS.deleteItemAsync(PATIENT_TOKEN_KEY);
          router.replace("/(auth)/patient-login");
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={s.root}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      </SafeAreaView>
    );
  }

  const initials = patient?.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <SafeAreaView edges={["top"]} style={s.root}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Avatar header */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.patientName}>{patient?.name ?? "Profil"}</Text>
          <Text style={s.patientPhone}>{patient?.phone}</Text>
        </View>

        {/* ── IDENTITY ── */}
        <Section
          title="Identité"
          editing={editing}
          onEdit={startEdit}
          onCancel={cancelEdit}
          onSave={save}
          saving={saving}
        >
          {editing && edit ? (
            <>
              <Field label="Nom complet">
                <TextInput style={s.input} value={edit.name} onChangeText={set("name")} autoCapitalize="words" />
              </Field>
              <Field label="Email">
                <TextInput style={s.input} value={edit.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
              </Field>
              <Field label="CIN">
                <TextInput style={s.input} value={edit.cin} onChangeText={set("cin")} />
              </Field>
              <Field label="Date de naissance (AAAA-MM-JJ)">
                <TextInput style={s.input} value={edit.dateOfBirth} onChangeText={set("dateOfBirth")} placeholder="1990-01-15" keyboardType="numeric" />
              </Field>
              <Field label="Sexe">
                <View style={s.toggleRow}>
                  {(["M", "F"] as const).map((g) => (
                    <Pressable
                      key={g}
                      style={[s.toggleBtn, edit.gender === g && s.toggleBtnActive]}
                      onPress={() => set("gender")(edit.gender === g ? "" : g)}
                    >
                      <Text style={[s.toggleText, edit.gender === g && s.toggleTextActive]}>
                        {GENDER_LABELS[g]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
              <Field label="Nationalité">
                <TextInput style={s.input} value={edit.nationality} onChangeText={set("nationality")} />
              </Field>
              <Field label="Situation familiale">
                <View style={s.toggleRow}>
                  {(["single", "married", "divorced", "widowed"] as const).map((m) => (
                    <Pressable
                      key={m}
                      style={[s.toggleBtn, edit.maritalStatus === m && s.toggleBtnActive]}
                      onPress={() => set("maritalStatus")(edit.maritalStatus === m ? "" : m)}
                    >
                      <Text style={[s.toggleText, edit.maritalStatus === m && s.toggleTextActive]}>
                        {MARITAL_LABELS[m]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
              <Field label="Profession">
                <TextInput style={s.input} value={edit.occupation} onChangeText={set("occupation")} />
              </Field>
            </>
          ) : (
            <View style={s.infoCard}>
              <InfoRow icon="person-outline" label="Nom" value={patient?.name} />
              <InfoRow icon="call-outline" label="Téléphone" value={patient?.phone} />
              <InfoRow icon="mail-outline" label="Email" value={patient?.email} />
              <InfoRow icon="card-outline" label="CIN" value={patient?.cin} />
              <InfoRow icon="calendar-outline" label="Naissance" value={patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("fr-FR") : null} />
              <InfoRow icon="person-outline" label="Sexe" value={patient?.gender ? GENDER_LABELS[patient.gender] : null} />
              <InfoRow icon="flag-outline" label="Nationalité" value={patient?.nationality} />
              <InfoRow icon="heart-outline" label="Situation" value={patient?.maritalStatus ? MARITAL_LABELS[patient.maritalStatus] : null} />
              <InfoRow icon="briefcase-outline" label="Profession" value={patient?.occupation} />
            </View>
          )}
        </Section>

        {/* ── ADDRESS ── */}
        <Section title="Adresse" editing={editing} onEdit={startEdit} onCancel={cancelEdit} onSave={save} saving={saving} showButtons={false}>
          {editing && edit ? (
            <>
              <Field label="Rue">
                <TextInput style={s.input} value={edit.addressStreet} onChangeText={set("addressStreet")} />
              </Field>
              <Field label="Ville">
                <TextInput style={s.input} value={edit.addressCity} onChangeText={set("addressCity")} />
              </Field>
              <Field label="Code postal">
                <TextInput style={s.input} value={edit.addressPostalCode} onChangeText={set("addressPostalCode")} keyboardType="numeric" />
              </Field>
            </>
          ) : (
            <View style={s.infoCard}>
              <InfoRow icon="location-outline" label="Rue" value={patient?.addressStreet} />
              <InfoRow icon="business-outline" label="Ville" value={patient?.addressCity} />
              <InfoRow icon="mail-outline" label="Code postal" value={patient?.addressPostalCode} />
            </View>
          )}
        </Section>

        {/* ── MEDICAL BASICS ── */}
        <Section title="Informations médicales" editing={editing} onEdit={startEdit} onCancel={cancelEdit} onSave={save} saving={saving} showButtons={false}>
          {editing && edit ? (
            <>
              <Field label="Groupe sanguin">
                <View style={s.toggleRow}>
                  {(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const).map((bt) => (
                    <Pressable
                      key={bt}
                      style={[s.toggleBtn, edit.bloodType === bt && s.toggleBtnActive]}
                      onPress={() => set("bloodType")(edit.bloodType === bt ? "" : bt)}
                    >
                      <Text style={[s.toggleText, edit.bloodType === bt && s.toggleTextActive]}>{bt}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
              <Field label="Taille (cm)">
                <TextInput style={s.input} value={edit.heightCm} onChangeText={set("heightCm")} keyboardType="numeric" placeholder="170" />
              </Field>
              <Field label="Poids (kg)">
                <TextInput style={s.input} value={edit.weightKg} onChangeText={set("weightKg")} keyboardType="decimal-pad" placeholder="70" />
              </Field>
            </>
          ) : (
            <View style={s.infoCard}>
              <InfoRow icon="water-outline" label="Groupe sanguin" value={patient?.bloodType} />
              <InfoRow icon="resize-outline" label="Taille" value={patient?.heightCm ? `${patient.heightCm} cm` : null} />
              <InfoRow icon="scale-outline" label="Poids" value={patient?.weightKg ? `${patient.weightKg} kg` : null} />
            </View>
          )}
        </Section>

        {/* ── INSURANCE ── */}
        <Section title="Assurance / CNAM" editing={editing} onEdit={startEdit} onCancel={cancelEdit} onSave={save} saving={saving} showButtons={false}>
          {editing && edit ? (
            <>
              <Field label="N° CNAM">
                <TextInput style={s.input} value={edit.cnamNumber} onChangeText={set("cnamNumber")} />
              </Field>
              <Field label="Assurance">
                <TextInput style={s.input} value={edit.insuranceProvider} onChangeText={set("insuranceProvider")} />
              </Field>
              <Field label="N° Police">
                <TextInput style={s.input} value={edit.insuranceNumber} onChangeText={set("insuranceNumber")} />
              </Field>
            </>
          ) : (
            <View style={s.infoCard}>
              <InfoRow icon="card-outline" label="N° CNAM" value={patient?.cnamNumber} />
              <InfoRow icon="shield-outline" label="Assurance" value={patient?.insuranceProvider} />
              <InfoRow icon="document-outline" label="N° Police" value={patient?.insuranceNumber} />
            </View>
          )}
        </Section>

        {/* ── EMERGENCY CONTACT ── */}
        <Section title="Contact d'urgence" editing={editing} onEdit={startEdit} onCancel={cancelEdit} onSave={save} saving={saving} showButtons={false}>
          {editing && edit ? (
            <>
              <Field label="Nom">
                <TextInput style={s.input} value={edit.emergencyContactName} onChangeText={set("emergencyContactName")} autoCapitalize="words" />
              </Field>
              <Field label="Téléphone">
                <TextInput style={s.input} value={edit.emergencyContactPhone} onChangeText={set("emergencyContactPhone")} keyboardType="phone-pad" />
              </Field>
              <Field label="Lien de parenté">
                <TextInput style={s.input} value={edit.emergencyContactRelation} onChangeText={set("emergencyContactRelation")} placeholder="Ex: Conjoint, Parent" />
              </Field>
            </>
          ) : (
            <View style={s.infoCard}>
              <InfoRow icon="people-outline" label="Nom" value={patient?.emergencyContactName} />
              <InfoRow icon="call-outline" label="Téléphone" value={patient?.emergencyContactPhone} />
              <InfoRow icon="git-branch-outline" label="Lien" value={patient?.emergencyContactRelation} />
            </View>
          )}
        </Section>

        {/* ── NOTIFICATIONS ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Notifications</Text>
          <View style={s.infoCard}>
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Rappels de rendez-vous</Text>
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: colors.border, true: colors.teal }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </View>

        {/* ── SAVE BUTTON (when editing) ── */}
        {editing && (
          <View style={s.saveBarRow}>
            <Pressable style={s.cancelBar} onPress={cancelEdit}>
              <Text style={s.cancelBarText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[s.saveBar, saving && { opacity: 0.7 }]}
              onPress={save}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.saveBarText}>Enregistrer</Text>
              }
            </Pressable>
          </View>
        )}

        {/* ── SOS ── */}
        <Pressable
          style={({ pressed }) => [s.sosBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSOS}
        >
          <Ionicons name="warning" size={20} color="#FFF" />
          <Text style={s.sosBtnText}>SOS — Urgence</Text>
        </Pressable>

        {/* ── LOGOUT ── */}
        <Pressable
          style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.8 }]}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={s.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
  showButtons = true,
  children,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  showButtons?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
        {showButtons && !editing && (
          <Pressable onPress={onEdit}>
            <Text style={s.editBtn}>Modifier</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

// ─── InfoRow ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={15} color={colors.teal} style={{ width: 20 }} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing["3xl"] },

  avatarSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.teal,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  avatarText: { color: "#FFF", fontSize: 26, fontWeight: "800" },
  patientName: { color: "#FFF", fontSize: 20, fontWeight: "700" },
  patientPhone: { color: "rgba(255,255,255,0.8)", fontSize: 14 },

  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  editBtn: { fontSize: 14, fontWeight: "600", color: colors.teal },

  infoCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoLabel: { fontSize: 12, color: colors.foregroundSecondary, width: 95 },
  infoValue: { flex: 1, fontSize: 14, color: colors.foreground },

  field: { gap: spacing.xs, marginBottom: spacing.sm },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  toggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  toggleBtnActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  toggleText: { fontSize: 13, fontWeight: "600", color: colors.foregroundSecondary },
  toggleTextActive: { color: "#FFF" },

  saveBarRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  cancelBar: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelBarText: { fontSize: 15, fontWeight: "600", color: colors.foregroundSecondary },
  saveBar: {
    flex: 2,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveBarText: { color: "#FFF", fontWeight: "700", fontSize: 15 },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { fontSize: 14, color: colors.foreground },

  sosBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sosBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
  },
  logoutText: { color: colors.danger, fontWeight: "700", fontSize: 15 },
});
