import { useEffect, useState, useCallback, useRef } from "react";
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
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Loader, Empty } from "./_ui";

type TargetType = "prescription" | "certificate" | "report";

type Template = {
  id: string;
  title: string;
  description: string | null;
  language: string;
  bodyMarkdown: string;
  targetType: TargetType | string;
  isOfficial: boolean;
  doctorId: string | null;
  updatedAt: string;
};

type VarGroup = {
  labelKey: string;
  vars: { name: string; label: string }[];
};

const VARIABLE_GROUPS: VarGroup[] = [
  {
    labelKey: "doctor.modeles.varGroupPatient",
    vars: [
      { name: "first_name", label: "Prénom" },
      { name: "last_name", label: "Nom" },
      { name: "full_name", label: "Nom complet" },
      { name: "age", label: "Âge" },
      { name: "age_at_appointment", label: "Âge (RDV)" },
      { name: "dob", label: "Date naissance" },
      { name: "phone", label: "Téléphone" },
      { name: "cin", label: "CIN" },
      { name: "weight", label: "Poids" },
      { name: "height", label: "Taille" },
      { name: "blood_type", label: "Groupe sanguin" },
      { name: "allergies", label: "Allergies" },
      { name: "insurance", label: "Assurance" },
    ],
  },
  {
    labelKey: "doctor.modeles.varGroupDoctor",
    vars: [
      { name: "doctor_name", label: "Nom médecin" },
      { name: "doctor_specialty", label: "Spécialité" },
      { name: "doctor_city", label: "Ville" },
      { name: "doctor_phone", label: "Tél. médecin" },
      { name: "doctor_address", label: "Adresse" },
      { name: "doctor_registration", label: "N° inscription" },
    ],
  },
  {
    labelKey: "doctor.modeles.varGroupAppointment",
    vars: [
      { name: "appointment_date", label: "Date RDV" },
      { name: "appointment_type", label: "Type RDV" },
    ],
  },
  {
    labelKey: "doctor.modeles.varGroupDate",
    vars: [
      { name: "today", label: "Aujourd'hui (court)" },
      { name: "today_long", label: "Aujourd'hui (long)" },
      { name: "time", label: "Heure" },
    ],
  },
];

const TARGET_TYPES: { value: TargetType | "all"; key: string }[] = [
  { value: "all", key: "doctor.modeles.filterAll" },
  { value: "prescription", key: "doctor.modeles.filterPrescription" },
  { value: "certificate", key: "doctor.modeles.filterCertificate" },
  { value: "report", key: "doctor.modeles.filterReport" },
];

function targetTypeLabel(target: string): string {
  if (target === "prescription") return t("doctor.modeles.filterPrescription");
  if (target === "certificate") return t("doctor.modeles.filterCertificate");
  if (target === "report") return t("doctor.modeles.filterReport");
  return target;
}

