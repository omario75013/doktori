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
  cancelAlertChannels: string[];
  cancelAlertTemplate: string | null;
  reminderOffsetsHours: number[];
  cancelAlertOffsetsHours: number[];
};

type Me = {
  totpEnabled: boolean;
  totpEnrolledAt?: string | null;
};

type Tab = "notifications" | "reminders" | "cancelAlerts" | "signature" | "security" | "about" | "systeme";

const REMINDER_PRESETS: { hours: number; key: string }[] = [
  { hours: 168, key: "reminder7Days" },
  { hours: 72, key: "reminder3Days" },
  { hours: 48, key: "reminder48Hours" },
  { hours: 24, key: "reminder24Hours" },
  { hours: 4, key: "reminder4Hours" },
  { hours: 2, key: "reminder2Hours" },
  { hours: 1, key: "reminder1Hour" },
];

const CANCEL_PRESETS: { hours: number; key: string }[] = [
  { hours: 0, key: "cancelImmediate" },
  { hours: 1, key: "cancel1HourBefore" },
  { hours: 2, key: "cancel2HoursBefore" },
  { hours: 4, key: "cancel4HoursBefore" },
  { hours: 24, key: "cancel24HoursBefore" },
];

const CHANNELS: { value: string; key: string }[] = [
  { value: "email", key: "channelEmail" },
  { value: "sms", key: "channelSms" },
  { value: "push", key: "channelPush" },
];

const CANCEL_WINDOW_OPTIONS = [0, 1, 2, 4, 12, 24, 48];

