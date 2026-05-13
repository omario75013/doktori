import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { Screen, Loader, Empty } from "../_ui";

type Kind = "text" | "choice" | "file" | "yesno";

type Question = {
  id: string;
  appointmentTypeId: string;
  label: string;
  kind: Kind;
  choices: string[] | null;
  required: boolean;
  displayOrder: number;
  createdAt: string;
};

type AppointmentType = {
  id: string;
  name: string;
};

const KINDS: Kind[] = ["text", "choice", "yesno", "file"];

export default function MotifQuestionsScreen() {
  const { typeId } = useLocalSearchParams<{ typeId: string }>();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [typeName, setTypeName] = useState<string>("");
  const [editing, setEditing] = useState<Partial<Question> | null>(null);

  const load = useCallback(async () => {
    if (!typeId) return;
    try {
      const [qs, types] = await Promise.all([
        api<Question[]>(`/api/appointment-types/${typeId}/questions`),
        api<AppointmentType[]>("/api/appointment-types").catch(() => []),
      ]);
      setQuestions(qs ?? []);
      const at = (types ?? []).find((x) => x.id === typeId);
      if (at) setTypeName(at.name);
    } catch {
      setQuestions([]);
    }
  }, [typeId]);

  useEffect(() => {
    void load();
  }, [load]);

  function kindLabel(k: Kind): string {
    return t(`doctor.motifsQuestions.kind.${k}` as never);
  }

  async function move(id: string, dir: "up" | "down") {
    if (!questions) return;
    const idx = questions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const j = dir === "up" ? idx - 1 : idx + 1;
    if (j < 0 || j >= questions.length) return;
    const a = questions[idx];
    const b = questions[j];
    try {
      await Promise.all([
        api(`/api/appointment-types/${typeId}/questions/${a.id}`, {
          method: "PATCH",
          body: { displayOrder: b.displayOrder },
        }),
        api(`/api/appointment-types/${typeId}/questions/${b.id}`, {
          method: "PATCH",
          body: { displayOrder: a.displayOrder },
        }),
      ]);
      await load();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    }
  }

  function remove(id: string) {
    Alert.alert(
      t("doctor.motifsQuestions.deleteTitle"),
      t("doctor.motifsQuestions.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/appointment-types/${typeId}/questions/${id}`, {
                method: "DELETE",
              });
              await load();
            } catch (e) {
              Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
            }
          },
        },
      ]
    );
  }

  if (!questions) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.motifsQuestions.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.motifsQuestions.title"),
          headerRight: () => (
            <Pressable
              onPress={() =>
                setEditing({
                  label: "",
                  kind: "text",
                  required: false,
                  choices: null,
                  displayOrder: questions.length,
                })
              }
              hitSlop={10}
              style={{ padding: spacing.xs, marginRight: spacing.sm }}
            >
              <Ionicons name="add" size={26} color={colors.teal} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        {typeName ? (
          <View style={styles.heading}>
            <Text style={styles.headingTitle}>{typeName}</Text>
            <Text style={styles.headingSub}>{t("doctor.motifsQuestions.subtitle")}</Text>
          </View>
        ) : null}

        {questions.length === 0 ? (
          <Empty
            icon="help-circle-outline"
            title={t("doctor.motifsQuestions.empty")}
            sub={t("doctor.motifsQuestions.emptyHint")}
          />
        ) : (
          questions.map((q, idx) => (
            <View key={q.id} style={styles.row}>
              <View style={styles.orderCol}>
                <Pressable
                  onPress={() => move(q.id, "up")}
                  disabled={idx === 0}
                  style={[styles.orderBtn, idx === 0 && { opacity: 0.3 }]}
                  hitSlop={6}
                >
                  <Ionicons name="chevron-up" size={14} color={colors.teal} />
                </Pressable>
                <Pressable
                  onPress={() => move(q.id, "down")}
                  disabled={idx === questions.length - 1}
                  style={[styles.orderBtn, idx === questions.length - 1 && { opacity: 0.3 }]}
                  hitSlop={6}
                >
                  <Ionicons name="chevron-down" size={14} color={colors.teal} />
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.qLabel}>{q.label}</Text>
                <View style={styles.qMeta}>
                  <View style={styles.kindChip}>
                    <Text style={styles.kindChipText}>{kindLabel(q.kind)}</Text>
                  </View>
                  {q.required && (
                    <View style={[styles.kindChip, { backgroundColor: "#FEE2E2" }]}>
                      <Text style={[styles.kindChipText, { color: "#991B1B" }]}>
                        {t("doctor.motifsQuestions.requiredTag")}
                      </Text>
                    </View>
                  )}
                </View>
                {q.kind === "choice" && q.choices && q.choices.length > 0 && (
                  <View style={styles.choicesWrap}>
                    {q.choices.map((c, i) => (
                      <View key={i} style={styles.choiceChip}>
                        <Text style={styles.choiceChipText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ gap: 6 }}>
                <Pressable onPress={() => setEditing(q)} style={styles.iconBtn}>
                  <Ionicons name="pencil" size={14} color={colors.teal} />
                </Pressable>
                <Pressable
                  onPress={() => remove(q.id)}
                  style={[styles.iconBtn, { borderColor: colors.danger }]}
                >
                  <Ionicons name="trash" size={14} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </Screen>

      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        {editing && (
          <QuestionEditor
            typeId={String(typeId)}
            question={editing}
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

function QuestionEditor({
  typeId,
  question,
  onClose,
  onSaved,
}: {
  typeId: string;
  question: Partial<Question>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [label, setLabel] = useState(question.label ?? "");
  const [kind, setKind] = useState<Kind>(question.kind ?? "text");
  const [required, setRequired] = useState(Boolean(question.required));
  const [choicesRaw, setChoicesRaw] = useState(
    Array.isArray(question.choices) ? question.choices.join("\n") : ""
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!label.trim()) {
      Alert.alert(t("common.error"), t("doctor.motifsQuestions.labelRequired"));
      return;
    }
    let choices: string[] | undefined;
    if (kind === "choice") {
      choices = choicesRaw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (choices.length < 2) {
        Alert.alert(t("common.error"), t("doctor.motifsQuestions.choicesRequired"));
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        label: label.trim(),
        kind,
        required,
        displayOrder: question.displayOrder ?? 0,
      };
      if (kind === "choice") body.choices = choices;

      if (question.id) {
        await api(`/api/appointment-types/${typeId}/questions/${question.id}`, {
          method: "PATCH",
          body,
        });
      } else {
        await api(`/api/appointment-types/${typeId}/questions`, {
          method: "POST",
          body,
        });
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
          {question.id
            ? t("doctor.motifsQuestions.editTitle")
            : t("doctor.motifsQuestions.newTitle")}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ gap: 4 }}>
          <Text style={styles.fieldLabel}>{t("doctor.motifsQuestions.questionLabel")}</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder={t("doctor.motifsQuestions.questionPlaceholder")}
            placeholderTextColor={colors.foregroundSecondary}
            multiline
            style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
            maxLength={500}
          />
        </View>

        <View style={{ gap: 4 }}>
          <Text style={styles.fieldLabel}>{t("doctor.motifsQuestions.responseType")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {KINDS.map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[styles.segBtn, kind === k && styles.segBtnActive]}
              >
                <Text
                  style={[styles.segBtnText, kind === k && styles.segBtnTextActive]}
                >
                  {t(`doctor.motifsQuestions.kind.${k}` as never)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {kind === "choice" && (
          <View style={{ gap: 4 }}>
            <Text style={styles.fieldLabel}>{t("doctor.motifsQuestions.optionsLabel")}</Text>
            <TextInput
              value={choicesRaw}
              onChangeText={setChoicesRaw}
              placeholder={t("doctor.motifsQuestions.optionsPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
              numberOfLines={5}
              style={[styles.input, { minHeight: 110, textAlignVertical: "top" }]}
            />
            <Text style={styles.fieldHint}>{t("doctor.motifsQuestions.optionsHint")}</Text>
          </View>
        )}

        {kind === "file" && (
          <View style={styles.banner}>
            <Ionicons name="information-circle" size={14} color="#92400E" />
            <Text style={styles.bannerText}>{t("doctor.motifsQuestions.fileNote")}</Text>
          </View>
        )}

        <Pressable
          onPress={() => setRequired((v) => !v)}
          style={[styles.checkRow, required && styles.checkRowActive]}
        >
          <View
            style={[
              styles.checkBox,
              required && { backgroundColor: colors.teal, borderColor: colors.teal },
            ]}
          >
            {required && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
          <Text style={styles.checkLabel}>{t("doctor.motifsQuestions.requiredLabel")}</Text>
        </Pressable>

        <Pressable
          onPress={submit}
          disabled={saving}
          style={[styles.primary, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>
              {question.id ? t("doctor.motifsQuestions.save") : t("doctor.motifsQuestions.create")}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 2 },
  headingTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  headingSub: { fontSize: 12, color: colors.foregroundSecondary },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  orderCol: { gap: 2, alignItems: "center" },
  orderBtn: {
    width: 28,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    backgroundColor: colors.bgSecondary,
  },
  qLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  qMeta: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  kindChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  kindChipText: { fontSize: 10, fontWeight: "700", color: colors.foreground },
  choicesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  choiceChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  choiceChipText: { fontSize: 10, color: colors.foreground, fontWeight: "600" },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },

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
  fieldHint: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  segBtnActive: { borderColor: colors.teal, backgroundColor: colors.teal },
  segBtnText: { fontSize: 12, fontWeight: "600", color: colors.foreground },
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
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: "#FEF3C7",
  },
  bannerText: { flex: 1, fontSize: 12, color: "#92400E", lineHeight: 16 },
  primary: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
