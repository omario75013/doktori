import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, colors, radii, spacing, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type TabId = "compte" | "notifications" | "securite" | "confidentialite" | "sessions" | "recherche";
const TABS: { id: TabId; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "compte", icon: "person-outline" },
  { id: "notifications", icon: "notifications-outline" },
  { id: "securite", icon: "lock-closed-outline" },
  { id: "confidentialite", icon: "shield-outline" },
  { id: "sessions", icon: "phone-portrait-outline" },
  { id: "recherche", icon: "flask-outline" },
];

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

export default function PatientParametres() {
  useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("compte");

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/(patient)/plus-menu" as never);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  return (
    <SafeAreaView edges={["top"]} style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => router.replace("/(patient)/plus-menu" as never)} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={s.title}>{t("patient.parametres.title")}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsRow}
      >
        {TABS.map((tt) => {
          const active = tab === tt.id;
          return (
            <Pressable
              key={tt.id}
              onPress={() => setTab(tt.id)}
              style={[s.tabBtn, active && s.tabBtnActive]}
            >
              <Ionicons
                name={tt.icon}
                size={14}
                color={active ? "#fff" : colors.foregroundSecondary}
              />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {t(`patient.parametres.tabs.${tt.id}` as never)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {tab === "compte" && <CompteTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "securite" && <SecuriteTab />}
        {tab === "confidentialite" && <ConfidentialiteTab />}
        {tab === "sessions" && <SessionsTab />}
        {tab === "recherche" && <RechercheTab />}
      </View>
    </SafeAreaView>
  );
}

// -------- Compte --------
type Patient = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: "M" | "F" | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
};

function CompteTab() {
  const [data, setData] = useState<Patient | null>(null);
  const [edit, setEdit] = useState<Patient>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const token = await getPatientToken();
      const p = await api<Patient>("/api/patients/me", { token: token ?? undefined });
      setData(p);
      setEdit(p);
    } catch {
      setErr(t("patient.parametres.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const token = await getPatientToken();
      const updated = await api<Patient>("/api/patients/me", {
        method: "PATCH",
        token: token ?? undefined,
        body: edit,
      });
      setData(updated);
      Alert.alert(t("patient.parametres.saved"));
    } catch {
      Alert.alert(t("patient.parametres.errorTitle"), t("patient.parametres.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <CenterLoader />;
  if (err) return <CenterError msg={err} onRetry={load} />;

  const set = <K extends keyof Patient>(k: K) => (v: string) =>
    setEdit((e) => ({ ...e, [k]: v }));

  return (
    <ScrollView contentContainerStyle={s.body}>
      <Field label={t("patient.parametres.compte.firstName")}>
        <TextInput style={s.input} value={edit.firstName ?? ""} onChangeText={set("firstName")} />
      </Field>
      <Field label={t("patient.parametres.compte.lastName")}>
        <TextInput style={s.input} value={edit.lastName ?? ""} onChangeText={set("lastName")} />
      </Field>
      <Field label={t("patient.parametres.compte.email")}>
        <TextInput
          style={s.input}
          value={edit.email ?? ""}
          onChangeText={set("email")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Field>
      <Field label={t("patient.parametres.compte.phone")}>
        <TextInput
          style={s.input}
          value={edit.phone ?? ""}
          onChangeText={set("phone")}
          keyboardType="phone-pad"
        />
      </Field>
      <Field label={t("patient.parametres.compte.dob")} hint="YYYY-MM-DD">
        <TextInput
          style={s.input}
          value={edit.dateOfBirth ?? ""}
          onChangeText={set("dateOfBirth")}
          autoCapitalize="none"
        />
      </Field>
      <Field label={t("patient.parametres.compte.gender")}>
        <View style={s.chipsRow}>
          {(["M", "F"] as const).map((g) => {
            const active = edit.gender === g;
            return (
              <Pressable
                key={g}
                onPress={() => setEdit((e) => ({ ...e, gender: active ? null : g }))}
                style={[s.chip, active && s.chipActive]}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {g === "M"
                    ? t("patient.parametres.compte.male")
                    : t("patient.parametres.compte.female")}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>
      <Field label={t("patient.parametres.compte.addressStreet")}>
        <TextInput
          style={s.input}
          value={edit.addressStreet ?? ""}
          onChangeText={set("addressStreet")}
        />
      </Field>
      <Field label={t("patient.parametres.compte.addressCity")}>
        <TextInput
          style={s.input}
          value={edit.addressCity ?? ""}
          onChangeText={set("addressCity")}
        />
      </Field>
      <Field label={t("patient.parametres.compte.addressPostalCode")}>
        <TextInput
          style={s.input}
          value={edit.addressPostalCode ?? ""}
          onChangeText={set("addressPostalCode")}
          keyboardType="number-pad"
        />
      </Field>
      <Pressable style={s.primaryBtn} onPress={save} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.primaryBtnText}>{t("patient.parametres.save")}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// -------- Notifications --------
type Prefs = {
  emailAppointments?: boolean;
  emailMarketing?: boolean;
  emailNews?: boolean;
  smsAppointments?: boolean;
  smsReminders?: boolean;
  smsOtp?: boolean;
  pushAppointments?: boolean;
  pushMessages?: boolean;
};

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Prefs>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const token = await getPatientToken();
      const p = await api<Prefs>("/api/me/notification-prefs", { token: token ?? undefined });
      setPrefs(p);
    } catch {
      setErr(t("patient.parametres.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function toggle(k: keyof Prefs) {
    const prev = prefs;
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    try {
      const token = await getPatientToken();
      await api("/api/me/notification-prefs", {
        method: "PUT",
        token: token ?? undefined,
        body: next,
      });
    } catch {
      setPrefs(prev);
      Alert.alert(t("patient.parametres.errorTitle"), t("patient.parametres.saveError"));
    }
  }

  if (loading) return <CenterLoader />;
  if (err) return <CenterError msg={err} onRetry={load} />;

  const groups: { label: string; items: { key: keyof Prefs; label: string }[] }[] = [
    {
      label: t("patient.parametres.notifs.emailGroup"),
      items: [
        { key: "emailAppointments", label: t("patient.parametres.notifs.emailAppointments") },
        { key: "emailMarketing", label: t("patient.parametres.notifs.emailMarketing") },
        { key: "emailNews", label: t("patient.parametres.notifs.emailNews") },
      ],
    },
    {
      label: t("patient.parametres.notifs.smsGroup"),
      items: [
        { key: "smsAppointments", label: t("patient.parametres.notifs.smsAppointments") },
        { key: "smsReminders", label: t("patient.parametres.notifs.smsReminders") },
        { key: "smsOtp", label: t("patient.parametres.notifs.smsOtp") },
      ],
    },
    {
      label: t("patient.parametres.notifs.pushGroup"),
      items: [
        { key: "pushAppointments", label: t("patient.parametres.notifs.pushAppointments") },
        { key: "pushMessages", label: t("patient.parametres.notifs.pushMessages") },
      ],
    },
  ];

  return (
    <ScrollView contentContainerStyle={s.body}>
      <Text style={s.intro}>{t("patient.parametres.notifs.intro")}</Text>
      {groups.map((g) => (
        <View key={g.label} style={{ gap: spacing.sm }}>
          <Text style={s.groupLabel}>{g.label}</Text>
          {g.items.map((it) => (
            <View key={it.key as string} style={s.toggleRow}>
              <Text style={s.toggleLabel}>{it.label}</Text>
              <Switch value={!!prefs[it.key]} onValueChange={() => toggle(it.key)} />
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// -------- Securite --------
function SecuriteTab() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState(false);

  async function change() {
    if (next.length < 8) {
      Alert.alert(t("patient.parametres.errorTitle"), t("patient.parametres.securite.tooShort"));
      return;
    }
    if (next !== conf) {
      Alert.alert(t("patient.parametres.errorTitle"), t("patient.parametres.securite.mismatch"));
      return;
    }
    setSaving(true);
    try {
      const token = await getPatientToken();
      await api("/api/me/password", {
        method: "POST",
        token: token ?? undefined,
        body: { currentPassword: cur, newPassword: next },
      });
      setCur("");
      setNext("");
      setConf("");
      Alert.alert(t("patient.parametres.securite.passwordChanged"));
    } catch (e) {
      const msg = (e as Error)?.message || t("patient.parametres.saveError");
      Alert.alert(t("patient.parametres.errorTitle"), msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.body}>
      <Field label={t("patient.parametres.securite.currentPassword")}>
        <TextInput style={s.input} value={cur} onChangeText={setCur} secureTextEntry />
      </Field>
      <Field label={t("patient.parametres.securite.newPassword")}>
        <TextInput style={s.input} value={next} onChangeText={setNext} secureTextEntry />
      </Field>
      <Field label={t("patient.parametres.securite.confirmPassword")}>
        <TextInput style={s.input} value={conf} onChangeText={setConf} secureTextEntry />
      </Field>
      <Pressable style={s.primaryBtn} onPress={change} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.primaryBtnText}>{t("patient.parametres.securite.change")}</Text>
        )}
      </Pressable>

      <View style={s.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.toggleLabel}>{t("patient.parametres.securite.biometric")}</Text>
          <Text style={s.hint}>{t("patient.parametres.securite.biometricHint")}</Text>
        </View>
        <Switch value={bio} onValueChange={setBio} />
      </View>
    </ScrollView>
  );
}

// -------- Confidentialite --------
function ConfidentialiteTab() {
  const [shareFamily, setShareFamily] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);

  return (
    <ScrollView contentContainerStyle={s.body}>
      <Text style={s.intro}>{t("patient.parametres.confid.intro")}</Text>
      <View style={s.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.toggleLabel}>{t("patient.parametres.confid.shareWithFamily")}</Text>
          <Text style={s.hint}>{t("patient.parametres.confid.shareWithFamilyHint")}</Text>
        </View>
        <Switch value={shareFamily} onValueChange={setShareFamily} />
      </View>
      <View style={s.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.toggleLabel}>{t("patient.parametres.confid.publicProfile")}</Text>
          <Text style={s.hint}>{t("patient.parametres.confid.publicProfileHint")}</Text>
        </View>
        <Switch value={publicProfile} onValueChange={setPublicProfile} />
      </View>
      <Pressable
        style={s.secondaryBtn}
        onPress={async () => {
          try {
            const token = await getPatientToken();
            await api("/api/me/data-export", { token: token ?? undefined });
            Alert.alert(t("patient.parametres.saved"));
          } catch {
            Alert.alert(t("patient.parametres.errorTitle"));
          }
        }}
      >
        <Ionicons name="download-outline" size={16} color={colors.foreground} />
        <Text style={s.secondaryBtnText}>{t("patient.parametres.confid.exportData")}</Text>
      </Pressable>
      <Pressable
        style={s.dangerBtn}
        onPress={() =>
          Alert.alert(
            t("patient.parametres.confid.deleteAccount"),
            t("patient.parametres.confid.deleteWarn"),
            [
              { text: t("patient.parametres.cancel"), style: "cancel" },
              { text: t("patient.parametres.confid.deleteAccount"), style: "destructive" },
            ],
          )
        }
      >
        <Ionicons name="trash-outline" size={16} color="#fff" />
        <Text style={s.dangerBtnText}>{t("patient.parametres.confid.deleteAccount")}</Text>
      </Pressable>
    </ScrollView>
  );
}

// -------- Sessions --------
type SessionRow = {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt?: string | null;
  isCurrent?: boolean;
};

function SessionsTab() {
  const [items, setItems] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const token = await getPatientToken();
      const r = await api<{ sessions: SessionRow[] }>("/api/me/sessions", {
        token: token ?? undefined,
      });
      setItems(r.sessions ?? []);
    } catch {
      setErr(t("patient.parametres.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function revoke(id: string) {
    const prev = items;
    setItems((arr) => arr.filter((x) => x.id !== id));
    try {
      const token = await getPatientToken();
      await api(`/api/me/sessions/${id}`, { method: "DELETE", token: token ?? undefined });
    } catch {
      setItems(prev);
      Alert.alert(t("patient.parametres.errorTitle"));
    }
  }

  async function revokeAll() {
    try {
      const token = await getPatientToken();
      await api("/api/me/sessions", { method: "DELETE", token: token ?? undefined });
      load();
    } catch {
      Alert.alert(t("patient.parametres.errorTitle"));
    }
  }

  if (loading) return <CenterLoader />;
  if (err) return <CenterError msg={err} onRetry={load} />;

  return (
    <ScrollView contentContainerStyle={s.body}>
      <Text style={s.intro}>{t("patient.parametres.sessions.intro")}</Text>
      {items.map((it) => (
        <View key={it.id} style={s.card}>
          <Ionicons
            name={it.isCurrent ? "phone-portrait" : "phone-portrait-outline"}
            size={22}
            color={it.isCurrent ? colors.teal : colors.foregroundSecondary}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {it.userAgent || "—"}
            </Text>
            <Text style={s.cardMeta}>
              {it.isCurrent ? t("patient.parametres.sessions.current") : it.ipAddress || ""}
              {it.createdAt ? ` · ${new Date(it.createdAt).toLocaleDateString()}` : ""}
            </Text>
          </View>
          {!it.isCurrent && (
            <Pressable onPress={() => revoke(it.id)} style={s.smallDanger}>
              <Text style={s.smallDangerText}>{t("patient.parametres.sessions.revoke")}</Text>
            </Pressable>
          )}
        </View>
      ))}
      {items.filter((x) => !x.isCurrent).length > 0 && (
        <Pressable style={s.dangerBtn} onPress={revokeAll}>
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text style={s.dangerBtnText}>{t("patient.parametres.sessions.revokeAll")}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// -------- Recherche médicale --------
type Consent = { consent: { acceptedAt?: string | null; allowed?: boolean } | null };

function RechercheTab() {
  const [data, setData] = useState<Consent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const token = await getPatientToken();
      const r = await api<Consent>("/api/me/anonymization-consent", {
        token: token ?? undefined,
      });
      setData(r);
    } catch {
      setErr(t("patient.parametres.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const allowed = !!data?.consent?.allowed;

  async function toggle() {
    setSaving(true);
    try {
      const token = await getPatientToken();
      const r = await api<Consent>("/api/me/anonymization-consent", {
        method: "PUT",
        token: token ?? undefined,
        body: { allowed: !allowed },
      });
      setData(r);
    } catch {
      Alert.alert(t("patient.parametres.errorTitle"), t("patient.parametres.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <CenterLoader />;
  if (err) return <CenterError msg={err} onRetry={load} />;

  return (
    <ScrollView contentContainerStyle={s.body}>
      <Text style={s.intro}>{t("patient.parametres.recherche.intro")}</Text>
      <View style={s.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.toggleLabel}>{t("patient.parametres.recherche.consent")}</Text>
          <Text style={s.hint}>{t("patient.parametres.recherche.consentHint")}</Text>
        </View>
        <Switch value={allowed} onValueChange={toggle} disabled={saving} />
      </View>
      {allowed && data?.consent?.acceptedAt ? (
        <Text style={s.hint}>
          {t("patient.parametres.recherche.givenAt")}{" "}
          {new Date(data.consent.acceptedAt).toLocaleDateString()}
        </Text>
      ) : null}
    </ScrollView>
  );
}

// -------- shared bits --------
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
        <Text style={s.label}>{label}</Text>
        {hint ? <Text style={s.labelHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function CenterLoader() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.teal} />
      <Text style={s.muted}>{t("patient.parametres.loading")}</Text>
    </View>
  );
}

function CenterError({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.errText}>{msg}</Text>
      <Pressable style={s.secondaryBtn} onPress={onRetry}>
        <Text style={s.secondaryBtnText}>{t("patient.parametres.retry")}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
  },
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabsRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, alignItems: "center" },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  tabBtnActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  tabLabel: { fontSize: 13, color: colors.foregroundSecondary },
  tabLabelActive: { color: "#fff", fontWeight: "700" },
  body: { padding: spacing.lg, gap: spacing.lg },
  intro: { fontSize: 13, color: colors.foregroundSecondary, lineHeight: 18 },
  groupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  label: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  labelHint: { fontSize: 12, color: colors.foregroundSecondary },
  hint: { fontSize: 12, color: colors.foregroundSecondary },
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
  chipTextActive: { color: "#fff", fontWeight: "700" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: { flex: 1, fontSize: 14, color: colors.foreground },
  primaryBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { color: colors.foreground, fontWeight: "600", fontSize: 14 },
  dangerBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  smallDanger: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  smallDangerText: { color: "#DC2626", fontSize: 12, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  cardMeta: { fontSize: 12, color: colors.foregroundSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  muted: { fontSize: 13, color: colors.foregroundSecondary },
  errText: { fontSize: 14, color: "#DC2626", textAlign: "center" },
});