export default function Parametres() {
  const { locale } = useLocale();
  const [tab, setTab] = useState<Tab>("notifications");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Système tab
  const [cacheCleared, setCacheCleared] = useState(false);

  // Cancel window (separate API)
  const [cancelWindowHours, setCancelWindowHours] = useState<number>(2);
  const [savingCancelWindow, setSavingCancelWindow] = useState(false);

  // Signature
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureBusy, setSignatureBusy] = useState(false);

  // Saving banner for prefs
  const [savingPrefs, setSavingPrefs] = useState(false);

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
      try {
        const cw = await api<{ hours: number }>("/api/doctor/cancel-window");
        if (typeof cw?.hours === "number") setCancelWindowHours(cw.hours);
      } catch {
        /* ignore */
      }
      try {
        const sig = await api<{ signatureUrl: string | null }>("/api/doctor/signature");
        if (sig && typeof sig.signatureUrl === "string") setSignatureUrl(sig.signatureUrl);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function savePrefs(next: Prefs) {
    setPrefs(next);
    setSavingPrefs(true);
    try {
      await api("/api/doctor/notification-prefs", { method: "PUT", body: next });
    } catch {
      Alert.alert(t("common.error"), t("doctor.parametres.saveError"));
    } finally {
      setSavingPrefs(false);
    }
  }

  function toggleOffset(field: "reminderOffsetsHours" | "cancelAlertOffsetsHours", hours: number) {
    if (!prefs) return;
    const cur = prefs[field] ?? [];
    const has = cur.includes(hours);
    const next = {
      ...prefs,
      [field]: has ? cur.filter((h) => h !== hours) : [...cur, hours].sort((a, b) => b - a),
    };
    void savePrefs(next);
  }

  function toggleCancelChannel(channel: string) {
    if (!prefs) return;
    const cur = prefs.cancelAlertChannels ?? [];
    const has = cur.includes(channel);
    void savePrefs({
      ...prefs,
      cancelAlertChannels: has ? cur.filter((c) => c !== channel) : [...cur, channel],
    });
  }

  async function saveCancelWindow(hours: number) {
    setSavingCancelWindow(true);
    try {
      const d = await api<{ hours: number }>("/api/doctor/cancel-window", {
        method: "PATCH",
        body: { hours },
      });
      if (typeof d?.hours === "number") setCancelWindowHours(d.hours);
    } catch {
      Alert.alert(t("common.error"), t("doctor.parametres.saveError"));
    } finally {
      setSavingCancelWindow(false);
    }
  }

  async function pickAndUploadSignature() {
    let ImagePicker: typeof import("expo-image-picker") | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ImagePicker = require("expo-image-picker");
    } catch {
      Alert.alert(t("common.error"), t("doctor.verification.pickerMissing"));
      return;
    }
    if (!ImagePicker) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("common.error"), t("doctor.verification.permDenied"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setSignatureBusy(true);
      const form = new FormData();
      const filename = asset.fileName ?? `signature-${Date.now()}.png`;
      const mime = asset.mimeType ?? "image/png";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.append("file", { uri: asset.uri, name: filename, type: mime } as any);
      const r = await api<{ signatureUrl: string }>("/api/doctor/signature", {
        method: "POST",
        body: form,
        noRedirect: true,
      });
      if (r?.signatureUrl) setSignatureUrl(r.signatureUrl);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("doctor.parametres.saveError"));
    } finally {
      setSignatureBusy(false);
    }
  }

  function removeSignature() {
    Alert.alert(
      t("doctor.parametres.signatureRemove"),
      t("doctor.parametres.signatureRemoveConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("doctor.parametres.signatureRemove"),
          style: "destructive",
          onPress: async () => {
            setSignatureBusy(true);
            try {
              await api("/api/doctor/signature", { method: "DELETE" });
              setSignatureUrl(null);
            } catch {
              Alert.alert(t("common.error"), t("doctor.parametres.saveError"));
            } finally {
              setSignatureBusy(false);
            }
          },
        },
      ]
    );
  }

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        <TabButton tab="notifications" current={tab} setTab={setTab} icon="notifications" label={t("doctor.parametres.tabNotifs")} />
        <TabButton tab="reminders" current={tab} setTab={setTab} icon="alarm" label={t("doctor.parametres.tabReminders")} />
        <TabButton tab="cancelAlerts" current={tab} setTab={setTab} icon="warning" label={t("doctor.parametres.tabCancelAlerts")} />
        <TabButton tab="signature" current={tab} setTab={setTab} icon="create" label={t("doctor.parametres.tabSignature")} />
        <TabButton tab="security" current={tab} setTab={setTab} icon="shield-checkmark" label={t("doctor.parametres.tabSecurity")} />
        <TabButton tab="systeme" current={tab} setTab={setTab} icon="settings" label={t("doctor.parametres.tabSystem")} />
        <TabButton tab="about" current={tab} setTab={setTab} icon="information-circle" label={t("doctor.parametres.tabAbout")} />
      </ScrollView>

      <Screen>
        {tab === "notifications" && (
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
        )}

        {tab === "reminders" && (
          <>
            <Card title={t("doctor.parametres.remindersActivation")}>
              <Toggle
                label={t("doctor.parametres.sendReminders")}
                value={prefs.pushRemindersEnabled}
                onChange={() => toggle("pushRemindersEnabled")}
                disabled={saving === "pushRemindersEnabled"}
              />
            </Card>
            <Card title={t("doctor.parametres.whenToSendReminder")}>
              <Text style={styles.sectionDesc}>
                {t("doctor.parametres.whenToSendReminderDesc")}
              </Text>
              <View style={styles.chipsWrap}>
                {REMINDER_PRESETS.map((p) => {
                  const active = (prefs.reminderOffsetsHours ?? []).includes(p.hours);
                  return (
                    <Pressable
                      key={p.hours}
                      disabled={!prefs.pushRemindersEnabled || savingPrefs}
                      onPress={() => toggleOffset("reminderOffsetsHours", p.hours)}
                      style={[
                        styles.chip,
                        active && styles.chipActive,
                        (!prefs.pushRemindersEnabled || savingPrefs) && { opacity: 0.5 },
                      ]}
                    >
                      <Text style={[styles.chipText, active && { color: "#FFFFFF" }]}>
                        {t(`doctor.parametres.${p.key}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {prefs.reminderOffsetsHours
                ?.filter((h) => !REMINDER_PRESETS.some((p) => p.hours === h))
                .map((h) => (
                  <Pressable
                    key={`custom-${h}`}
                    onPress={() => toggleOffset("reminderOffsetsHours", h)}
                    style={[styles.chip, styles.chipActive, { alignSelf: "flex-start", marginTop: 6 }]}
                  >
                    <Text style={[styles.chipText, { color: "#FFFFFF" }]}>
                      {h}
                      {t("doctor.parametres.hours")}
                    </Text>
                  </Pressable>
                ))}
            </Card>
          </>
        )}

        {tab === "cancelAlerts" && (
          <>
            <Card title={t("doctor.parametres.cancelChannels")}>
              <Text style={styles.sectionDesc}>{t("doctor.parametres.cancelChannelsDesc")}</Text>
              <View style={styles.chipsWrap}>
                {CHANNELS.map((c) => {
                  const active = (prefs.cancelAlertChannels ?? []).includes(c.value);
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => toggleCancelChannel(c.value)}
                      disabled={savingPrefs}
                      style={[styles.chip, active && styles.chipActive, savingPrefs && { opacity: 0.6 }]}
                    >
                      <Text style={[styles.chipText, active && { color: "#FFFFFF" }]}>
                        {t(`doctor.parametres.${c.key}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <Card title={t("doctor.parametres.whenToNotifyPatient")}>
              <Text style={styles.sectionDesc}>{t("doctor.parametres.whenToNotifyPatientDesc")}</Text>
              <View style={styles.chipsWrap}>
                {CANCEL_PRESETS.map((p) => {
                  const active = (prefs.cancelAlertOffsetsHours ?? []).includes(p.hours);
                  return (
                    <Pressable
                      key={p.hours}
                      onPress={() => toggleOffset("cancelAlertOffsetsHours", p.hours)}
                      disabled={savingPrefs}
                      style={[styles.chip, active && styles.chipActive, savingPrefs && { opacity: 0.6 }]}
                    >
                      <Text style={[styles.chipText, active && { color: "#FFFFFF" }]}>
                        {t(`doctor.parametres.${p.key}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <Card title={t("doctor.parametres.messageTemplate")}>
              <TextInput
                value={prefs.cancelAlertTemplate ?? ""}
                onChangeText={(v) => setPrefs({ ...prefs, cancelAlertTemplate: v })}
                onBlur={() => prefs && savePrefs(prefs)}
                placeholder={t("doctor.parametres.messageTemplatePlaceholder")}
                placeholderTextColor={colors.foregroundSecondary}
                multiline
                style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
              />
              <Text style={[styles.sectionDesc, { marginTop: 6 }]}>
                {t("doctor.parametres.messageTemplateHint")}
              </Text>
            </Card>

            <Card title={t("doctor.parametres.patientCancelWindow")}>
              <Text style={styles.sectionDesc}>{t("doctor.parametres.patientCancelWindowDesc")}</Text>
              <View style={styles.chipsWrap}>
                {CANCEL_WINDOW_OPTIONS.map((h) => {
                  const active = cancelWindowHours === h;
                  const label =
                    h === 0
                      ? t("doctor.parametres.noDelay")
                      : h < 24
                      ? `${h}${t("doctor.parametres.hours")}`
                      : `${h / 24}${t("doctor.parametres.days")}`;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => saveCancelWindow(h)}
                      disabled={savingCancelWindow}
                      style={[styles.chip, active && styles.chipActive, savingCancelWindow && { opacity: 0.6 }]}
                    >
                      <Text style={[styles.chipText, active && { color: "#FFFFFF" }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.sectionDesc, { marginTop: 6 }]}>
                {t("doctor.parametres.currentValue")}{" "}
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {cancelWindowHours === 0
                    ? t("doctor.parametres.noDelay")
                    : `${cancelWindowHours}${t("doctor.parametres.hours")}`}
                </Text>
              </Text>
            </Card>
          </>
        )}

        {tab === "signature" && (
          <>
            <Card title={t("doctor.parametres.tabSignature")}>
              <Text style={styles.sectionDesc}>{t("doctor.parametres.signatureDesc")}</Text>
              {signatureUrl ? (
                <View style={{ alignItems: "center", paddingVertical: spacing.md }}>
                  <Image
                    source={{ uri: signatureUrl }}
                    style={{ width: 240, height: 100, resizeMode: "contain", backgroundColor: "#FFFFFF", borderRadius: radii.md, borderWidth: 1, borderColor: colors.border }}
                  />
                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                    <Pressable
                      onPress={pickAndUploadSignature}
                      disabled={signatureBusy}
                      style={[styles.secBtn, signatureBusy && { opacity: 0.5 }]}
                    >
                      <Text style={styles.secBtnText}>{t("doctor.parametres.signatureReplace")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={removeSignature}
                      disabled={signatureBusy}
                      style={[styles.secBtn, styles.secBtnDanger, signatureBusy && { opacity: 0.5 }]}
                    >
                      <Text style={[styles.secBtnText, { color: colors.danger }]}>
                        {t("doctor.parametres.signatureRemove")}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={pickAndUploadSignature}
                  disabled={signatureBusy}
                  style={[styles.uploadBox, signatureBusy && { opacity: 0.5 }]}
                >
                  <Ionicons name="cloud-upload-outline" size={28} color={colors.teal} />
                  <Text style={styles.uploadTitle}>{t("doctor.parametres.signatureUpload")}</Text>
                  <Text style={styles.sectionDesc}>{t("doctor.parametres.signatureHint")}</Text>
                </Pressable>
              )}
              <Banner>{t("doctor.parametres.signatureDrawSoon")}</Banner>
            </Card>
          </>
        )}

        {tab === "security" && (
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
        )}

        {tab === "about" && (
          <>
            <Card title={t("doctor.parametres.aboutAppName")}>
              <View style={styles.aboutHead}>
                <View style={styles.aboutIcon}>
                  <Ionicons name="shield-checkmark" size={28} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aboutTitle}>{t("doctor.parametres.aboutAppName")}</Text>
                  <Text style={styles.sectionDesc}>{t("doctor.parametres.aboutVersionLabel")}</Text>
                </View>
              </View>
              <Text style={[styles.sectionDesc, { lineHeight: 20, marginTop: spacing.sm }]}>
                {t("doctor.parametres.aboutDescriptionFull")}
              </Text>
              <View style={styles.aboutGrid}>
                <View style={styles.aboutCell}>
                  <Text style={styles.aboutCellLabel}>{t("doctor.parametres.aboutDeveloper")}</Text>
                  <Text style={styles.aboutCellValue}>RandomWalkers</Text>
                </View>
                <View style={styles.aboutCell}>
                  <Text style={styles.aboutCellLabel}>{t("doctor.parametres.aboutPlatform")}</Text>
                  <Pressable onPress={() => Linking.openURL("https://doktori.tn")}>
                    <Text style={[styles.aboutCellValue, { color: colors.teal }]}>doktori.tn</Text>
                  </Pressable>
                </View>
                <View style={styles.aboutCell}>
                  <Text style={styles.aboutCellLabel}>{t("doctor.parametres.aboutRights")}</Text>
                  <Text style={styles.aboutCellValue}>{t("doctor.parametres.aboutRightsValue")}</Text>
                </View>
                <View style={styles.aboutCell}>
                  <Text style={styles.aboutCellLabel}>{t("doctor.parametres.aboutLicence")}</Text>
                  <Text style={styles.aboutCellValue}>{t("doctor.parametres.aboutLicenceValue")}</Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {tab === "systeme" && (
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

function TabButton({
  tab,
  current,
  setTab,
  icon,
  label,
}: {
  tab: Tab;
  current: Tab;
  setTab: (t: Tab) => void;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  const active = current === tab;
  return (
    <Pressable
      onPress={() => setTab(tab)}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Ionicons name={icon} size={14} color={active ? "#FFFFFF" : colors.foreground} />
      <Text style={[styles.tabBtnText, active && { color: "#FFFFFF" }]}>{label}</Text>
    </Pressable>
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
    flexGrow: 0,
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

  tabBarContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },

  sectionDesc: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
  },

  uploadBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: 4,
    marginVertical: spacing.sm,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 6,
  },

  aboutHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  aboutIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
  },
  aboutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  aboutCell: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.bgSecondary,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  aboutCellLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 2,
  },
  aboutCellValue: {
    fontSize: 13,
    color: colors.foregroundSecondary,
  },
});
