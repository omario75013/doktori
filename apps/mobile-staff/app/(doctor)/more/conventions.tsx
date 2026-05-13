import { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { INSURANCES } from "@doktori/shared";
import {
  colors,
  spacing,
  radii,
  api,
  t,
  useLocale,
} from "@doktori/mobile-core";
import { Screen, Loader, Empty } from "./_ui";

type ConventionRow = {
  id?: string;
  doctorId?: string;
  insuranceType: string;
  isConventioned?: boolean;
};

export default function ConventionsScreen() {
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await api<ConventionRow[]>(
        "/api/doctors/me/insurance",
        { noRedirect: true },
      );
      const set = new Set(
        Array.isArray(rows) ? rows.map((r) => r.insuranceType) : [],
      );
      setSelected(set);
      setInitial(new Set(set));
    } catch {
      setSelected(new Set());
      setInitial(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === INSURANCES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(INSURANCES.map((i) => i.id)));
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api("/api/doctors/me/insurance", {
        method: "PUT",
        body: { insuranceTypes: Array.from(selected) },
        noRedirect: true,
      });
      setInitial(new Set(selected));
      Alert.alert(t("doctor.conventions.saveSuccess"));
    } catch {
      Alert.alert(t("doctor.conventions.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const dirty = useMemo(() => {
    if (selected.size !== initial.size) return true;
    for (const id of selected) if (!initial.has(id)) return true;
    return false;
  }, [selected, initial]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INSURANCES;
    return INSURANCES.filter(
      (ins) =>
        ins.label.toLowerCase().includes(q) ||
        ins.labelAr.toLowerCase().includes(q),
    );
  }, [query]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.conventions.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.conventions.title"),
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{ paddingHorizontal: spacing.sm }}
            >
              <Ionicons
                name={isRtl ? "chevron-forward" : "chevron-back"}
                size={24}
                color={colors.foreground}
              />
            </Pressable>
          ),
        }}
      />
      <Screen>
        <View style={[styles.header, isRtl && styles.rowRtl]}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={20} color={colors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, isRtl && styles.txtRtl]}>
              {t("doctor.conventions.pageTitle")}
            </Text>
            <Text style={[styles.subtitle, isRtl && styles.txtRtl]}>
              {t("doctor.conventions.pageSubtitle")}
            </Text>
          </View>
          <View style={[styles.counter, isRtl && { alignItems: "flex-start" }]}>
            <Text style={styles.counterNum}>
              {selected.size}
              <Text style={styles.counterDen}>/{INSURANCES.length}</Text>
            </Text>
            <Text style={styles.counterLabel}>
              {t("doctor.conventions.selectedCount")}
            </Text>
          </View>
        </View>

        <View style={[styles.toolbar, isRtl && styles.rowRtl]}>
          <View style={[styles.searchBox, isRtl && styles.rowRtl]}>
            <Ionicons
              name="search"
              size={16}
              color={colors.foregroundSecondary}
            />
            <TextInput
              style={[styles.searchInput, isRtl && styles.txtRtl]}
              value={query}
              onChangeText={setQuery}
              placeholder={t("doctor.conventions.searchPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
            />
          </View>
          <Pressable onPress={toggleAll} hitSlop={8}>
            <Text style={styles.toggleAll}>
              {selected.size === INSURANCES.length
                ? t("doctor.conventions.clearAll")
                : t("doctor.conventions.selectAll")}
            </Text>
          </Pressable>
        </View>

        {visible.length === 0 ? (
          <Empty
            icon="search-outline"
            title={t("doctor.conventions.noMatch")}
          />
        ) : (
          <View style={styles.grid}>
            {visible.map((ins) => {
              const checked = selected.has(ins.id);
              return (
                <Pressable
                  key={ins.id}
                  onPress={() => toggle(ins.id)}
                  style={[styles.tile, checked && styles.tileChecked]}
                >
                  <View
                    style={[
                      styles.check,
                      checked ? styles.checkOn : styles.checkOff,
                    ]}
                  >
                    {checked ? (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.logo,
                      checked ? styles.logoOn : styles.logoOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.logoText,
                        { color: checked ? colors.teal : colors.foreground },
                      ]}
                    >
                      {ins.label.slice(0, 4).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.tileTitle} numberOfLines={1}>
                    {ins.label}
                  </Text>
                  <Text style={styles.tileSub} numberOfLines={1}>
                    {ins.labelAr}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerStatus}>
            {dirty
              ? t("doctor.conventions.unsavedChanges")
              : t("doctor.conventions.noChanges")}
          </Text>
          <Pressable
            onPress={save}
            disabled={!dirty || saving}
            style={[styles.saveBtn, (!dirty || saving) && { opacity: 0.5 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {t("doctor.conventions.saveButton")}
              </Text>
            )}
          </Pressable>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  txtRtl: { textAlign: "right", writingDirection: "rtl" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  subtitle: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginTop: 2,
  },
  counter: { alignItems: "flex-end" },
  counterNum: { fontSize: 20, fontWeight: "800", color: colors.teal },
  counterDen: { color: colors.foregroundSecondary, fontWeight: "400" },
  counterLabel: { fontSize: 10, color: colors.foregroundSecondary },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
    paddingVertical: 0,
  },
  toggleAll: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tile: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.bg,
    position: "relative",
  },
  tileChecked: {
    borderColor: colors.teal,
    backgroundColor: colors.bgSecondary,
  },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.teal },
  checkOff: { backgroundColor: colors.border },
  logo: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logoOn: { backgroundColor: "rgba(0,150,150,0.12)" },
  logoOff: { backgroundColor: colors.bgSecondary },
  logoText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  tileTitle: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  tileSub: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
  },
  footerStatus: {
    flex: 1,
    fontSize: 12,
    color: colors.foregroundSecondary,
  },
  saveBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
