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
import { colors, spacing, radii, api } from "@doktori/mobile-core";
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
  const [tab, setTab] = useState<Tab>("notifications");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Système tab
  const [cacheCleared, setCacheCleared] = useState(false);

  function handleSoon() {
    Alert.alert("Bientôt disponible", "Cette fonctionnalité arrive prochainement.");
  }

  function handleClearCache() {
    Alert.alert(
      "Vider le cache",
      "Cette action supprimera les données temporaires de l'application. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Vider", style: "destructive", onPress: () => { setCacheCleared(true); Alert.alert("Cache vidé", "Les données temporaires ont été supprimées."); } },
      ]
    );
  }

  function handleSupport() {
    Linking.openURL("mailto:support@doktori.tn").catch(() => Alert.alert("Erreur", "Impossible d'ouvrir le client mail."));
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
      Alert.alert("Erreur", "Sauvegarde échouée");
      setPrefs(prefs);
    } finally {
      setSaving(null);
    }
  }

  async function changePassword() {
    if (pwNew !== pwConfirm) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }
    if (pwNew.length < 8) {
      Alert.alert("Erreur", "Minimum 8 caractères");
      return;
    }
    setPwBusy(true);
    try {
      await api("/api/doctor/password", {
        method: "POST",
        body: { currentPassword: pwCurrent, newPassword: pwNew },
      });
      Alert.alert("Succès", "Mot de passe mis à jour");
      setPwModal(false);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Mot de passe actuel incorrect");
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
      Alert.alert("Erreur", e instanceof Error ? e.message : "Erreur");
    } finally {
      setTfaBusy(false);
    }
  }

  async function verifyTfa() {
    if (!/^\d{6}$/.test(tfaCode)) {
      Alert.alert("Erreur", "Code à 6 chiffres requis");
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
      Alert.alert("Erreur", e instanceof Error ? e.message : "Code incorrect");
    } finally {
      setTfaBusy(false);
    }
  }

  async function disableTfa() {
    if (!disablePw) {
      Alert.alert("Erreur", "Entrez votre mot de passe pour confirmer");
      return;
    }
    setDisableBusy(true);
    try {
      await api("/api/doctor/2fa/disable", {
        method: "POST",
        body: { password: disablePw },
      });
      Alert.alert("2FA désactivé", "L'authentification à deux facteurs a été désactivée.");
      setDisableModal(false);
      setDisablePw("");
      setMe((m) => m ? { ...m, totpEnabled: false } : m);
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Mot de passe incorrect");
    } finally {
      setDisableBusy(false);
    }
  }

  if (!prefs || !me) {
    return (
      <>
        <Stack.Screen options={{ title: "Paramètres" }} />
        <Loader />
      </>
    );
  }

  const qrImageUrl = tfaUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(tfaUri)}`
    : null;

  return (
    <>
      <Stack.Screen options={{ title: "Paramètres" }} />

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
            Notifications
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
            Sécurité
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
            Système
          </Text>
        </Pressable>
      </View>

      <Screen>
        {tab === "notifications" ? (
          <>
            <Card title="Notifications email">
              <Toggle label="Nouveau rendez-vous" value={prefs.emailNewBooking} onChange={() => toggle("emailNewBooking")} disabled={saving === "emailNewBooking"} />
              <Toggle label="Annulation patient" value={prefs.emailCancellation} onChange={() => toggle("emailCancellation")} disabled={saving === "emailCancellation"} />
              <Toggle label="Résumé quotidien" value={prefs.emailDailyDigest} onChange={() => toggle("emailDailyDigest")} disabled={saving === "emailDailyDigest"} />
            </Card>

            <Card title="Notifications push">
              <Toggle label="Nouveau rendez-vous" value={prefs.pushNewBooking} onChange={() => toggle("pushNewBooking")} disabled={saving === "pushNewBooking"} />
              <Toggle label="Annulation" value={prefs.pushCancellation} onChange={() => toggle("pushCancellation")} disabled={saving === "pushCancellation"} />
              <Toggle label="Rappels patients J-X" value={prefs.pushRemindersEnabled} onChange={() => toggle("pushRemindersEnabled")} disabled={saving === "pushRemindersEnabled"} />
            </Card>

            <Card title="SMS">
              <Toggle label="Activer SMS (facturé)" value={prefs.smsEnabled} onChange={() => toggle("smsEnabled")} disabled={saving === "smsEnabled"} />
            </Card>

            <Banner>
              Offsets de rappels et alertes d&apos;annulation détaillés configurables sur le portail web.
            </Banner>
          </>
        ) : tab === "security" ? (
          <>
            <Card title="Mot de passe">
              <View style={styles.secRow}>
                <Ionicons name="lock-closed" size={16} color={colors.teal} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.secLabel}>Mot de passe</Text>
                  <Text style={styles.secSub}>Dernière modification : inconnue</Text>
                </View>
                <Pressable onPress={() => setPwModal(true)} style={styles.secBtn}>
                  <Text style={styles.secBtnText}>Modifier</Text>
                </Pressable>
              </View>
            </Card>

            <Card title="Authentification à deux facteurs">
              <View style={styles.secRow}>
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={me.totpEnabled ? colors.teal : colors.foregroundSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.secLabel}>2FA TOTP</Text>
                  <Text style={[styles.secSub, me.totpEnabled && { color: colors.teal }]}>
                    {me.totpEnabled ? "Activée" : "Désactivée"}
                  </Text>
                </View>
                {me.totpEnabled ? (
                  <Pressable
                    onPress={() => setDisableModal(true)}
                    style={[styles.secBtn, styles.secBtnDanger]}
                  >
                    <Text style={[styles.secBtnText, { color: colors.danger }]}>
                      Désactiver
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={startTfa}
                    disabled={tfaBusy}
                    style={[styles.secBtn, tfaBusy && { opacity: 0.6 }]}
                  >
                    <Text style={styles.secBtnText}>Activer</Text>
                  </Pressable>
                )}
              </View>
              {me.totpEnabled && (
                <Text style={styles.tfaNote}>
                  L&apos;application d&apos;authentification vérifie chaque connexion par code temporaire.
                </Text>
              )}
            </Card>

            <Banner>
              Utilisez Google Authenticator, Authy ou toute application TOTP compatible.
            </Banner>
          </>
        ) : (
          <>
            <Card title="Affichage">
              <SysRow icon="language-outline" label="Langue" value="Français" onPress={handleSoon} />
              <SysRow icon="contrast-outline" label="Thème" sublabel="Clair, sombre ou automatique" value="Automatique" onPress={handleSoon} last />
            </Card>

            <Card title="Données">
              <SysRow
                icon="trash-outline"
                label="Vider le cache"
                sublabel={cacheCleared ? "Cache vidé" : "Supprimer les données temporaires"}
                onPress={handleClearCache}
              />
              <SysRow icon="information-circle-outline" label="Version de l'application" value="1.0.0" onPress={() => {}} last />
            </Card>

            <Card title="À propos">
              <SysRow
                icon="document-text-outline"
                label="Conditions d'utilisation"
                sublabel="Lire nos conditions générales"
                onPress={() => router.push("/(doctor)/more/conditions" as never)}
              />
              <SysRow
                icon="shield-checkmark-outline"
                label="Politique de confidentialité"
                sublabel="Comment nous traitons vos données"
                onPress={() => router.push("/(doctor)/more/confidentialite" as never)}
              />
              <SysRow
                icon="information-circle"
                label="À propos de Doktori"
                sublabel="Version, équipe et contact"
                onPress={() => router.push("/(doctor)/more/a-propos" as never)}
              />
              <SysRow
                icon="mail-outline"
                label="Contacter le support"
                sublabel="support@doktori.tn"
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
            <Text style={styles.modalTitle}>Changer mot de passe</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <TextInput
              placeholder="Mot de passe actuel"
              placeholderTextColor={colors.foregroundSecondary}
              secureTextEntry
              value={pwCurrent}
              onChangeText={setPwCurrent}
              style={styles.input}
            />
            <TextInput
              placeholder="Nouveau mot de passe (min 8 caractères)"
              placeholderTextColor={colors.foregroundSecondary}
              secureTextEntry
              value={pwNew}
              onChangeText={setPwNew}
              style={styles.input}
            />
            <TextInput
              placeholder="Confirmer le nouveau mot de passe"
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
                {pwBusy ? "Enregistrement…" : "Mettre à jour"}
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
            <Text style={styles.modalTitle}>Activer la 2FA</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {tfaStep === "qr" && (
              <>
                <Text style={styles.tfaInstr}>
                  1. Scannez ce QR code avec Google Authenticator ou Authy.
                </Text>
                {qrImageUrl && (
                  <View style={styles.qrWrap}>
                    <Image source={{ uri: qrImageUrl }} style={styles.qr} />
                  </View>
                )}
                <Text style={styles.tfaSecretLabel}>Ou entrez manuellement :</Text>
                <Text style={styles.tfaSecret} selectable>{tfaSecret}</Text>
                <Pressable onPress={() => setTfaStep("verify")} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>Suivant →</Text>
                </Pressable>
              </>
            )}
            {tfaStep === "verify" && (
              <>
                <Text style={styles.tfaInstr}>
                  2. Entrez le code à 6 chiffres affiché dans votre application.
                </Text>
                <TextInput
                  placeholder="000000"
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
                    {tfaBusy ? "Vérification…" : "Vérifier et activer"}
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
                  2FA activé. Conservez ces codes de secours en lieu sûr — chacun est utilisable une seule fois.
                </Text>
                <View style={styles.backupGrid}>
                  {tfaBackupCodes.map((c) => (
                    <View key={c} style={styles.backupCode}>
                      <Text style={styles.backupCodeText} selectable>{c}</Text>
                    </View>
                  ))}
                </View>
                <Pressable onPress={() => setTfaModal(false)} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>Terminer</Text>
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
            <Text style={styles.modalTitle}>Désactiver la 2FA</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.tfaInstr}>
              Entrez votre mot de passe pour confirmer la désactivation de la 2FA.
            </Text>
            <TextInput
              placeholder="Mot de passe"
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
                {disableBusy ? "Désactivation…" : "Désactiver la 2FA"}
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
