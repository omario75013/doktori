import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Card, Loader, Empty, formatDate } from "./_ui";

// Doctor → doctor referral (different concept from more/parrainage.tsx which
// is patient referrals). 5% commission on the referred doctor's first 3
// months. Mirrors apps/web/app/(medecin)/parrainage-medecin/page.tsx.

type Stats = {
  sentCount: number;
  validatedCount: number;
  totalRewardsTnd: number;
};

type Referral = {
  id: string;
  status: "pending" | "validated" | "rejected" | string;
  rewardsEarnedTnd: number | string;
  validatedAt: string | null;
  createdAt: string;
  rejectionReason: string | null;
  referredName: string;
  referredEmail: string;
};

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FEF3C7", fg: "#92400E" },
  validated: { bg: "#DCFCE7", fg: "#166534" },
  rejected: { bg: "#FEE2E2", fg: "#991B1B" },
};

function statusLabel(status: string): string {
  if (status === "validated") return t("doctor.parrainageMedecin.statusValidated");
  if (status === "rejected") return t("doctor.parrainageMedecin.statusRejected");
  return t("doctor.parrainageMedecin.statusPending");
}

export default function ParrainageMedecin() {
  useLocale();
  const [code, setCode] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [sent, setSent] = useState<Referral[]>([]);
  const [stats, setStats] = useState<Stats>({
    sentCount: 0,
    validatedCount: 0,
    totalRewardsTnd: 0,
  });
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [codeRes, listRes] = await Promise.all([
        api<{ code: string; doctorId: string }>("/api/medecin/referral-code").catch(() => null),
        api<{ sent: Referral[]; stats: Stats }>("/api/medecin/referrals").catch(() => null),
      ]);
      if (codeRes) {
        setCode(codeRes.code);
        setDoctorId(codeRes.doctorId);
      }
      if (listRes) {
        setSent(listRes.sent ?? []);
        setStats(
          listRes.stats ?? { sentCount: 0, validatedCount: 0, totalRewardsTnd: 0 },
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function inviteLink(): string {
    if (!doctorId) return "";
    return `https://doktori.tn/inscription?ref=${doctorId}`;
  }

  function showCopy(title: string, value: string) {
    // Mobile has no expo-clipboard yet; mirror the pattern from more/parrainage.tsx
    // and surface the value in an Alert so the user can select-copy it.
    Alert.alert(title, value, [{ text: t("common.ok") }]);
  }

  async function handleInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setSending(true);
    try {
      await api("/api/medecin/referrals", {
        method: "POST",
        body: JSON.stringify({ referredEmail: email }),
      });
      Alert.alert(
        t("doctor.parrainageMedecin.title"),
        t("doctor.parrainageMedecin.inviteSent"),
      );
      setInviteEmail("");
      await loadAll();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : t("doctor.parrainageMedecin.inviteError");
      Alert.alert(t("common.error"), msg);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.parrainageMedecin.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.parrainageMedecin.title") }} />
      <Screen>
        {/* Hero banner */}
        <View style={styles.hero}>
          <Ionicons name="medical" size={28} color="#FFFFFF" />
          <Text style={styles.heroTitle}>
            {t("doctor.parrainageMedecin.heroTitle")}
          </Text>
          <Text style={styles.heroSub}>
            {t("doctor.parrainageMedecin.heroBody")}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Stat
            label={t("doctor.parrainageMedecin.statSent")}
            value={String(stats.sentCount)}
            tone="default"
          />
          <Stat
            label={t("doctor.parrainageMedecin.statValidated")}
            value={String(stats.validatedCount)}
            tone="primary"
          />
          <Stat
            label={t("doctor.parrainageMedecin.statEarned")}
            value={Number(stats.totalRewardsTnd ?? 0).toFixed(2)}
            tone="success"
          />
        </View>

        {/* Code + link */}
        <Card title={t("doctor.parrainageMedecin.codeSection")}>
          <Pressable
            onPress={() => code && showCopy(t("doctor.parrainageMedecin.codeSection"), code)}
            style={styles.codeBox}
          >
            <Text style={styles.code}>{code ?? "—"}</Text>
            <Ionicons name="copy-outline" size={16} color={colors.teal} />
          </Pressable>
          <Text style={styles.kvLabel}>{t("doctor.parrainageMedecin.linkLabel")}</Text>
          <Pressable
            onPress={() => {
              const l = inviteLink();
              if (l) showCopy(t("doctor.parrainageMedecin.linkLabel"), l);
            }}
            style={styles.linkBox}
          >
            <Text style={styles.linkText} numberOfLines={1}>
              {inviteLink() || "—"}
            </Text>
            <Ionicons name="copy-outline" size={14} color={colors.foregroundSecondary} />
          </Pressable>
        </Card>

        {/* Invite form */}
        <Card title={t("doctor.parrainageMedecin.inviteSection")}>
          <Text style={styles.help}>{t("doctor.parrainageMedecin.inviteHelp")}</Text>
          <TextInput
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="confrere@hopital.tn"
            placeholderTextColor={colors.foregroundSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
          />
          <Pressable
            disabled={sending || !inviteEmail.trim()}
            onPress={handleInvite}
            style={[
              styles.btnPrimary,
              (sending || !inviteEmail.trim()) && styles.btnDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={14} color="#FFFFFF" />
            )}
            <Text style={styles.btnPrimaryText}>
              {sending
                ? t("doctor.parrainageMedecin.sending")
                : t("doctor.parrainageMedecin.send")}
            </Text>
          </Pressable>
        </Card>

        {/* Sent list */}
        <Card
          title={t("doctor.parrainageMedecin.listSection", { count: sent.length })}
        >
          {sent.length === 0 ? (
            <Empty
              icon="mail-outline"
              title={t("doctor.parrainageMedecin.emptyTitle")}
              sub={t("doctor.parrainageMedecin.emptySub")}
            />
          ) : (
            sent.map((r) => {
              const tone = STATUS_TONES[r.status] ?? STATUS_TONES.pending;
              const earned = Number(r.rewardsEarnedTnd ?? 0);
              return (
                <View key={r.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{r.referredName}</Text>
                    <Text style={styles.itemMeta}>
                      {r.referredEmail} · {formatDate(r.createdAt)}
                    </Text>
                    {r.rejectionReason ? (
                      <Text style={styles.rejection}>
                        {t("doctor.parrainageMedecin.rejectionLabel")}: {r.rejectionReason}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    {r.status === "validated" && earned > 0 ? (
                      <Text style={styles.earned}>{earned.toFixed(2)} TND</Text>
                    ) : null}
                    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.badgeText, { color: tone.fg }]}>
                        {statusLabel(r.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </Screen>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "primary" | "success";
}) {
  const color =
    tone === "primary" ? colors.teal : tone === "success" ? "#059669" : colors.foreground;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.teal,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 12, lineHeight: 17 },

  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: "center",
  },

  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  code: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 2,
    color: colors.foreground,
  },
  kvLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: spacing.xs,
  },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: { flex: 1, fontSize: 11, color: colors.foreground },

  help: { fontSize: 12, color: colors.foregroundSecondary, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
  },
  btnPrimaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },

  itemRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  itemMeta: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  rejection: { fontSize: 11, color: "#991B1B", fontStyle: "italic", marginTop: 2 },
  earned: { fontSize: 11, fontWeight: "700", color: "#059669" },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
});
