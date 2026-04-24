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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";
import { useStaffPermissions } from "../../hooks/useStaffPermissions";

type Patient = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  appointmentCount: number;
  lastAppointmentAt: string | null;
};

export default function SecretaryPatients() {
  const { permissions } = useStaffPermissions();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New patient form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDob, setNewDob] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api<Patient[]>("/api/doctor/patients", { noRedirect: true });
      setAll(list);
    } catch {
      setError("Impossible de charger les patients");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false)
    );
  }, [query, all]);

  async function createPatient() {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert("Champs requis", "Nom et téléphone obligatoires");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, string> = { name: newName.trim(), phone: newPhone.trim() };
      if (newEmail.trim()) body.email = newEmail.trim();
      if (newDob.trim()) body.dateOfBirth = newDob.trim();
      await api("/api/doctor/patients", { method: "POST", body, noRedirect: true });
      setShowNew(false);
      setNewName(""); setNewPhone(""); setNewEmail(""); setNewDob("");
      load();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      </SafeAreaView>
    );
  }

  // patients permission is explicitly false (not just undefined/null)
  if (permissions !== null && permissions?.patients === false) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Patients</Text>
        </View>
        <View style={styles.locked}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.border} />
          <Text style={styles.lockedTitle}>Accès restreint</Text>
          <Text style={styles.lockedText}>
            Votre accès à la liste des patients a été désactivé par le médecin.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
        {permissions?.patientsCreate && (
          <Pressable onPress={() => setShowNew(true)} style={styles.addBtn}>
            <Ionicons name="person-add-outline" size={18} color={colors.teal} />
          </Pressable>
        )}
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.foregroundSecondary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un patient…"
          placeholderTextColor={colors.foregroundSecondary}
        />
      </View>

      {error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={colors.border} />
              <Text style={styles.emptyText}>Aucun patient</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              onPress={() => router.push({ pathname: "/(secretary)/patient/[id]" as never, params: { id: item.id } })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{item.name}</Text>
                <Text style={styles.patientMeta}>{item.phone}</Text>
              </View>
              {item.appointmentCount > 0 && (
                <Text style={styles.apptCount}>{item.appointmentCount} RDV</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </Pressable>
          )}
        />
      )}

      {/* New patient modal — only shown when permission is granted */}
      <Modal visible={showNew && !!permissions?.patientsCreate} animationType="slide" transparent onRequestClose={() => setShowNew(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowNew(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Nouveau patient</Text>
          <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
            <Field label="Nom complet" value={newName} onChange={setNewName} placeholder="Karim Ben Ali" autoCapitalize="words" />
            <Field label="Téléphone" value={newPhone} onChange={setNewPhone} placeholder="22123456" keyboardType="phone-pad" />
            <Field label="Email (optionnel)" value={newEmail} onChange={setNewEmail} placeholder="email@..." keyboardType="email-address" autoCapitalize="none" />
            <Field label="Date de naissance (JJ/MM/AAAA)" value={newDob} onChange={setNewDob} placeholder="01/01/1990" keyboardType="numeric" maxLength={10} />
            <Pressable
              style={({ pressed }) => [styles.createBtn, (creating || pressed) && { opacity: 0.75 }]}
              onPress={createPatient}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createBtnText}>Créer le patient</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, autoCapitalize, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  maxLength?: number;
}) {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.foregroundSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: 12, fontWeight: "600", color: colors.foregroundSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.foreground,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  addBtn: { padding: spacing.sm },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing["3xl"] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  patientName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  patientMeta: { fontSize: 12, color: colors.foregroundSecondary },
  apptCount: { fontSize: 12, color: colors.foregroundSecondary },
  locked: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing["2xl"] },
  lockedTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  lockedText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center", lineHeight: 20 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing["3xl"] },
  emptyText: { fontSize: 15, color: colors.foregroundSecondary },
  retryBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { color: "#FFF", fontWeight: "700" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii["3xl"],
    borderTopRightRadius: radii["3xl"],
    padding: spacing.xl,
    paddingBottom: spacing["3xl"],
    gap: spacing.md,
    maxHeight: "85%",
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: radii.full, alignSelf: "center", marginBottom: spacing.sm },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  createBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  createBtnText: { color: "#FFF", fontWeight: "700" },
});
