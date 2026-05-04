import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, colors, radii, spacing, t, useLocale } from "@doktori/mobile-core";

export type QuickAction = {
  id: string;
  label: string;
  message: string | null;
  icon: string | null;
};

type Secretary = {
  id: string;
  name: string;
  isActive: boolean;
};

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Icon name mapping — match desktop's set (bell / folder / file / coffee / alert / smile).
export const ICON_MAP: Record<string, IconName> = {
  bell: "notifications",
  folder: "folder",
  file: "document-text",
  coffee: "cafe",
  alert: "alert-circle",
  smile: "happy",
};

export function iconForName(name: string | null | undefined): IconName {
  return (name && ICON_MAP[name]) || "notifications";
}

type SendArgs = {
  label: string;
  message?: string | null;
  icon?: string | null;
  secretaryId?: string | null;
};

/**
 * Send a bell to the secretary. Shared by the sheet AND the quick-drag gesture
 * on the Plus tab, so exported.
 */
export async function sendBell(args: SendArgs): Promise<void> {
  await api("/api/doctor/bells", {
    method: "POST",
    body: {
      label: args.label,
      message: args.message ?? null,
      icon: args.icon ?? null,
      secretaryId: args.secretaryId ?? null,
    },
  });
}

export function SecretaryQuickActions({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [targetId, setTargetId] = useState<string>(""); // "" = broadcast
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const [customLabel, setCustomLabel] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [customIcon, setCustomIcon] = useState<string>("bell");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([
        api<QuickAction[] | unknown>("/api/doctor/quick-actions").catch(() => []),
        api<Secretary[] | unknown>("/api/secretaries").catch(() => []),
      ]);
      setActions(Array.isArray(a) ? (a as QuickAction[]) : []);
      const secList = Array.isArray(s) ? (s as Secretary[]) : [];
      setSecretaries(secList.filter((x) => x.isActive));
    } catch (e) {
      console.warn("bell sheet load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
    else {
      setCustomLabel("");
      setCustomMessage("");
      setSaveAsTemplate(false);
    }
  }, [visible, load]);

  async function fire(args: SendArgs) {
    const key = args.label;
    setSending(key);
    try {
      await sendBell({ ...args, secretaryId: args.secretaryId ?? targetId ?? null });
      const targetLabel = targetId
        ? secretaries.find((x) => x.id === targetId)?.name ?? t("secretary.quickActions.yourSecretary")
        : t("secretary.quickActions.allActive");
      Alert.alert(t("secretary.quickActions.sent"), t("secretary.quickActions.sentTo", { target: targetLabel }));
      onClose();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("secretary.quickActions.sendFailed"));
    } finally {
      setSending(null);
    }
  }

  async function fireCustom() {
    const label = customLabel.trim();
    if (!label) return;
    const message = customMessage.trim() || null;
    const icon = customIcon;
    await fire({ label, message, icon });
    if (saveAsTemplate) {
      try {
        await api("/api/doctor/quick-actions", {
          method: "POST",
          body: { label, message, icon },
        });
        void load();
      } catch {
        /* non-fatal */
      }
    }
  }

  function confirmDelete(id: string, label: string) {
    Alert.alert(t("secretary.quickActions.deleteTitle"), t("secretary.quickActions.deleteBody", { label }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("secretary.quickActions.deleteConfirm"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/doctor/quick-actions/${id}`, { method: "DELETE" });
            setActions((prev) => prev.filter((a) => a.id !== id));
          } catch (e) {
            Alert.alert(t("common.error"), e instanceof Error ? e.message : t("secretary.quickActions.deleteFailed"));
          }
        },
      },
    ]);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.titleRow}>
          <View style={styles.bellBadge}>
            <Ionicons name="notifications" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t("secretary.quickActions.sheetTitle")}</Text>
            <Text style={styles.subtitle}>{t("secretary.quickActions.sheetDesc")}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.foregroundSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {secretaries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("secretary.quickActions.recipient")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                <Pressable
                  onPress={() => setTargetId("")}
                  style={[styles.pill, targetId === "" && styles.pillActive]}
                >
                  <Ionicons
                    name="people"
                    size={13}
                    color={targetId === "" ? "#FFFFFF" : colors.foregroundSecondary}
                  />
                  <Text
                    style={[styles.pillText, targetId === "" && { color: "#FFFFFF" }]}
                  >
                    {t("secretary.quickActions.allActive")}
                  </Text>
                </Pressable>
                {secretaries.map((s) => {
                  const active = s.id === targetId;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setTargetId(s.id)}
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <Ionicons
                        name="person"
                        size={13}
                        color={active ? "#FFFFFF" : colors.foregroundSecondary}
                      />
                      <Text style={[styles.pillText, active && { color: "#FFFFFF" }]}>
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("secretary.quickActions.quickActionsSection")}</Text>
            {actions.length === 0 ? (
              <View style={styles.emptyActions}>
                <Ionicons
                  name="add-circle-outline"
                  size={26}
                  color={colors.foregroundSecondary}
                />
                <Text style={styles.emptyText}>
                  {loading
                    ? t("common.loading")
                    : t("secretary.quickActions.noActions")}
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {actions.map((a) => {
                  const isSending = sending === a.label;
                  return (
                    <View key={a.id} style={styles.actionWrap}>
                      <Pressable
                        onPress={() => fire(a)}
                        disabled={isSending}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          pressed && { opacity: 0.6, transform: [{ scale: 0.98 }] },
                          isSending && { opacity: 0.5 },
                        ]}
                      >
                        <Ionicons
                          name={iconForName(a.icon)}
                          size={18}
                          color={colors.teal}
                        />
                        <Text style={styles.actionLabel} numberOfLines={1}>
                          {a.label}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDelete(a.id, a.label)}
                        hitSlop={6}
                        style={styles.actionDel}
                      >
                        <Ionicons name="close" size={11} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("secretary.quickActions.customSection")}</Text>
            <View style={styles.customCard}>
              <TextInput
                value={customLabel}
                onChangeText={setCustomLabel}
                placeholder={t("secretary.quickActions.customPlaceholder")}
                placeholderTextColor={colors.foregroundSecondary}
                style={styles.input}
                maxLength={100}
              />
              <TextInput
                value={customMessage}
                onChangeText={setCustomMessage}
                placeholder={t("secretary.quickActions.messageOptional")}
                placeholderTextColor={colors.foregroundSecondary}
                multiline
                style={[styles.input, styles.inputMulti]}
                maxLength={500}
              />

              <Text style={styles.iconLabel}>{t("secretary.quickActions.iconLabel")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.iconRow}
              >
                {Object.keys(ICON_MAP).map((k) => {
                  const active = customIcon === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setCustomIcon(k)}
                      style={[styles.iconPick, active && styles.iconPickActive]}
                    >
                      <Ionicons
                        name={iconForName(k)}
                        size={18}
                        color={active ? "#FFFFFF" : colors.foreground}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.customFooter}>
                <Pressable
                  onPress={() => setSaveAsTemplate((v) => !v)}
                  style={styles.templateToggle}
                  hitSlop={6}
                >
                  <View
                    style={[
                      styles.checkbox,
                      saveAsTemplate && styles.checkboxChecked,
                    ]}
                  >
                    {saveAsTemplate && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.templateLabel}>
                    {t("secretary.quickActions.saveAsAction")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={fireCustom}
                  disabled={!customLabel.trim() || sending !== null}
                  style={[
                    styles.sendBtn,
                    (!customLabel.trim() || sending !== null) &&
                      styles.sendBtnDisabled,
                  ]}
                >
                  <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
                  <Text style={styles.sendText}>{t("secretary.quickActions.send")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "92%",
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bellBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "800", color: colors.foreground },
  subtitle: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginTop: 2,
  },
  closeBtn: { padding: spacing.xs },

  scroll: { marginTop: spacing.md },
  scrollContent: { gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  pillRow: { gap: spacing.xs, paddingVertical: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  pillActive: { backgroundColor: colors.teal },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionWrap: {
    flexBasis: "48%",
    flexGrow: 1,
    position: "relative",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  actionDel: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyActions: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
  },
  emptyText: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    textAlign: "center",
  },

  customCard: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
  },
  input: {
    minHeight: 40,
    padding: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    color: colors.foreground,
  },
  inputMulti: { minHeight: 60, textAlignVertical: "top" },
  iconLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.foregroundSecondary,
    marginTop: 2,
  },
  iconRow: { gap: spacing.xs, paddingVertical: 2 },
  iconPick: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPickActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  customFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: 4,
  },
  templateToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  templateLabel: {
    fontSize: 12,
    color: colors.foreground,
    flexShrink: 1,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
