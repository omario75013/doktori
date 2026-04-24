import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";
import { useStaffPermissions } from "../../../hooks/useStaffPermissions";

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: "M" | "F" | null;
  bloodType: string | null;
  cnamNumber: string | null;
  cin: string | null;
  nationality: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  heightCm: number | null;
  weightKg: number | null;
  noShowCount: number;
  lastMinuteCancelCount: number;
  createdAt: string;
};

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  reason: string | null;
};

type ServerPermissions = Record<string, boolean> | null;

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-TN", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmé",
    cancelled: "Annulé",
    completed: "Terminé",
    no_show: "Absent",
    archived: "Archivé",
  };
  return map[s] ?? s;
}

function statusColor(s: string) {
  if (s === "confirmed") return colors.teal;
  if (s === "completed") return "#22c55e";
  if (s === "cancelled" || s === "no_show") return colors.danger;
  return colors.foregroundSecondary;
}

export default function SecretaryPatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { permissions } = useStaffPermissions();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serverPerms, setServerPerms] = useState<ServerPermissions>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState<"M" | "F" | "">("");
  const [editCin, setEditCin] = useState("");
  const [editNationality, setEditNationality] = useState("");
  const [editStreet, setEditStreet] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPostal, setEditPostal] = useState("");
  const [editOccupation, setEditOccupation] = useState("");
  const [editCnam, setEditCnam] = useState("");
  const [editInsProvider, setEditInsProvider] = useState("");
  const [editInsNumber, setEditInsNumber] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editEmergencyRelation, setEditEmergencyRelation] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ patient: Patient; appointments: Appointment[]; viewerPermissions: ServerPermissions }>(
        `/api/patients/${id}`,
        { noRedirect: true }
      );
      setPatient(res.patient);
      setAppointments(res.appointments);
      setServerPerms(res.viewerPermissions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function startEdit() {
    if (!patient) return;
    setEditName(patient.name);
    setEditPhone(patient.phone);
    setEditEmail(patient.email ?? "");
    setEditDob(patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "");
    setEditGender(patient.gender ?? "");
    setEditCin(patient.cin ?? "");
    setEditNationality(patient.nationality ?? "");
    setEditStreet(patient.addressStreet ?? "");
    setEditCity(patient.addressCity ?? "");
    setEditPostal(patient.addressPostalCode ?? "");
    setEditOccupation(patient.occupation ?? "");
    setEditCnam(patient.cnamNumber ?? "");
    setEditInsProvider(patient.insuranceProvider ?? "");
    setEditInsNumber(patient.insuranceNumber ?? "");
    setEditEmergencyName(patient.emergencyContactName ?? "");
    setEditEmergencyPhone(patient.emergencyContactPhone ?? "");
    setEditEmergencyRelation(patient.emergencyContactRelation ?? "");
    setEditHeight(patient.heightCm ? String(patient.heightCm) : "");
    setEditWeight(patient.weightKg ? String(patient.weightKg) : "");
    setEditing(true);
  }

  async function save() {
    if (!editName.trim() || !editPhone.trim()) {
      Alert.alert("Champs requis", "Nom et téléphone obligatoires");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string | number | null> = {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        dateOfBirth: editDob.trim() || null,
        gender: editGender || null,
        cin: editCin.trim() || null,
        nationality: editNationality.trim() || null,
        addressStreet: editStreet.trim() || null,
        addressCity: editCity.trim() || null,
        addressPostalCode: editPostal.trim() || null,
        occupation: editOccupation.trim() || null,
        cnamNumber: editCnam.trim() || null,
        insuranceProvider: editInsProvider.trim() || null,
        insuranceNumber: editInsNumber.trim() || null,
        emergencyContactName: editEmergencyName.trim() || null,
        emergencyContactPhone: editEmergencyPhone.trim() || null,
        emergencyContactRelation: editEmergencyRelation.trim() || null,
        heightCm: editHeight.trim() ? Number(editHeight.trim()) : null,
        weightKg: editWeight.trim() ? Number(editWeight.trim()) : null,
      };
      const res = await api<{ patient: Patient }>(`/api/patients/${id}`, {
        method: "PATCH",
        body,
        noRedirect: true,
      });
      setPatient((prev) => prev ? { ...prev, ...res.patient } : res.patient);
      setEditing(false);
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Supprimer le patient ?",
      "Les rendez-vous futurs seront supprimés. L'historique est conservé.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api(`/api/patients/${id}`, { method: "DELETE", noRedirect: true });
              router.back();
            } catch (e) {
              Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur");
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  const canEdit = (permissions?.patientsEdit ?? false) || (serverPerms?.patientsEdit ?? false);
  const canDelete = (permissions?.patientsDelete ?? false) || (serverPerms?.patientsDelete ?? false);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      </SafeAreaView>
    );
  }

  if (error || !patient) {
    return (
      <SafeAreaView edges={["top"]} style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={s.errorState}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
          <Text style={s.errorText}>{error ?? "Patient introuvable"}</Text>
          <Pressable onPress={load} style={s.retryBtn}>
            <Text style={s.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const initials = patient.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <SafeAreaView edges={["top"]} style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{patient.name}</Text>
        <View style={s.headerActions}>
          {canEdit && !editing && (
            <Pressable onPress={startEdit} hitSlop={8} style={s.headerBtn}>
              <Ionicons name="pencil-outline" size={20} color={colors.teal} />
            </Pressable>
          )}
          {canDelete && (
            <Pressable onPress={confirmDelete} hitSlop={8} style={s.headerBtn} disabled={deleting}>
              {deleting
                ? <ActivityIndicator size="small" color={colors.danger} />
                : <Ionicons name="trash-outline" size={20} color={colors.danger} />}
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Avatar + name */}
        <View style={s.profileBlock}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.profileName}>{patient.name}</Text>
          <Text style={s.profileSub}>{patient.phone}</Text>
          <View style={s.statRow}>
            <View style={s.statChip}>
              <Ionicons name="calendar-outline" size={12} color={colors.foregroundSecondary} />
              <Text style={s.statText}>{appointments.length} RDV</Text>
            </View>
            {patient.noShowCount > 0 && (
              <View style={[s.statChip, { borderColor: colors.danger + "55" }]}>
                <Text style={[s.statText, { color: colors.danger }]}>{patient.noShowCount} absent{patient.noShowCount > 1 ? "s" : ""}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Edit form */}
        {editing ? (
          <View style={{ gap: spacing.xl }}>
            {/* Section: Identité */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Identité</Text>
              <View style={s.card}>
                <EditField label="Nom complet" value={editName} onChange={setEditName} autoCapitalize="words" />
                <View style={s.divider} />
                <EditField label="Date de naissance (AAAA-MM-JJ)" value={editDob} onChange={setEditDob} placeholder="1990-01-01" />
                <View style={s.divider} />
                <EditField label="CIN" value={editCin} onChange={setEditCin} placeholder="XXXXXXXX" />
                <View style={s.divider} />
                <EditField label="Nationalité" value={editNationality} onChange={setEditNationality} placeholder="Tunisienne" autoCapitalize="words" />
                <View style={s.divider} />
                <View style={s.editField}>
                  <Text style={s.editFieldLabel}>Genre</Text>
                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: 4 }}>
                    {(["M", "F"] as const).map((g) => (
                      <Pressable
                        key={g}
                        onPress={() => setEditGender(editGender === g ? "" : g)}
                        style={[s.genderBtn, editGender === g && s.genderBtnActive]}
                      >
                        <Text style={[s.genderBtnText, editGender === g && { color: "#FFF" }]}>{g === "M" ? "Homme" : "Femme"}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Section: Contact */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Contact</Text>
              <View style={s.card}>
                <EditField label="Téléphone" value={editPhone} onChange={setEditPhone} keyboardType="phone-pad" />
                <View style={s.divider} />
                <EditField label="Email" value={editEmail} onChange={setEditEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Optionnel" />
                <View style={s.divider} />
                <EditField label="Rue" value={editStreet} onChange={setEditStreet} placeholder="Adresse" />
                <View style={s.divider} />
                <EditField label="Ville" value={editCity} onChange={setEditCity} />
                <View style={s.divider} />
                <EditField label="Code postal" value={editPostal} onChange={setEditPostal} keyboardType="numeric" />
                <View style={s.divider} />
                <EditField label="Profession" value={editOccupation} onChange={setEditOccupation} placeholder="Optionnel" autoCapitalize="words" />
              </View>
            </View>

            {/* Section: Assurance */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Assurance</Text>
              <View style={s.card}>
                <EditField label="N° CNAM" value={editCnam} onChange={setEditCnam} placeholder="Optionnel" />
                <View style={s.divider} />
                <EditField label="Assureur" value={editInsProvider} onChange={setEditInsProvider} placeholder="CNAM, CNRPS…" />
                <View style={s.divider} />
                <EditField label="N° assurance" value={editInsNumber} onChange={setEditInsNumber} placeholder="Optionnel" />
              </View>
            </View>

            {/* Section: Contact d'urgence */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Contact d'urgence</Text>
              <View style={s.card}>
                <EditField label="Nom" value={editEmergencyName} onChange={setEditEmergencyName} autoCapitalize="words" />
                <View style={s.divider} />
                <EditField label="Téléphone" value={editEmergencyPhone} onChange={setEditEmergencyPhone} keyboardType="phone-pad" />
                <View style={s.divider} />
                <EditField label="Lien" value={editEmergencyRelation} onChange={setEditEmergencyRelation} placeholder="Époux, parent…" autoCapitalize="words" />
              </View>
            </View>

            {/* Section: Morphologie */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Morphologie</Text>
              <View style={s.card}>
                <EditField label="Taille (cm)" value={editHeight} onChange={setEditHeight} keyboardType="numeric" placeholder="175" />
                <View style={s.divider} />
                <EditField label="Poids (kg)" value={editWeight} onChange={setEditWeight} keyboardType="numeric" placeholder="70" />
              </View>
            </View>

            <View style={s.editButtons}>
              <Pressable onPress={() => setEditing(false)} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable onPress={save} style={[s.saveBtn, saving && { opacity: 0.7 }]} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={s.saveBtnText}>Enregistrer</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          /* Info display — full general info like desktop version */
          <View style={{ gap: spacing.xl }}>
            {/* Identité */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Identité</Text>
              <View style={s.card}>
                <InfoRow icon="person-outline" label="Nom" value={patient.name} />
                <View style={s.divider} />
                <InfoRow icon="calendar-outline" label="Date de naissance" value={formatDate(patient.dateOfBirth)} />
                <View style={s.divider} />
                <InfoRow icon="card-outline" label="CIN" value={patient.cin ?? "—"} />
                <View style={s.divider} />
                <InfoRow icon="globe-outline" label="Nationalité" value={patient.nationality ?? "—"} />
                <View style={s.divider} />
                <InfoRow icon="person-outline" label="Genre" value={patient.gender === "M" ? "Homme" : patient.gender === "F" ? "Femme" : "—"} />
              </View>
            </View>

            {/* Contact */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Contact</Text>
              <View style={s.card}>
                <InfoRow icon="call-outline" label="Téléphone" value={patient.phone} />
                <View style={s.divider} />
                <InfoRow icon="mail-outline" label="Email" value={patient.email ?? "—"} />
                <View style={s.divider} />
                <InfoRow icon="location-outline" label="Adresse" value={[patient.addressStreet, patient.addressPostalCode, patient.addressCity].filter(Boolean).join(", ") || "—"} />
                {patient.occupation && (
                  <>
                    <View style={s.divider} />
                    <InfoRow icon="briefcase-outline" label="Profession" value={patient.occupation} />
                  </>
                )}
              </View>
            </View>

            {/* Assurance */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Assurance</Text>
              <View style={s.card}>
                <InfoRow icon="document-text-outline" label="N° CNAM" value={patient.cnamNumber ?? "—"} />
                <View style={s.divider} />
                <InfoRow icon="shield-outline" label="Assureur" value={patient.insuranceProvider ?? "—"} />
                <View style={s.divider} />
                <InfoRow icon="document-outline" label="N° assurance" value={patient.insuranceNumber ?? "—"} />
              </View>
            </View>

            {/* Contact d'urgence */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Contact d'urgence</Text>
              <View style={s.card}>
                <InfoRow icon="person-outline" label="Nom" value={patient.emergencyContactName ?? "—"} />
                <View style={s.divider} />
                <InfoRow icon="call-outline" label="Téléphone" value={patient.emergencyContactPhone ?? "—"} />
                <View style={s.divider} />
                <InfoRow icon="people-outline" label="Lien" value={patient.emergencyContactRelation ?? "—"} />
              </View>
            </View>

            {/* Morphologie */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>Morphologie</Text>
              <View style={s.card}>
                <InfoRow icon="water-outline" label="Groupe sanguin" value={patient.bloodType ?? "—"} />
                <View style={s.divider} />
                <InfoRow icon="resize-outline" label="Taille" value={patient.heightCm ? `${patient.heightCm} cm` : "—"} />
                <View style={s.divider} />
                <InfoRow icon="barbell-outline" label="Poids" value={patient.weightKg ? `${patient.weightKg} kg` : "—"} />
              </View>
            </View>
          </View>
        )}

        {/* Appointment history */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Historique des rendez-vous</Text>
          {appointments.length === 0 ? (
            <View style={s.emptyAppts}>
              <Text style={s.emptyApptText}>Aucun rendez-vous</Text>
            </View>
          ) : (
            <View style={s.card}>
              {appointments.slice(0, 10).map((appt, i) => (
                <View key={appt.id}>
                  {i > 0 && <View style={s.divider} />}
                  <View style={s.apptRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.apptDate}>{formatDate(appt.startsAt)}</Text>
                      {appt.reason && <Text style={s.apptReason} numberOfLines={1}>{appt.reason}</Text>}
                    </View>
                    <View style={[s.statusBadge, { borderColor: statusColor(appt.status) + "66" }]}>
                      <Text style={[s.statusText, { color: statusColor(appt.status) }]}>{statusLabel(appt.status)}</Text>
                    </View>
                  </View>
                </View>
              ))}
              {appointments.length > 10 && (
                <View style={s.moreRow}>
                  <Text style={s.moreText}>+{appointments.length - 10} autres rendez-vous</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Since */}
        <Text style={s.since}>Patient depuis {formatDate(patient.createdAt)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={16} color={colors.teal} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function EditField({
  label, value, onChange, placeholder, keyboardType, autoCapitalize,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
}) {
  return (
    <View style={s.editField}>
      <Text style={s.editFieldLabel}>{label}</Text>
      <TextInput
        style={s.editFieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.foregroundSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.foreground },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerBtn: { padding: spacing.xs },

  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing["3xl"] },

  profileBlock: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  avatar: {
    width: 72, height: 72, borderRadius: radii.full,
    backgroundColor: colors.teal, alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontWeight: "700", fontSize: 22 },
  profileName: { fontSize: 20, fontWeight: "700", color: colors.foreground },
  profileSub: { fontSize: 14, color: colors.foregroundSecondary },
  statRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  statChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radii.full, borderWidth: 1, borderColor: colors.border,
  },
  statText: { fontSize: 11, fontWeight: "600", color: colors.foregroundSecondary },

  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: colors.border },

  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md },
  infoLabel: { fontSize: 11, color: colors.foregroundSecondary },
  infoValue: { fontSize: 14, fontWeight: "600", color: colors.foreground, marginTop: 1 },

  editField: { gap: 4, padding: spacing.md },
  editFieldLabel: { fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  genderBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, alignItems: "center",
  },
  genderBtnActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  genderBtnText: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  editFieldInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    fontSize: 15, color: colors.foreground,
  },
  editButtons: { flexDirection: "row", gap: spacing.md },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  saveBtn: {
    flex: 2, backgroundColor: colors.teal,
    borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },

  apptRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, gap: spacing.sm,
  },
  apptDate: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  apptReason: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radii.full, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  moreRow: { padding: spacing.md, alignItems: "center" },
  moreText: { fontSize: 12, color: colors.foregroundSecondary },

  emptyAppts: {
    backgroundColor: colors.bgSecondary, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl, alignItems: "center",
  },
  emptyApptText: { fontSize: 14, color: colors.foregroundSecondary },

  since: { textAlign: "center", fontSize: 12, color: colors.border, paddingBottom: spacing.sm },

  errorState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  errorText: { fontSize: 15, color: colors.foregroundSecondary },
  retryBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { color: "#FFF", fontWeight: "700" },
});
