import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Pressable,
  Share,
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

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

type Referral = {
  code: string;
  usesCount?: number;
  rewardsEarned?: number;
  stats?: { friendsJoined: number; rdvTaken: number; rewardsEarned: number };
};

type Invite = {
  id: string;
  to: string;
  status: "pending" | "joined" | "rewarded";
  createdAt: string;
};

const SHARE_BASE = "https://doktori.tn/r/";

export default function PatientMonParrainage() {
  useLocale();
  const router = useRouter();
  const [data, setData] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [invite, setInvite] = useState("");
  const [sending, setSending] = useState(false);
  // The /api/patient/parrainage history endpoint doesn't exist server-side yet
  // (only /api/me/referral GET returns code+stats). Show stub history list.
  const [history] = useState<Invite[]>([]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const token = await getPatientToken();
      const r = await api<Referral>("/api/me/referral", { token: token ?? undefined });
      setData(r);
    } catch {
      setErr(t("patient.parrainage.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/(patient)/plus-menu" as never);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  async function copyCode() {
    if (!data?.code) return;
    // expo-clipboard not installed — show the code in an alert so user can long-press to copy
    Alert.alert(t("patient.parrainage.code"), data.code);
  }

  async function shareLink() {
    if (!data?.code) return;
    const url = `${SHARE_BASE}${data.code}`;
    try {
      await Share.share({ message: url, url });
    } catch {}
  }

  async function sendInvite() {
    const v = invite.trim();
    if (!v) return;
    setSending(true);
    try {
      // Stub: no /api/me/referral/invite endpoint yet — wire later
      // For now, just acknowledge success locally.
      await new Promise((r) => setTimeout(r, 300));
      setInvite("");
      Alert.alert(t("patient.parrainage.invite.sent"));
    } catch {
      Alert.alert(
        t("patient.parrainage.errorTitle"),
        t("patient.parrainage.invite.error"),
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={s.root}>
        <Header onBack={() => router.replace("/(patient)/plus-menu" as never)} />
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      </SafeAreaView>
    );
  }

  if (err) {
    return (
      <SafeAreaView edges={["top"]} style={s.root}>
        <Header onBack={() => router.replace("/(patient)/plus-menu" as never)} />
        <View style={s.center}>
          <Text style={s.errText}>{err}</Text>
          <Pressable onPress={load} style={s.primaryBtn}>
            <Text style={s.primaryBtnText}>{t("patient.parrainage.retry")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const stats = data?.stats || { friendsJoined: 0, rdvTaken: 0, rewardsEarned: 0 };
  const link = data?.code ? `${SHARE_BASE}${data.code}` : "";

  return (
    <SafeAreaView edges={["top"]} style={s.root}>
      <Header onBack={() => router.replace("/(patient)/plus-menu" as never)} />
      <FlatList
        data={history}
        keyExtractor={(it) => it.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg }}>
            <View style={s.codeCard}>
              <Text style={s.codeLabel}>{t("patient.parrainage.yourCode")}</Text>
              <Text style={s.code}>{data?.code || "—"}</Text>
              <View style={s.row}>
                <Pressable onPress={copyCode} style={s.secondaryBtn}>
                  <Ionicons name="copy-outline" size={16} color={colors.foreground} />
                  <Text style={s.secondaryBtnText}>{t("patient.parrainage.copy")}</Text>
                </Pressable>
                <Pressable onPress={shareLink} style={s.primaryBtn}>
                  <Ionicons name="share-social-outline" size={16} color="#fff" />
                  <Text style={s.primaryBtnText}>{t("patient.parrainage.share")}</Text>
                </Pressable>
              </View>
              <Text style={s.linkText} numberOfLines={1}>
                {link}
              </Text>
            </View>

            <View style={s.statsRow}>
              <StatBox
                icon="people-outline"
                value={stats.friendsJoined}
                label={t("patient.parrainage.stats.friends")}
              />
              <StatBox
                icon="calendar-outline"
                value={stats.rdvTaken}
                label={t("patient.parrainage.stats.rdv")}
              />
              <StatBox
                icon="gift-outline"
                value={stats.rewardsEarned}
                label={t("patient.parrainage.stats.rewards")}
              />
            </View>

            <View style={s.inviteCard}>
              <Text style={s.cardTitle}>{t("patient.parrainage.invite.title")}</Text>
              <TextInput
                style={s.input}
                value={invite}
                onChangeText={setInvite}
                placeholder={t("patient.parrainage.invite.emailOrPhone")}
                placeholderTextColor={colors.foregroundSecondary}
                autoCapitalize="none"
              />
              <Pressable
                style={s.primaryBtn}
                onPress={sendInvite}
                disabled={sending || !invite.trim()}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.primaryBtnText}>{t("patient.parrainage.invite.send")}</Text>
                )}
              </Pressable>
            </View>

            <View style={s.howCard}>
              <Text style={s.cardTitle}>{t("patient.parrainage.howItWorks")}</Text>
              <Text style={s.hint}>{t("patient.parrainage.howItWorksBody")}</Text>
            </View>

            <Text style={s.sectionTitle}>{t("patient.parrainage.history.title")}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="paper-plane-outline" size={36} color={colors.border} />
            <Text style={s.hint}>{t("patient.parrainage.history.empty")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.histRow}>
            <Ionicons name="person-outline" size={18} color={colors.foregroundSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.to}</Text>
              <Text style={s.hint}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={s.statusPill}>
              {t(`patient.parrainage.history.status.${item.status}` as never)}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} style={s.back} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.foreground} />
      </Pressable>
      <Text style={s.title}>{t("patient.parrainage.title")}</Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={20} color={colors.teal} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>
        {label}
      </Text>
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
  list: { padding: spacing.lg, gap: spacing.md },
  codeCard: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  codeLabel: { fontSize: 12, color: colors.foregroundSecondary, textTransform: "uppercase" },
  code: { fontSize: 32, fontWeight: "800", color: colors.teal, letterSpacing: 4 },
  row: { flexDirection: "row", gap: spacing.sm },
  linkText: { fontSize: 12, color: colors.foregroundSecondary },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  statLabel: { fontSize: 11, color: colors.foregroundSecondary, textAlign: "center" },
  inviteCard: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  howCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 6,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  hint: { fontSize: 12, color: colors.foregroundSecondary, lineHeight: 18 },
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
  primaryBtn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
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
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.foreground, marginTop: spacing.sm },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusPill: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.teal,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  empty: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  errText: { fontSize: 14, color: "#DC2626", textAlign: "center" },
});
