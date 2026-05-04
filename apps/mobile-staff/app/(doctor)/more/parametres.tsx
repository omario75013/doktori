import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  Image,
  Linking,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale, changeLocale } from "@doktori/mobile-core";
import { Screen, Card, Loader, Banner } from "./_ui";

type Prefs = {
  emailNewBooking: boolean;
  emailCancellation: boolean;
  emailDailyDigest: boolean;
  pushNewBooking: boolean;
  pushCancellation: boolean;
  pushRemindersEnabled: boolean;
  smsEnabled: boolean;
};

type Me = {
  totpEnabled: boolean;
  totpEnrolledAt?: string | null;
};

type Tab = "notifications" | "security" | "systeme";

export default function Parametres() {
  const { locale } = useLocale();
  const [tab, setTab] = useState<Tab>("notifications");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Système tab
  const [cacheCleared, setCacheCleared] = useState(false);

  function handleSoon() {
    Alert.alert(t("doctor.parametres.comingSoon"), t("doctor.parametres.comingSoonDesc"));
  }

  function handleClearCache() {
    Alert.alert(
      t("doctor.parametres.clearCacheTitle"),
      t("doctor.parametres.clearCacheConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("doctor.parametres.clearCacheBtn"), style: "destructive", onPress: () => { setCacheCleared(true); Alert.alert(t("doctor.parametres.cacheCleared"), t("doctor.parametres.cacheClearedDesc")); } },
      ]
    );
  }

  function handleSupport() {
    Linking.openURL("mailto:support@doktori.tn").catch(() => Alert.alert(t("common.error"), t("doctor.parametres.mailError")));
  }

  // Password change
  const [pwModal, setPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // 2FA
  const [tfaModal, setTfaModal] = useState(false);
  const [tfaStep, setTfaStep] = useState<"qr" | "verify" | "codes">("qr");
  const [tfaSecret, setTfaSecret] = useState("");
  const [tfaUri, setTfaUri] = useState("");
  const [tfaCode, setTfaCode] = useState("");
  const [tfaBackupCodes, setTfaBackupCodes] = useState<string[]>([]);
  const [tfaBusy, setTfaBusy] = useState(false);

  // 2FA disable
  const [disableModal, setDisableModal] = useState(false);
  const [disablePw, setDisablePw] = useState("");
  const [disableBusy, setDisableBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, m] = await Promise.all([
          api<Prefs>("/api/doctor/notification-prefs"),
          api<Me>("/api/doctor/me"),
        ]);
        setPrefs(p);
        setMe(m);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function toggle(key: keyof Prefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(key);
    try {
      await api("/api/doctor/notification-prefs", { method: "PUT", body: next });
    } catch {
      Alert.alert(t("common.error"), t("common.error"));
      setPrefs(prefs);
    } finally {
      setSaving(null);
    }
  }

  async function changePassword() {
    if (pwNew !== pwConfirm) {
      Alert.alert(t("common.error"), t("doctor.parametres.passwordMismatch"));
      return;
    }
    if (pwNew.length < 8) {
      Alert.alert(t("common.error"), t("doctor.parametres.passwordTooShort"));
      return;
    }
    setPwBusy(true);
    try {
      await api("/api/doctor/password", {
        method: "POST",
        body: { currentPassword: pwCurrent, newPassword: pwNew },
      });
      Alert.alert(t("doctor.parametres.success"), t("doctor.parametres.passwordUpdated"));
      setPwModal(false);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("doctor.parametres.wrongCurrentPassword"));
    } finally {
      setPwBusy(false);
    }
  }

  async function startTfa() {
    setTfaBusy(true);
    try {
      const data = await api<{ secret: string; uri: string }>("/api/doctor/2fa/enable", {
        method: "POST",
      });
      setTfaSecret(data.secret);
      setTfaUri(data.uri);
      setTfaStep("qr");
      setTfaModal(true);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
    } finally {
      setTfaBusy(false);
    }
  }

  async function verifyTfa() {
    if (!/^\d{6}$/.test(tfaCode)) {
      Alert.alert(t("common.error"), t("doctor.parametres.codeRequired"));
      return;
    }
    setTfaBusy(true);
    try {
      const data = await api<{ backupCodes: string[] }>("/api/doctor/2fa/verify", {
        method: "POST",
        body: { code: tfaCode },
      });
      setTfaBackupCodes(data.backupCodes ?? []);
      setTfaStep("codes");
      setMe((m) => m ? { ...m, totpEnabled: true } : m);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
    } finally {
      setTfaBusy(false);
    }
  }

  async function disableTfa() {
    if (!disablePw) {
      Alert.alert(t("common.error"), t("doctor.parametres.passwordRequired"));
      return;
    }
    setDisableBusy(true);
    try {
      await api("/api/doctor/2fa/disable", {
        method: "POST",
        body: { password: disablePw },
      });
      Alert.alert(t("doctor.parametres.twoFaDisabledMsg"), t("doctor.parametres.twoFaDisabledDesc"));
      setDisableModal(false);
      setDisablePw("");
      setMe((m) => m ? { ...m, totpEnabled: false } : m);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
    } finally {
      setDisableBusy(false);
    }
  }

  if (!prefs || !me) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.parametres.title") }} />
        <Loader />
      </>
    );
  }

  const qrImageUrl = tfaUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(tfaUri)}`
    : null;

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.parametres.title") }} />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab("notifications")}
          style={[styles.tabBtn, tab === "notifications" && styles.tabBtnActive]}
        >
          <Ionicons
            name="notifications"
            size={14}
            color={tab === "notifications" ? "#FFFFFF" : colors.foreground}
          />
          <Text style={[styles.tabBtnText, tab === "notifications" && { color: "#FFFFFF" }]}>
            {t("doctor.parametres.tabNotifs")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("security")}
          style={[styles.tabBtn, tab === "security" && styles.tabBtnActive]}
        >
          <Ionicons
            name="shield-checkmark"
            size={14}
            color={tab === "security" ? "#FFFFFF" : colors.foreground}
          />
          <Text style={[styles.tabBtnText, tab === "security" && { color: "#FFFFFF" }]}>
            {t("doctor.parametres.tabSecurity")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("systeme")}
          style={[styles.tabBtn, tab === "systeme" && styles.tabBtnActive]}
        >
          <Ionicons
            name="settings"
            size={14}
            color={tab === "systeme" ? "#FFFFFF" : colors.foreground}
          />
          <Text style={[styles.tabBtnText, tab === "systeme" && { color: "#FFFFFF" }]}>
            {t("doctor.parametres.tabSystem")}
          </Text>
        </Pressable>
      </View>

      <Screen>
        {tab === "notifications" ? (
          <>
            <Card title={t("doctor.parametres.emailNotifs")}>
              <Toggle label={t("doctor.parametres.newBooking")} value={prefs.emailNewBooking} onChange={() => toggle("emailNewBooking")} disabled={saving === "emailNewBooking"} />
              <Toggle label={t("doctor.parametres.patientCancel")} value={prefs.emailCancellation} onChange={() => toggle("emailCancellation")} disabled={saving === "emailCancellation"} />
              <Toggle label={t("doctor.parametres.dailySummary")} value={prefs.emailDailyDigest} onChange={() => toggle("emailDailyDigest")} disabled={saving === "emailDailyDigest"} />
            </Card>

            <Card title={t("doctor.parametres.pushNotifs")}>
              <Toggle label={t("doctor.parametres.newBooking")} value={prefs.pushNewBooking} onChange={() => toggle("pushNewBooking")} disabled={saving === "pushNewBooking"} />
              <Toggle label={t("doctor.parametres.cancelPush")} value={prefs.pushCancellation} onChange={() => toggle("pushCancellation")} disabled={saving === "pushCancellation"} />
              <Toggle label={t("doctor.parametres.reminders")} value={prefs.pushRemindersEnabled} onChange={() => toggle("pushRemindersEnabled")} disabled={saving === "pushRemindersEnabled"} />
            </Card>

            <Card title={t("doctor.parametres.smsSection")}>
              <Toggle label={t("doctor.parametres.smsToggle")} value={prefs.smsEnabled} onChange={() => toggle("smsEnabled")} disabled={saving === "smsEnabled"} />
            </Card>

            <Banner>
              {t("doctor.parametres.offsetsHint")}
            </Banner>
          </>
        ) : tab === "security" ? (
          <>
            <Card title={t("doctor.parametres.passwordSection")}>
              <View style={styles.secRow}>
                <Ionicons name="lock-closed" size={16} color={colors.teal} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.secLabel}>{t("doctor.parametres.passwordSection")}</Text>
                  <Text style={styles.secSub}>{t("doctor.parametres.lastChanged")}</Text>
                </View>
                <Pressable onPress={() => setPwModal(true)} style={styles.secBtn}>
                  <Text style={styles.secBtnText}>{t("doctor.parametres.changePassword")}</Text>
                </Pressable>
              </View>
            </Card>

            <Card title={t("doctor.parametres.twoFaSection")}>
              <View style={styles.secRow}>
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={me.totpEnabled ? colors.teal : colors.foregroundSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.secLabel}>{t("doctor.parametres.twoFaLabel")}</Text>
                  <Text style={[styles.secSub, me.totpEnabled && { color: colors.teal }]}>
                    {me.totpEnabled ? t("doctor.parametres.twoFaEnabled") : t("doctor.parametres.twoFaDisabled")}
                  </Text>
                </View>
                {me.totpEnabled ? (
                  <Pressable
                    onPress={() => setDisableModal(true)}
                    style={[styles.secBtn, styles.secBtnDanger]}
                  >
                    <Text style={[styles.secBtnText, { color: colors.danger }]}>
                      {t("doctor.parametres.disable")}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={startTfa}
                    disabled={tfaBusy}
                    style={[styles.secBtn, tfaBusy && { opacity: 0.6 }]}
                  >
                    <Text style={styles.secBtnText}>{t("doctor.parametres.enable")}</Text>
                  </Pressable>
                )}
              </View>
              {me.totpEnabled && (
                <Text style={styles.tfaNote}>
                  {t("doctor.parametres.twoFaHint1")}
                </Text>
              )}
            </Card>

            <Banner>
              {t("doctor.parametres.twoFaHint2")}
            </Banner>
          </>
        ) : (
          <>
            <Card title={t("doctor.parametres.displaySection")}>
              <View style={styles.sysRow}>
                <View style={styles.sysIconWrap}>
                  <Ionicons name="language-outline" size={18} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sysLabel}>{t("doctor.parametres.language")}</Text>
                </View>
                <Pressable
                  onPress={() => changeLocale("fr")}
                  style={[styles.secBtn, locale === "fr" && { backgroundColor: colors.teal }]}
                >
                  <Text style={[styles.secBtnText, locale === "fr" && { color: "#FFFFFF" }]}>
                    {t("doctor.parametres.languageFr")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => changeLocale("ar")}
                  style={[styles.secBtn, locale === "ar" && { backgroundColor: colors.teal }]}
                >
                  <Text style={[styles.secBtnText, locale === "ar" && { color: "#FFFFFF" }]}>
                    {t("doctor.parametres.languageAr")}
                  </Text>
                </Pressable>
              </View>
              <SysRow icon="contrast-outline" label={t("doctor.parametres.theme")} sublabel={t("doctor.parametres.themeHint")} value={t("doctor.parametres.themeAuto")} onPress={handleSoon} last />
            </Card>

            <Card title={t("doctor.parametres.dataSection")}>
              <SysRow
                icon="trash-outline"
                label={t("doctor.parametres.clearCache")}
                sublabel={cacheCleared ? t("doctor.parametres.cacheCleared") : t("doctor.parametres.clearCacheDesc")}
                onPress={handleClearCache}
              />
              <SysRow icon="information-circle-outline" label={t("doctor.parametres.appVersion")} value="1.0.0" onPress={() => {}} last />
            </Card>

            <Card title={t("doctor.parametres.aboutSection")}>
              <SysRow
                icon="document-text-outline"
                label={t("doctor.parametres.conditions")}
                sublabel={t("doctor.parametres.conditionsDesc")}
                onPress={() => router.push("/(doctor)/more/conditions" as never)}
              />
              <SysRow
                icon="shield-checkmark-outline"
                label={t("doctor.parametres.privacy")}
                sublabel={t("doctor.parametres.privacyDesc")}
                onPress={() => router.push("/(doctor)/more/confidentialite" as never)}
              />
              <SysRow
                icon="information-circle"
                label={t("doctor.parametres.about")}
                sublabel={t("doctor.parametres.aboutDesc")}
                onPress={() => router.push("/(doctor)/more/a-propos" as never)}
              />
              <SysRow
                icon="mail-outline"
                label={t("doctor.parametres.support")}
                sublabel={t("doctor.parametres.supportEmail")}
                onPress={handleSupport}
                last
              />
            </Card>
          </>
        )}
      </Screen>

      {/* Password change modal */}
      <Modal visible={pwModal} animationType="slide" onRequestClose={() => setPwModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Pressable onPress={() => setPwModal(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={styles.modalTitle}>{t("doctor.parametres.changePasswordTitle")}</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <TextInput
              placeholder={t("doctor.parametres.currentPassword")}
              placeholderTextColor={colors.foregroundSecondary}
              secureTextEntry
              value={pwCurrent}
              onChangeText={setPwCurrent}
              style={styles.input}
            />
            <TextInput
              placeholder={t("doctor.parametres.newPassword")}
              placeholderTextColor={colors.foregroundSecondary}
              secureTextEntry
              value={pwNew}
              onChangeText={setPwNew}
              style={styles.input}
            />
            <TextInput
              placeholder={t("doctor.parametres.confirmPassword")}
              placeholderTextColor={colors.foregroundSecondary}
              secureTextEntry
              value={pwConfirm}
              onChangeText={setPwConfirm}
              style={styles.input}
            />
            <Pressable
              onPress={changePassword}
              disabled={pwBusy}
              style={[styles.submitBtn, pwBusy && { opacity: 0.6 }]}
            >
              <Text style={styles.submitBtnText}>
                {pwBusy ? t("doctor.parametres.saving") : t("doctor.parametres.updatePassword")}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* 2FA setup modal */}
      <Modal visible={tfaModal} animationType="slide" onRequestClose={() => { setTfaModal(false); setTfaCode(""); }}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Pressable onPress={() => { setTfaModal(false); setTfaCode(""); }} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={styles.modalTitle}>{t("doctor.parametres.enable2faTitle")}</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {tfaStep === "qr" && (
              <>
                <Text style={styles.tfaInstr}>
                  {t("doctor.parametres.twoFaStep1")}
                </Text>
                {qrImageUrl && (
                  <View style={styles.qrWrap}>
                    <Image source={{ uri: qrImageUrl }} style={styles.qr} />
                  </View>
                )}
                <Text style={styles.tfaSecretLabel}>{t("doctor.parametres.twoFaManual")}</Text>
                <Text style={styles.tfaSecret} selectable>{tfaSecret}</Text>
                <Pressable onPress={() => setTfaStep("verify")} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>{t("doctor.parametres.twoFaNextStep")}</Text>
                </Pressable>
              </>
            )}
            {tfaStep === "verify" && (
              <>
                <Text style={styles.tfaInstr}>
                  {t("doctor.parametres.twoFaStep2")}
                </Text>
                <TextInput
                  placeholder={t("doctor.parametres.twoFaCodePlaceholder")}
                  placeholderTextColor={colors.foregroundSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={tfaCode}
                  onChangeText={setTfaCode}
                  style={[styles.input, styles.codeInput]}
                />
                <Pressable
                  onPress={verifyTfa}
                  disabled={tfaBusy}
                  style={[styles.submitBtn, tfaBusy && { opacity: 0.6 }]}
                >
                  <Text style={styles.submitBtnText}>
                    {tfaBusy ? t("doctor.parametres.verifying") : t("doctor.parametres.verifyActivate")}
                  </Text>
                </Pressable>
              </>
            )}
            {tfaStep === "codes" && (
              <>
                <View style={styles.successIcon}>
                  <Ionicons name="shield-checkmark" size={48} color={colors.teal} />
                </View>
                <Text style={styles.tfaInstr}>
                  {t("doctor.parametres.backupCodesHint")}
                </Text>
                <View style={styles.backupGrid}>
                  {tfaBackupCodes.map((c) => (
                    <View key={c} style={styles.backupCode}>
                      <Text style={styles.backupCodeText} selectable>{c}</Text>
                    </View>
                  ))}
                </View>
                <Pressable onPress={() => setTfaModal(false)} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>{t("doctor.parametres.done")}</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* 2FA disable modal */}
      <Modal visible={disableModal} animationType="slide" onRequestClose={() => setDisableModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Pressable onPress={() => setDisableModal(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={styles.modalTitle}>{t("doctor.parametres.disable2faTitle")}</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.tfaInstr}>
              {t("doctor.parametres.disable2faPrompt")}
            </Text>
            <TextInput
              placeholder={t("doctor.parametres.currentPassword")}
              placeholderTextColor={colors.foregroundSecondary}
              secureTextEntry
              value={disablePw}
              onChangeText={setDisablePw}
              style={styles.input}
            />
            <Pressable
              onPress={disableTfa}
              disabled={disableBusy}
              style={[styles.submitBtn, styles.submitBtnDanger, disableBusy && { opacity: 0.6 }]}
            >
              <Text style={styles.submitBtnText}>
                {disableBusy ? t("doctor.parametres.disabling") : t("doctor.parametres.disable2faBtn")}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function SysRow({
  icon,
  label,
  sublabel,
  value,
  onPress,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sublabel?: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.sysRow, !last && styles.sysRowBorder, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={styles.sysIconWrap}>
        <Ionicons name={icon} size={18} color={colors.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sysLabel}>{label}</Text>
        {sublabel ? <Text style={styles.sysSublabel}>{sublabel}</Text> : null}
      </View>
      {value ? <Text style={styles.sysValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </Pressable>
  );
}

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onChange}
      disabled={disabled}
      style={[styles.toggle, disabled && { opacity: 0.6 }]}
    >
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.switch, { backgroundColor: value ? colors.teal : "#CBD5E1" }]}>
        <View style={[styles.knob, { transform: [{ translateX: value ? 20 : 0 }] }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
    backgroundColor: colors.bg,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  tabBtnActive: { backgroundColor: colors.teal },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: colors.foreground },

  sysRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md,
  },
  sysRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  sysIconWrap: {
    width: 34, height: 34, borderRadius: radii.md,
    backgroundColor: colors.bg, alignItems: "center", justifyContent: "center",
  },
  sysLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  sysSublabel: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },
  sysValue: { fontSize: 13, color: colors.foregroundSecondary, marginRight: 4 },

  secRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  secLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  secSub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 1 },
  secBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secBtnDanger: { borderColor: colors.danger },
  secBtnText: { fontSize: 12, fontWeight: "700", color: colors.teal },
  tfaNote: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },

  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  toggleLabel: { flex: 1, fontSize: 13, color: colors.foreground },
  switch: { width: 44, height: 24, borderRadius: radii.full, padding: 2 },
  knob: { width: 20, height: 20, borderRadius: radii.full, backgroundColor: "#FFFFFF" },

  modal: { flex: 1, backgroundColor: colors.bg },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  modalBody: { padding: spacing.lg, gap: spacing.md },

  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 6,
  },
  submitBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  submitBtnDanger: { backgroundColor: colors.danger },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  tfaInstr: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  qrWrap: { alignItems: "center", paddingVertical: spacing.md },
  qr: { width: 200, height: 200, borderRadius: radii.md, backgroundColor: "#FFFFFF" },
  tfaSecretLabel: { fontSize: 11, color: colors.foregroundSecondary, marginTop: spacing.xs },
  tfaSecret: {
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.teal,
    backgroundColor: colors.bgSecondary,
    padding: spacing.sm,
    borderRadius: radii.md,
    textAlign: "center",
    letterSpacing: 2,
  },
  successIcon: { alignItems: "center", paddingVertical: spacing.md },
  backupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  backupCode: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backupCodeText: {
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "700",
    color: colors.foreground,
  },
});
