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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

// Doctor patients list. Tapping a row pushes the fiche route — the detail
// is now its own screen at /(doctor)/patients/[id] rather than a Modal.
// Creating a patient still happens inline via the "+" Modal.
export default function PatientsScreen() {
  useLocale();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
          <Pressable style={styles.addBtn} onPress={() => setShowNewPatient(true)}>
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
          <PatientRow
            patient={item}
            onPress={() =>
              router.push({
                pathname: "/(doctor)/patients/[id]",
                params: { id: item.id, name: item.name },
              })
            }
          />
        )}
      />

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
            <Text style={styles.rowStatText}>
              {patient.appointmentCount} {t("doctor.patients.rdv")}
            </Text>
          </View>
          {patient.noShowCount > 0 && (
            <View style={[styles.rowStat, styles.rowStatWarn]}>
              <Text style={styles.rowStatTextWarn}>
                ⚠{" "}
                {patient.noShowCount > 1
                  ? t("doctor.patients.noShowCountPlural", { count: patient.noShowCount })
                  : t("doctor.patients.noShowCount", { count: patient.noShowCount })}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.foregroundSecondary} />
    </Pressable>
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  modalClose: {
    height: 36,
    width: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  saveBtn: { backgroundColor: colors.teal },

  formScroll: { padding: spacing.lg, paddingBottom: spacing["2xl"] },
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
  formError: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