function preview(body: string): string {
  const stripped = body
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_>`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 100 ? stripped.slice(0, 100) + "…" : stripped;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function Modeles() {
  const { locale } = useLocale();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [filter, setFilter] = useState<TargetType | "all">("all");
  const [editing, setEditing] = useState<Partial<Template> | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api<Template[]>("/api/medecin/templates");
      setTemplates(list ?? []);
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteTemplate(tpl: Template) {
    Alert.alert(
      t("doctor.modeles.deleteConfirm"),
      t("doctor.modeles.deleteConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/medecin/templates/${tpl.id}`, { method: "DELETE" });
              await load();
            } catch (e) {
              Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
            }
          },
        },
      ]
    );
  }

  if (!templates) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.modeles.title") }} />
        <Loader />
      </>
    );
  }

  const visible =
    filter === "all"
      ? templates
      : templates.filter((tpl) => tpl.targetType === filter);

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.modeles.title"),
          headerRight: () => (
            <Pressable
              onPress={() =>
                setEditing({
                  title: "",
                  description: "",
                  language: locale === "ar" ? "ar" : "fr",
                  bodyMarkdown: "",
                  targetType: "prescription",
                  isOfficial: false,
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
        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.sm }}
        >
          {TARGET_TYPES.map((tt) => {
            const active = filter === tt.value;
            return (
              <Pressable
                key={tt.value}
                onPress={() => setFilter(tt.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(tt.key)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {visible.length === 0 ? (
          <Empty
            icon="document-text-outline"
            title={t("doctor.modeles.empty")}
            sub={t("doctor.modeles.emptyHint")}
          />
        ) : (
          visible.map((tpl) => (
            <Pressable
              key={tpl.id}
              style={styles.row}
              onPress={() => setEditing(tpl)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.head}>
                  <Text style={styles.name} numberOfLines={1}>
                    {tpl.title}
                  </Text>
                  {tpl.isOfficial && (
                    <View style={styles.officialBadge}>
                      <Ionicons name="shield-checkmark" size={9} color="#0F766E" />
                      <Text style={styles.officialText}>
                        {t("doctor.modeles.officialBadge")}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.targetBadge}>
                    <Text style={styles.targetText}>
                      {targetTypeLabel(tpl.targetType)}
                    </Text>
                  </View>
                  <Text style={styles.langBadge}>{tpl.language.toUpperCase()}</Text>
                  <Text style={styles.dateText}>{formatDate(tpl.updatedAt)}</Text>
                </View>
                {!!tpl.bodyMarkdown && (
                  <Text style={styles.previewText} numberOfLines={2}>
                    {preview(tpl.bodyMarkdown)}
                  </Text>
                )}
              </View>
              <View style={{ gap: 8 }}>
                <View style={styles.iconBtn}>
                  <Ionicons
                    name={tpl.isOfficial ? "eye" : "pencil"}
                    size={14}
                    color={colors.teal}
                  />
                </View>
                {!tpl.isOfficial && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      void deleteTemplate(tpl);
                    }}
                    style={[styles.iconBtn, { borderColor: colors.danger }]}
                  >
                    <Ionicons name="trash" size={14} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            </Pressable>
          ))
        )}
      </Screen>

      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        {editing && (
          <TemplateEditor
            template={editing}
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

function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: Partial<Template>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const readOnly = !!template.isOfficial;
  const [title, setTitle] = useState(template.title ?? "");
  const [description, setDescription] = useState(template.description ?? "");
  const [language, setLanguage] = useState<"fr" | "ar">(
    (template.language as "fr" | "ar") ?? "fr"
  );
  const [targetType, setTargetType] = useState<TargetType>(
    (template.targetType as TargetType) ?? "prescription"
  );
  const [body, setBody] = useState(template.bodyMarkdown ?? "");
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: (template.bodyMarkdown ?? "").length,
    end: (template.bodyMarkdown ?? "").length,
  });
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<TextInput>(null);

  function insertVariable(name: string) {
    if (readOnly) return;
    const token = `{{${name}}}`;
    const start = selection.start;
    const end = selection.end;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    const cursor = start + token.length;
    setSelection({ start: cursor, end: cursor });
    setTimeout(() => bodyRef.current?.focus(), 50);
  }

  async function submit() {
    if (readOnly) return;
    if (!title.trim())
      return Alert.alert(t("common.error"), t("doctor.modeles.titleRequired"));
    if (!body.trim())
      return Alert.alert(t("common.error"), t("doctor.modeles.contentRequired"));

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description || null,
        language,
        bodyMarkdown: body,
        targetType,
      };
      if (template.id) {
        await api(`/api/medecin/templates/${template.id}`, {
          method: "PATCH",
          body: payload,
        });
      } else {
        await api("/api/medecin/templates", { method: "POST", body: payload });
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
        <Text style={styles.modalTitle} numberOfLines={1}>
          {readOnly
            ? t("doctor.modeles.viewTitle")
            : template.id
            ? t("doctor.modeles.editTitle")
            : t("doctor.modeles.newTitle")}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {readOnly && (
          <View style={styles.readOnlyBanner}>
            <Ionicons name="shield-checkmark" size={14} color="#0F766E" />
            <Text style={styles.readOnlyText}>
              {t("doctor.modeles.officialReadOnly")}
            </Text>
          </View>
        )}

        <Field label={t("doctor.modeles.fieldTitle")}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("doctor.modeles.fieldTitlePlaceholder")}
            maxLength={120}
            editable={!readOnly}
            style={styles.input}
          />
        </Field>

        <Field label={t("doctor.modeles.fieldDescription")}>
          <TextInput
            value={description ?? ""}
            onChangeText={setDescription}
            placeholder={t("doctor.modeles.fieldDescriptionPlaceholder")}
            editable={!readOnly}
            style={styles.input}
          />
        </Field>

        <Field label={t("doctor.modeles.fieldTargetType")}>
          <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
            {(["prescription", "certificate", "report"] as TargetType[]).map((v) => {
              const on = targetType === v;
              return (
                <Pressable
                  key={v}
                  disabled={readOnly}
                  onPress={() => setTargetType(v)}
                  style={[styles.segBtn, on && styles.segBtnActive]}
                >
                  <Text
                    style={[styles.segBtnText, on && styles.segBtnTextActive]}
                  >
                    {targetTypeLabel(v)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label={t("doctor.modeles.fieldLanguage")}>
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            {(["fr", "ar"] as const).map((v) => {
              const on = language === v;
              return (
                <Pressable
                  key={v}
                  disabled={readOnly}
                  onPress={() => setLanguage(v)}
                  style={[styles.segBtn, on && styles.segBtnActive]}
                >
                  <Text
                    style={[styles.segBtnText, on && styles.segBtnTextActive]}
                  >
                    {v === "fr"
                      ? t("doctor.modeles.filterFr")
                      : t("doctor.modeles.filterAr")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label={t("doctor.modeles.fieldContent")}>
          <TextInput
            ref={bodyRef}
            value={body}
            onChangeText={setBody}
            placeholder={t("doctor.modeles.fieldContentPlaceholder")}
            editable={!readOnly}
            multiline
            textAlignVertical="top"
            selection={selection}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            style={[styles.input, styles.textarea, language === "ar" && { textAlign: "right" }]}
          />
        </Field>

        {!readOnly && (
          <View style={styles.varsCard}>
            <View style={styles.varsHead}>
              <Text style={styles.varsTitle}>{t("doctor.modeles.variables")}</Text>
              <Text style={styles.varsHint}>{t("doctor.modeles.variablesHint")}</Text>
            </View>
            {VARIABLE_GROUPS.map((group) => (
              <View key={group.labelKey} style={{ marginTop: spacing.sm }}>
                <Text style={styles.varGroupLabel}>{t(group.labelKey)}</Text>
                <View style={styles.varChipWrap}>
                  {group.vars.map((v) => (
                    <Pressable
                      key={v.name}
                      onPress={() => insertVariable(v.name)}
                      style={styles.varChip}
                    >
                      <Text style={styles.varChipLabel}>{v.label}</Text>
                      <Text style={styles.varChipCode}>{`{{${v.name}}}`}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {!readOnly && (
          <Pressable
            onPress={submit}
            disabled={saving}
            style={[styles.primary, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>{t("doctor.modeles.save")}</Text>
            )}
          </Pressable>
        )}
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
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.foreground },
  chipTextActive: { color: "#FFFFFF" },

  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: spacing.sm,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  name: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.foreground },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: "#CCFBF1",
  },
  officialText: { fontSize: 9, fontWeight: "700", color: "#0F766E" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 4,
    flexWrap: "wrap",
  },
  targetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  targetText: { fontSize: 10, fontWeight: "700", color: colors.foreground },
  langBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  dateText: { fontSize: 10, color: colors.foregroundSecondary },
  previewText: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginTop: 6,
    lineHeight: 16,
  },

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

  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: "#CCFBF1",
  },
  readOnlyText: { flex: 1, fontSize: 12, color: "#0F766E", fontWeight: "600" },

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
  textarea: { minHeight: 220, paddingTop: spacing.sm + 2 },

  segBtn: {
    paddingHorizontal: spacing.md,
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

  varsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.bg,
  },
  varsHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  varsTitle: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  varsHint: { fontSize: 11, color: colors.foregroundSecondary },
  varGroupLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  varChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  varChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  varChipLabel: { fontSize: 11, fontWeight: "600", color: colors.foreground },
  varChipCode: { fontSize: 10, color: "#0E7490", fontFamily: "Menlo" },

  primary: {
    marginTop: spacing.sm,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
