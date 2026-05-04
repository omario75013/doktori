import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  cin: string | null;
  cnamNumber: string | null;
  noShowCount: number;
  lastMinuteCancelCount: number;
  appointmentCount: number;
  lastAppointmentAt: string | null;
};

type PatientDetail = {
  patient: Patient & {
    insuranceProvider: string | null;
    insuranceNumber: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    heightCm: number | null;
    weightKg: string | number | null;
    occupation: string | null;
    addressStreet: string | null;
    addressCity: string | null;
    nationality: string | null;
  };
  appointments: Array<{
    id: string;
    startsAt: string;
    status: string;
    reason: string | null;
  }>;
  medical: {
    allergies: string | null;
    chronicConditions: string | null;
    currentMeds: string | null;
    notes: string | null;
  } | null;
};

export default function PatientsScreen() {
  const { locale } = useLocale();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api<Patient[]>("/api/doctor/patients");
      setAll(list);
    } catch (e) {
      console.warn("patients load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false) ||
        (p.cin?.includes(q) ?? false)
    );
  }, [query, all]);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("doctor.patients.title")}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.count}>
            {filtered.length} / {all.length}
          </Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => setShowNewPatient(true)}
          >
            <Ionicons name="add" size={22} color={colors.teal} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.foregroundSecondary} />
        <TextInput
          placeholder={t("doctor.patients.searchPlaceholder")}
          placeholderTextColor={colors.foregroundSecondary}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.foregroundSecondary} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.teal}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={32} color={colors.foregroundSecondary} />
            <Text style={styles.emptyText}>
              {query ? t("doctor.patients.noResults") : t("doctor.patients.noPatients")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PatientRow patient={item} onPress={() => setSelectedId(item.id)} />
        )}
      />

      <Modal
        visible={!!selectedId}
        animationType="slide"
        onRequestClose={() => setSelectedId(null)}
      >
        {selectedId && (
          <PatientDetailView
            patientId={selectedId}
            onClose={() => setSelectedId(null)}
            onChanged={load}
          />
        )}
      </Modal>

      <Modal
        visible={showNewPatient}
        animationType="slide"
        onRequestClose={() => setShowNewPatient(false)}
      >
        <NewPatientModal
          onClose={() => setShowNewPatient(false)}
          onCreated={async () => {
            setShowNewPatient(false);
            await load();
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}

function NewPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) {
      setError(t("doctor.patients.nameRequired"));
      return;
    }
    if (!phone.trim()) {
      setError(t("doctor.patients.phoneRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api("/api/doctor/patients", {
        method: "POST",
        body: {
          name: name.trim(),
          phone: phone.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(dateOfBirth.trim() ? { dateOfBirth: dateOfBirth.trim() } : {}),
        },
      });
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("doctor.patients.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.detailHead}>
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.detailTitle}>{t("doctor.patients.newPatient")}</Text>
        <Pressable
          onPress={handleSubmit}
          style={[styles.modalClose, styles.saveBtn]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.formScroll}>
        {error && <Text style={styles.formError}>{error}</Text>}

        <Text style={styles.formLabel}>{t("doctor.patients.fieldName")} *</Text>
        <TextInput
          style={styles.formInput}
          value={name}
          onChangeText={setName}
          placeholder={t("doctor.patients.namePlaceholder")}
          placeholderTextColor={colors.foregroundSecondary}
          autoCapitalize="words"
        />

        <Text style={styles.formLabel}>{t("doctor.patients.fieldPhone")} *</Text>
        <TextInput
          style={styles.formInput}
          value={phone}
          onChangeText={setPhone}
          placeholder={t("doctor.patients.phonePlaceholder")}
          placeholderTextColor={colors.foregroundSecondary}
          keyboardType="phone-pad"
        />

        <Text style={styles.formLabel}>Email</Text>
        <TextInput
          style={styles.formInput}
          value={email}
          onChangeText={setEmail}
          placeholder={t("doctor.patients.emailPlaceholder")}
          placeholderTextColor={colors.foregroundSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.formLabel}>{t("doctor.patients.dobLabel")}</Text>
        <TextInput
          style={styles.formInput}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder={t("doctor.patients.dobPlaceholder")}
          placeholderTextColor={colors.foregroundSecondary}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function EditPatientModal({
  data,
  onClose,
  onSaved,
}: {
  data: PatientDetail;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const p = data.patient;
  const m = data.medical;

  const [editTab, setEditTab] = useState<"infos" | "dossier" | "assurance">("infos");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Infos tab fields
  const [name, setName] = useState(p.name ?? "");
  const [phone, setPhone] = useState(p.phone ?? "");
  const [email, setEmail] = useState(p.email ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(p.dateOfBirth ?? "");
  const [gender, setGender] = useState<"M" | "F" | "">(
    p.gender === "M" || p.gender === "F" ? p.gender : ""
  );
  const [cin, setCin] = useState(p.cin ?? "");
  const [nationality, setNationality] = useState(p.nationality ?? "");

  // Dossier tab fields
  const [allergies, setAllergies] = useState(m?.allergies ?? "");
  const [chronicConditions, setChronicConditions] = useState(m?.chronicConditions ?? "");
  const [currentMeds, setCurrentMeds] = useState(m?.currentMeds ?? "");
  const [notes, setNotes] = useState(m?.notes ?? "");

  // Assurance tab fields
  const [cnamNumber, setCnamNumber] = useState(p.cnamNumber ?? "");
  const [insuranceProvider, setInsuranceProvider] = useState(p.insuranceProvider ?? "");
  const [insuranceNumber, setInsuranceNumber] = useState(p.insuranceNumber ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    p.emergencyContactName ?? ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    p.emergencyContactPhone ?? ""
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const topLevel: Record<string, string | undefined> = {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        gender: gender || undefined,
        cin: cin.trim() || undefined,
        nationality: nationality.trim() || undefined,
        cnamNumber: cnamNumber.trim() || undefined,
        insuranceProvider: insuranceProvider.trim() || undefined,
        insuranceNumber: insuranceNumber.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      };

      // Remove undefined keys
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(topLevel)) {
        if (v !== undefined) body[k] = v;
      }

      const medicalPayload: Record<string, string> = {};
      if (allergies.trim()) medicalPayload.allergies = allergies.trim();
      if (chronicConditions.trim()) medicalPayload.chronicConditions = chronicConditions.trim();
      if (currentMeds.trim()) medicalPayload.currentMeds = currentMeds.trim();
      if (notes.trim()) medicalPayload.notes = notes.trim();
      if (Object.keys(medicalPayload).length > 0) {
        body.medical = medicalPayload;
      }

      await api(`/api/patients/${p.id}`, {
        method: "PATCH",
        body,
      });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  const editTabs: Array<{ id: "infos" | "dossier" | "assurance"; label: string }> = [
    { id: "infos", label: t("doctor.patients.tabInfo") },
    { id: "dossier", label: t("doctor.patients.tabRecord") },
    { id: "assurance", label: t("doctor.patients.tabInsurance") },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.detailHead}>
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.detailTitle} numberOfLines={1}>
          {t("common.edit")} {p.name}
        </Text>
        <Pressable
          onPress={handleSave}
          style={[styles.modalClose, styles.saveBtn]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {error && <Text style={styles.formErrorBanner}>{error}</Text>}

      <View style={styles.tabs}>
        {editTabs.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setEditTab(t.id)}
            style={[styles.tab, editTab === t.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, editTab === t.id && { color: "#FFFFFF" }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.formScroll}>
        {editTab === "infos" && (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>{t("doctor.patients.fieldName")}</Text>
            <TextInput
              style={styles.formInput}
              value={name}
              onChangeText={setName}
              placeholder={t("doctor.patients.namePlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.formLabel}>{t("doctor.patients.fieldPhone")}</Text>
            <TextInput
              style={styles.formInput}
              value={phone}
              onChangeText={setPhone}
              placeholder={t("doctor.patients.phonePlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              keyboardType="phone-pad"
            />

            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.formInput}
              value={email}
              onChangeText={setEmail}
              placeholder={t("doctor.patients.emailPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.formLabel}>{t("doctor.patients.dobLabel")}</Text>
            <TextInput
              style={styles.formInput}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder={t("doctor.patients.dobPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
            />

            <Text style={styles.formLabel}>{t("doctor.patients.fieldGender")}</Text>
            <View style={styles.genderRow}>
              <Pressable
                style={[styles.genderBtn, gender === "M" && styles.genderBtnActive]}
                onPress={() => setGender(gender === "M" ? "" : "M")}
              >
                <Text
                  style={[styles.genderBtnText, gender === "M" && styles.genderBtnTextActive]}
                >
                  {t("doctor.patients.genderMale")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.genderBtn, gender === "F" && styles.genderBtnActive]}
                onPress={() => setGender(gender === "F" ? "" : "F")}
              >
                <Text
                  style={[styles.genderBtnText, gender === "F" && styles.genderBtnTextActive]}
                >
                  {t("doctor.patients.genderFemale")}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.formLabel}>{t("doctor.patients.fieldCin")}</Text>
            <TextInput
              style={styles.formInput}
              value={cin}
              onChangeText={setCin}
              placeholder={t("doctor.patients.cinPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
            />

            <Text style={styles.formLabel}>{t("doctor.patients.fieldNationality")}</Text>
            <TextInput
              style={styles.formInput}
              value={nationality}
              onChangeText={setNationality}
              placeholder={t("doctor.patients.nationalityDefault")}
              placeholderTextColor={colors.foregroundSecondary}
              autoCapitalize="words"
            />
          </View>
        )}

        {editTab === "dossier" && (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>{t("doctor.patients.fieldAllergies")}</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={allergies}
              onChangeText={setAllergies}
              placeholder={t("doctor.patients.allergiesPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>{t("doctor.patients.fieldChronicDiseases")}</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={chronicConditions}
              onChangeText={setChronicConditions}
              placeholder={t("doctor.patients.chronicPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>{t("doctor.patients.fieldTreatments")}</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={currentMeds}
              onChangeText={setCurrentMeds}
              placeholder={t("doctor.patients.treatmentsPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>{t("doctor.patients.fieldNotes")}</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t("doctor.patients.notesPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        {editTab === "assurance" && (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>{t("doctor.patients.fieldCnam")}</Text>
            <TextInput
              style={styles.formInput}
              value={cnamNumber}
              onChangeText={setCnamNumber}
              placeholder={t("doctor.patients.cnamPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
            />

            <Text style={styles.formLabel}>{t("doctor.patients.fieldInsurer")}</Text>
            <TextInput
              style={styles.formInput}
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}
              placeholder={t("doctor.patients.insurerPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
            />

            <Text style={styles.formLabel}>{t("doctor.patients.fieldInsuranceNo")}</Text>
            <TextInput
              style={styles.formInput}
              value={insuranceNumber}
              onChangeText={setInsuranceNumber}
              placeholder={t("doctor.patients.insuranceNoPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
            />

            <Text style={styles.formLabel}>{t("doctor.patients.emergencyContactName")}</Text>
            <TextInput
              style={styles.formInput}
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder={t("doctor.patients.namePlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.formLabel}>{t("doctor.patients.emergencyContactPhone")}</Text>
            <TextInput
              style={styles.formInput}
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              placeholder={t("doctor.patients.phonePlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              keyboardType="phone-pad"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PatientRow({ patient, onPress }: { patient: Patient; onPress: () => void }) {
  const initials = patient.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{patient.name}</Text>
        <Text style={[styles.rowSub, { writingDirection: "ltr" }]} numberOfLines={1}>
          {patient.phone}
          {patient.email ? ` · ${patient.email}` : ""}
        </Text>
        <View style={styles.rowBadges}>
          <View style={styles.rowStat}>
            <Ionicons name="calendar-outline" size={11} color={colors.foregroundSecondary} />
            <Text style={styles.rowStatText}>{patient.appointmentCount} {t("doctor.patients.rdv")}</Text>
          </View>
          {patient.noShowCount > 0 && (
            <View style={[styles.rowStat, styles.rowStatWarn]}>
              <Text style={styles.rowStatTextWarn}>
                ⚠ {patient.noShowCount > 1 ? t("doctor.patients.noShowCountPlural", { count: patient.noShowCount }) : t("doctor.patients.noShowCount", { count: patient.noShowCount })}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.foregroundSecondary} />
    </Pressable>
  );
}

function PatientDetailView({
  patientId,
  onClose,
  onChanged,
}: {
  patientId: string;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [data, setData] = useState<PatientDetail | null>(null);
  const [tab, setTab] = useState<"infos" | "dossier" | "rdv">("infos");
  const [showEdit, setShowEdit] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const res = await api<PatientDetail>(`/api/patients/${patientId}`);
      setData(res);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
      onClose();
    }
  }, [patientId, onClose]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (!data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  const p = data.patient;
  const age = p.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(p.dateOfBirth).getTime()) /
          (365.25 * 24 * 3600 * 1000)
      )
    : null;

  async function deletePatient() {
    Alert.alert(t("doctor.patients.deletePatient"), t("doctor.patients.deleteConfirm", { name: p.name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/patients/${patientId}`, { method: "DELETE" });
            await onChanged();
            onClose();
          } catch (e) {
            Alert.alert(t("common.error"), e instanceof Error ? e.message : t("doctor.patients.deleteFailed"));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.detailHead}>
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.detailTitle} numberOfLines={1}>
          {p.name}
        </Text>
        <View style={styles.detailHeadActions}>
          <Pressable onPress={() => setShowEdit(true)} style={styles.modalClose}>
            <Ionicons name="create-outline" size={18} color={colors.teal} />
          </Pressable>
          <Pressable onPress={deletePatient} style={styles.modalClose}>
            <Ionicons name="trash" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <View style={styles.detailMeta}>
        <Text style={[styles.detailMetaText, { writingDirection: "ltr" }]}>
          {p.phone}
          {age !== null ? ` · ${age} ans` : ""}
          {p.gender ? ` · ${p.gender === "M" ? t("doctor.patients.genderMale") : t("doctor.patients.genderFemale")}` : ""}
        </Text>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { id: "infos" as const, label: t("doctor.patients.tabInfo"), icon: "person" as const },
            { id: "dossier" as const, label: t("doctor.patients.tabRecord"), icon: "document-text" as const },
            { id: "rdv" as const, label: t("doctor.patients.rdv"), icon: "calendar" as const },
          ]
        ).map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[styles.tab, tab === t.id && styles.tabActive]}
          >
            <Ionicons
              name={t.icon}
              size={14}
              color={tab === t.id ? "#FFFFFF" : colors.foreground}
            />
            <Text style={[styles.tabText, tab === t.id && { color: "#FFFFFF" }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.detailScroll}>
        {tab === "infos" && (
          <View style={{ gap: spacing.md }}>
            <DetailCard title={t("doctor.patients.sectionIdentity")}>
              <Kv label={t("doctor.patients.fieldName")} value={p.name} />
              <Kv
                label={t("doctor.patients.sectionDob")}
                value={
                  p.dateOfBirth
                    ? new Date(p.dateOfBirth).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"
                }
              />
              <Kv label={t("doctor.patients.fieldCin")} value={p.cin ?? "—"} mono />
              <Kv label={t("doctor.patients.fieldNationality")} value={p.nationality ?? "—"} />
            </DetailCard>

            <DetailCard title={t("doctor.patients.sectionContact")}>
              <Kv label={t("doctor.patients.fieldPhone")} value={p.phone} mono ltr />
              <Kv label="Email" value={p.email ?? "—"} />
              <Kv
                label={t("doctor.patients.sectionAddress")}
                value={
                  [p.addressStreet, p.addressCity].filter(Boolean).join(", ") || "—"
                }
              />
            </DetailCard>

            <DetailCard title={t("doctor.patients.tabInsurance")}>
              <Kv label={t("doctor.patients.fieldCnam")} value={p.cnamNumber ?? "—"} mono />
              <Kv label={t("doctor.patients.fieldInsurer")} value={p.insuranceProvider ?? "—"} />
              <Kv label={t("doctor.patients.fieldInsuranceNo")} value={p.insuranceNumber ?? "—"} mono />
            </DetailCard>

            <DetailCard title={t("doctor.patients.emergencyContactName").split(" —")[0]}>
              <Kv label={t("doctor.patients.fieldName")} value={p.emergencyContactName ?? "—"} />
              <Kv label={t("doctor.patients.fieldPhone")} value={p.emergencyContactPhone ?? "—"} mono />
            </DetailCard>

            <DetailCard title={t("doctor.patients.sectionMorphology")}>
              <Kv label={t("doctor.patients.fieldBloodGroup")} value={p.bloodType ?? "—"} />
              <Kv label={t("doctor.patients.fieldHeight")} value={p.heightCm ? `${p.heightCm} cm` : "—"} />
              <Kv label={t("doctor.patients.fieldWeight")} value={p.weightKg ? `${p.weightKg} kg` : "—"} />
            </DetailCard>
          </View>
        )}

        {tab === "dossier" && (
          <View style={{ gap: spacing.md }}>
            <DetailCard title={t("doctor.patients.fieldAllergies")} highlight="red">
              <Text style={styles.medText}>
                {data.medical?.allergies || t("common.notProvided")}
              </Text>
            </DetailCard>
            <DetailCard title={t("doctor.patients.fieldChronicDiseases")} highlight="orange">
              <Text style={styles.medText}>
                {data.medical?.chronicConditions || t("common.notProvided")}
              </Text>
            </DetailCard>
            <DetailCard title={t("doctor.patients.fieldTreatments")} highlight="blue">
              <Text style={styles.medText}>{data.medical?.currentMeds || t("common.notProvided")}</Text>
            </DetailCard>
            <DetailCard title={t("doctor.patients.fieldNotes")}>
              <Text style={styles.medText}>{data.medical?.notes || t("common.notProvided")}</Text>
            </DetailCard>
          </View>
        )}

        {tab === "rdv" && (
          <View style={{ gap: spacing.sm }}>
            {data.appointments.length === 0 ? (
              <Text style={styles.medText}>{t("doctor.patients.noAppointments")}</Text>
            ) : (
              data.appointments.map((a) => (
                <View key={a.id} style={styles.apptItem}>
                  <View style={styles.apptDateCol}>
                    <Text style={styles.apptDate}>
                      {new Date(a.startsAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </Text>
                    <Text style={styles.apptTime}>
                      {new Date(a.startsAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {a.reason && <Text style={styles.apptReason}>{a.reason}</Text>}
                    <Text style={styles.apptStatus}>{a.status}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showEdit}
        animationType="slide"
        onRequestClose={() => setShowEdit(false)}
      >
        <EditPatientModal
          data={data}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await loadDetail();
            await onChanged();
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}

function DetailCard({
  title,
  highlight,
  children,
}: {
  title: string;
  highlight?: "red" | "orange" | "blue";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    red: "#FECACA",
    orange: "#FED7AA",
    blue: "#BFDBFE",
  };
  return (
    <View
      style={[
        styles.card,
        highlight && { borderLeftWidth: 4, borderLeftColor: tones[highlight] },
      ]}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>{children}</View>
    </View>
  );
}

function Kv({
  label,
  value,
  mono,
  ltr,
}: {
  label: string;
  value: string;
  mono?: boolean;
  ltr?: boolean;
}) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, mono && { fontFamily: "monospace" }, ltr && { writingDirection: "ltr" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  count: { fontSize: 12, color: colors.foregroundSecondary },
  addBtn: {
    height: 36,
    width: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground, padding: 0 },
  list: { padding: spacing.lg, gap: spacing.sm },
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
  avatar: {
    height: 44,
    width: 44,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.teal, fontWeight: "800" },
  rowName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  rowSub: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  rowBadges: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  rowStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  rowStatText: { fontSize: 10, color: colors.foregroundSecondary, fontWeight: "600" },
  rowStatWarn: { backgroundColor: "#FECACA" },
  rowStatTextWarn: { fontSize: 10, color: "#991B1B", fontWeight: "700" },
  empty: { padding: spacing["2xl"], alignItems: "center", gap: spacing.sm },
  emptyText: { color: colors.foregroundSecondary, fontSize: 13 },

  detailHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  detailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  detailHeadActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  modalClose: {
    height: 36,
    width: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  saveBtn: {
    backgroundColor: colors.teal,
  },
  detailMeta: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  detailMetaText: { fontSize: 12, color: colors.foregroundSecondary },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  tabActive: { backgroundColor: colors.teal },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  detailScroll: { padding: spacing.lg, paddingBottom: spacing["2xl"] },

  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  kvLabel: { fontSize: 13, color: colors.foregroundSecondary },
  kvValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
    flex: 1,
    textAlign: "right",
  },
  medText: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
  apptItem: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  apptDateCol: { alignItems: "center", width: 60 },
  apptDate: { fontSize: 12, fontWeight: "700", color: colors.teal },
  apptTime: { fontSize: 11, color: colors.foregroundSecondary, fontFamily: "monospace" },
  apptReason: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  apptStatus: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },

  formScroll: { padding: spacing.lg, paddingBottom: spacing["2xl"] },
  formSection: { gap: spacing.sm },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.md,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bgSecondary,
  },
  formTextarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  formError: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  formErrorBanner: {
    color: colors.danger,
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
  },
  genderBtnActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  genderBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  genderBtnTextActive: {
    color: "#FFFFFF",
  },
});
