import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
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

type Dependent = {
  id: string;
  name: string;
  dateOfBirth: string | null;
  gender: "M" | "F" | null;
  relation: string | null;
  createdAt: string;
};

type Relationship = "spouse" | "child" | "parent" | "sibling" | "other";
const RELATIONSHIPS: Relationship[] = ["spouse", "child", "parent", "sibling", "other"];

type FormState = {
  id?: string;
  firstName: string;
  lastName: string;
  relationship: Relationship;
  dob: string;
  gender: "M" | "F" | "";
  cin: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  relationship: "child",
  dob: "",
  gender: "",
  cin: "",
};

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

function computeAge(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function PatientMaFamille() {
  useLocale();
  const router = useRouter();
  const [items, setItems] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getPatientToken();
      const res = await api<{ items: Dependent[] }>("/api/me/dependents", {
        token: token ?? undefined,
      });
      setItems(res.items ?? []);
    } catch {
      setError(t("patient.famille.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(d: Dependent) {
    const parts = d.name.split(/\s+/);
    setForm({
      id: d.id,
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      relationship: (RELATIONSHIPS as string[]).includes(d.relation ?? "")
        ? (d.relation as Relationship)
        : "other",
      dob: d.dateOfBirth ?? "",
      gender: (d.gender ?? "") as "M" | "F" | "",
      cin: "",
    });
    setModalOpen(true);
  }

  function confirmDelete(d: Dependent) {
    Alert.alert(
      t("patient.famille.deleteTitle"),
      t("patient.famille.deleteConfirm").replace("{name}", d.name),
      [
        { text: t("patient.famille.cancel"), style: "cancel" },
        {
          text: t("patient.famille.delete"),
          style: "destructive",
          onPress: async () => {
            const prev = items;
            setItems((s) => s.filter((x) => x.id !== d.id));
            try {
              const token = await getPatientToken();
              await api(`/api/me/dependents/${d.id}`, {
                method: "DELETE",
                token: token ?? undefined,
              });
            } catch {
              setItems(prev);
              Alert.alert(t("patient.famille.errorTitle"), t("patient.famille.deleteError"));
            }
          },
        },
      ],
    );
  }

  async function submit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert(t("patient.famille.errorTitle"), t("patient.famille.nameRequired"));
      return;
    }
    if (form.dob && !/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) {
      Alert.alert(t("patient.famille.errorTitle"), t("patient.famille.dobInvalid"));
      return;
    }
    setSaving(true);
    try {
      const token = await getPatientToken();
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        relationship: form.relationship,
        dob: form.dob || null,
        gender: form.gender || null,
      };
      if (form.cin.trim()) payload.cin = form.cin.trim();

      if (form.id) {
        await api(`/api/me/dependents/${form.id}`, {
          method: "PATCH",
          body: payload,
          token: token ?? undefined,
        });
      } else {
        await api("/api/me/dependents", {
          method: "POST",
          body: payload,
          token: token ?? undefined,
        });
      }
      setModalOpen(false);
      await load();
    } catch {
      Alert.alert(t("patient.famille.errorTitle"), t("patient.famille.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const headerRight = useMemo(
    () => (
      <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.addBtnText}>{t("patient.famille.add")}</Text>
      </Pressable>
    ),
    [],
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.title}>{t("patient.famille.title")}</Text>
        {headerRight}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("patient.famille.retry")}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>{t("patient.famille.emptyTitle")}</Text>
          <Text style={styles.emptySubText}>{t("patient.famille.emptySubtitle")}</Text>
          <Pressable onPress={openAdd} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("patient.famille.addFirst")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
          }
          renderItem={({ item }) => {
            const age = computeAge(item.dateOfBirth);
            const rel = item.relation
              ? t(`patient.famille.relationships.${item.relation}` as never) || item.relation
              : "";
            return (
              <Pressable
                style={styles.card}
                onPress={() => openEdit(item)}
                onLongPress={() => confirmDelete(item)}
              >
                <View style={styles.avatarFallback}>
                  <Ionicons
                    name={item.gender === "F" ? "woman" : "person"}
                    size={22}
                    color={colors.teal}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.depName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.depMeta}>
                    {rel}
                    {age != null ? ` · ${age} ${t("patient.famille.yearsShort")}` : ""}
                    {item.dateOfBirth ? ` · ${item.dateOfBirth}` : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.foregroundSecondary} />
              </Pressable>
            );
          }}
          ListFooterComponent={
            <Text style={styles.hint}>{t("patient.famille.longPressHint")}</Text>
          }
        />
      )}

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalOpen(false)}
      >
        <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
          <View style={styles.header}>
            <Pressable onPress={() => setModalOpen(false)} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={styles.title}>
              {form.id ? t("patient.famille.editTitle") : t("patient.famille.addTitle")}
            </Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Field label={t("patient.famille.firstName")}>
              <TextInput
                style={styles.input}
                value={form.firstName}
                onChangeText={(v) => setForm((s) => ({ ...s, firstName: v }))}
                placeholder={t("patient.famille.firstNamePh")}
                placeholderTextColor={colors.foregroundSecondary}
              />
            </Field>
            <Field label={t("patient.famille.lastName")}>
              <TextInput
                style={styles.input}
                value={form.lastName}
                onChangeText={(v) => setForm((s) => ({ ...s, lastName: v }))}
                placeholder={t("patient.famille.lastNamePh")}
                placeholderTextColor={colors.foregroundSecondary}
              />
            </Field>

            <Field label={t("patient.famille.relationship")}>
              <View style={styles.chipsRow}>
                {RELATIONSHIPS.map((r) => {
                  const active = form.relationship === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setForm((s) => ({ ...s, relationship: r }))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {t(`patient.famille.relationships.${r}` as never)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label={t("patient.famille.dob")} hint="YYYY-MM-DD">
              <TextInput
                style={styles.input}
                value={form.dob}
                onChangeText={(v) => setForm((s) => ({ ...s, dob: v }))}
                placeholder="1990-01-31"
                placeholderTextColor={colors.foregroundSecondary}
                autoCapitalize="none"
              />
            </Field>

            <Field label={t("patient.famille.gender")}>
              <View style={styles.chipsRow}>
                {(["M", "F"] as const).map((g) => {
                  const active = form.gender === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setForm((s) => ({ ...s, gender: active ? "" : g }))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {g === "M" ? t("patient.famille.male") : t("patient.famille.female")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label={t("patient.famille.cin")} hint={t("patient.famille.optional")}>
              <TextInput
                style={styles.input}
                value={form.cin}
                onChangeText={(v) => setForm((s) => ({ ...s, cin: v }))}
                placeholder="12345678"
                placeholderTextColor={colors.foregroundSecondary}
                keyboardType="number-pad"
              />
            </Field>

            <Pressable style={styles.primaryBtn} onPress={submit} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {form.id ? t("patient.famille.save") : t("patient.famille.create")}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.labelHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
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
    gap: spacing.sm,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.foreground, textAlign: "center" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  listContent: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 2 },
  depName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  depMeta: { fontSize: 12, color: colors.foregroundSecondary },
  hint: { fontSize: 12, color: colors.foregroundSecondary, textAlign: "center", marginTop: spacing.md },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginTop: spacing.sm },
  emptySubText: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center" },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  formContent: { padding: spacing.lg, gap: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  labelHint: { fontSize: 12, color: colors.foregroundSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 13, color: colors.foreground },
  chipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  primaryBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
