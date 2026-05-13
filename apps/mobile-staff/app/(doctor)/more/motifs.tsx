import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Loader, Empty, formatMillimes } from "./_ui";

type Motif = {
  id: string;
  name: string;
  durationMinutes: number;
  fee: number | null;
  color: string;
  mode: string;
  isActive: boolean;
  practiceIds: string[];
};

type Practice = { id: string; name: string; city: string; isActive: boolean };

export default function Motifs() {
  const { locale } = useLocale();
  const [motifs, setMotifs] = useState<Motif[] | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [editing, setEditing] = useState<Partial<Motif> | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([
        api<Motif[]>("/api/appointment-types"),
        api<Practice[]>("/api/doctor/practices").catch(() => []),
      ]);
      setMotifs((m ?? []).filter((x) => x.isActive));
      setPractices((p ?? []).filter((x) => x.isActive));
    } catch {
      setMotifs([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteMotif(id: string, name: string) {
    Alert.alert(t("common.delete"), `${t("doctor.motifs.noMotifs")} "${name}" ?`, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/appointment-types/${id}`, { method: "DELETE" });
            await load();
          } catch (e) {
            Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
          }
        },
      },
    ]);
  }

  if (!motifs) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.motifs.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.motifs.title"),
          headerRight: () =>
            practices.length > 0 ? (
              <Pressable
                onPress={() =>
                  setEditing({
                    name: "",
                    durationMinutes: 20,
                    fee: null,
                    color: "#2563eb",
                    mode: "cabinet",
                    practiceIds: [],
                  })
                }
                hitSlop={10}
                style={{ padding: spacing.xs, marginRight: spacing.sm }}
              >
                <Ionicons name="add" size={26} color={colors.teal} />
              </Pressable>
            ) : null,
        }}
      />
      <Screen>
        {motifs.length === 0 ? (
          <Empty icon="list-outline" title={t("doctor.motifs.noMotifs")} />
        ) : (
          motifs.map((m) => (
            <View key={m.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: m.color }]} />
              <View style={{ flex: 1 }}>
                <View style={styles.head}>
                  <Text style={styles.name}>{m.name}</Text>
                  {m.mode === "teleconsult" && (
                    <View style={styles.tele}>
                      <Ionicons name="videocam" size={10} color="#1E40AF" />
                      <Text style={styles.teleText}>{t("doctor.motifs.typeTeleconsult")}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sub}>
                  {m.durationMinutes} min
                  {m.fee ? ` · ${formatMillimes(m.fee)}` : ""}
                </Text>
                <View style={styles.practicesWrap}>
                  {m.practiceIds.length === 0 ? (
                    <Text style={styles.noPractice}>{t("doctor.motifs.noCabinets")}</Text>
                  ) : (
                    practices
                      .filter((p) => m.practiceIds.includes(p.id))
                      .map((p) => (
                        <View key={p.id} style={styles.practiceChip}>
                          <Ionicons name="business" size={9} color={colors.teal} />
                          <Text style={styles.practiceText}>{p.name}</Text>
                        </View>
                      ))
                  )}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Pressable onPress={() => setEditing(m)} style={styles.iconBtn}>
                  <Ionicons name="pencil" size={14} color={colors.teal} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(doctor)/more/motif-questions/[typeId]" as never,
                      params: { typeId: m.id },
                    })
                  }
                  style={styles.iconBtn}
                >
                  <Ionicons name="help-circle" size={14} color={colors.teal} />
                </Pressable>
                <Pressable
                  onPress={() => deleteMotif(m.id, m.name)}
                  style={[styles.iconBtn, { borderColor: colors.danger }]}
                >
                  <Ionicons name="trash" size={14} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        {practices.length === 0 && (
          <View style={styles.warn}>
            <Ionicons name="warning" size={16} color="#9A3412" />
            <Text style={styles.warnText}>
              {t("doctor.motifs.cabinetRequired")}
            </Text>
          </View>
        )}
      </Screen>

      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        {editing && (
          <MotifEditor
            motif={editing}
            practices={practices}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function MotifEditor({
  motif,
  practices,
  onClose,
  onSaved,
}: {
  motif: Partial<Motif>;
  practices: Practice[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState(motif.name ?? "");
  const [duration, setDuration] = useState(String(motif.durationMinutes ?? 20));
  const [fee, setFee] = useState(motif.fee ? String(motif.fee / 1000) : "");
  const [mode, setMode] = useState<"cabinet" | "teleconsult">(
    motif.mode === "teleconsult" ? "teleconsult" : "cabinet"
  );
  const [practiceIds, setPracticeIds] = useState<Set<string>>(
    new Set(motif.practiceIds ?? [])
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return Alert.alert(t("common.error"), t("doctor.motifs.nameRequired"));
    const dur = Number(duration);
    if (isNaN(dur) || dur < 5 || dur > 120)
      return Alert.alert(t("common.error"), t("doctor.motifs.durationInvalid"));
    if (mode !== "teleconsult" && practiceIds.size === 0)
      return Alert.alert(t("common.error"), t("doctor.motifs.cabinetRequired"));

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        durationMinutes: dur,
        fee: fee ? Number(fee) : null,
        mode,
        practiceIds: Array.from(practiceIds),
      };
      if (motif.id) {
        await api(`/api/appointment-types/${motif.id}`, {
          method: "PATCH",
          body,
        });
      } else {
        await api("/api/appointment-types", { method: "POST", body });
      }
      await onSaved();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.modalHead}>
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.modalTitle}>
          {motif.id ? t("doctor.motifs.edit") : t("doctor.motifs.newTitle")}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Field label={t("doctor.motifs.name")}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("doctor.motifs.namePlaceholder")}
            style={styles.input}
          />
        </Field>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Field label={t("doctor.motifs.duration")}>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              style={styles.input}
            />
          </Field>
          <Field label={t("doctor.motifs.fee")}>
            <TextInput
              value={fee}
              onChangeText={setFee}
              keyboardType="numeric"
              placeholder={t("doctor.motifs.feeOptional")}
              style={styles.input}
            />
          </Field>
        </View>

        <Field label={t("doctor.motifs.type")}>
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <Pressable
              style={[styles.segBtn, mode === "cabinet" && styles.segBtnActive]}
              onPress={() => setMode("cabinet")}
            >
              <Text
                style={[
                  styles.segBtnText,
                  mode === "cabinet" && styles.segBtnTextActive,
                ]}
              >
                {t("doctor.motifs.typeCabinet")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segBtn, mode === "teleconsult" && styles.segBtnActive]}
              onPress={() => setMode("teleconsult")}
            >
              <Text
                style={[
                  styles.segBtnText,
                  mode === "teleconsult" && styles.segBtnTextActive,
                ]}
              >
                {t("doctor.motifs.typeTeleconsult")}
              </Text>
            </Pressable>
          </View>
        </Field>

        <Field label={t("doctor.motifs.cabinets")}>
          <View style={{ gap: spacing.xs }}>
            {practices.map((p) => {
              const on = practiceIds.has(p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setPracticeIds((prev) => {
                      const next = new Set(prev);
                      on ? next.delete(p.id) : next.add(p.id);
                      return next;
                    });
                  }}
                  style={[styles.checkRow, on && styles.checkRowActive]}
                >
                  <View
                    style={[
                      styles.checkBox,
                      on && {
                        backgroundColor: colors.teal,
                        borderColor: colors.teal,
                      },
                    ]}
                  >
                    {on && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Ionicons name="business" size={14} color={colors.teal} />
                  <Text style={styles.checkLabel}>{p.name}</Text>
                  <Text style={styles.checkSub}>· {p.city}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Pressable
          onPress={submit}
          disabled={saving}
          style={[styles.primary, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>
              {motif.id ? t("doctor.motifs.save") : t("doctor.motifs.create")}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  name: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  tele: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: "#DBEAFE",
  },
  teleText: { fontSize: 9, fontWeight: "700", color: "#1E40AF" },
  sub: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  practicesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  practiceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  practiceText: { fontSize: 10, color: colors.foreground, fontWeight: "600" },
  noPractice: { fontSize: 10, color: colors.danger, fontStyle: "italic" },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  warn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: "#FED7AA",
  },
  warnText: { flex: 1, fontSize: 12, color: "#9A3412" },

  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    fontSize: 14,
    backgroundColor: colors.bg,
    color: colors.foreground,
  },
  segBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  segBtnActive: { borderColor: colors.teal, backgroundColor: colors.teal },
  segBtnText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  segBtnTextActive: { color: "#FFFFFF" },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  checkRowActive: { borderColor: colors.teal, backgroundColor: colors.bgSecondary },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  checkSub: { fontSize: 12, color: colors.foregroundSecondary },
  primary: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
