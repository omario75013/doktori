import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Linking } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Card, Kv, Loader, formatMillimes, formatDate, Banner } from "./_ui";

type Subscription = {
  id: string;
  plan: string;
  status: string;
  priceMillimes: number;
  billingCycle: "monthly" | "annual";
  startsAt: string;
  endsAt: string | null;
  cancelledAt: string | null;
} | null;

type Plan = {
  id: string;
  name: string;
  priceMillimes: number;
  description?: string;
  features: string[];
  notIncluded?: string[];
  teleconsultNote?: string | null;
  popular?: boolean;
};

type PlanInfo = {
  planCode: string | null;
  enabledFeatures: string[];
  limits: {
    appointments?: { max: number | null; used: number };
    sms?: { max: number | null; used: number };
    patients?: { max: number | null; used: number };
  };
} | null;

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  essentiel: "Essentiel",
  pro: "Pro",
  clinique: "Clinique",
};

const FEATURE_LABELS: Record<string, string> = {
  teleconsult: "Téléconsultation",
  sos: "SOS Docteur",
  reseau: "Réseau médecins",
  analytics: "Analytics avancés",
  secretaire: "Compte secrétaire",
  ordonnance_qr: "Ordonnance QR",
  multi_cabinet: "Multi-cabinets",
  waitlist: "Liste d'attente",
  unlimited_sms: "SMS illimités",
};

export default function Abonnement() {
  const { locale } = useLocale();
  const [sub, setSub] = useState<Subscription | undefined>(undefined);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planInfo, setPlanInfo] = useState<PlanInfo>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<Subscription>("/api/billing/current");
        setSub(r);
      } catch {
        setSub(null);
      }
    })();
    (async () => {
      try {
        const [p, info] = await Promise.all([
          api<Plan[]>("/api/billing/plans"),
          api<PlanInfo>("/api/doctor/plan").catch(() => null),
        ]);
        setPlans(p ?? []);
        setPlanInfo(info);
      } catch {
        setPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, []);

  async function applyPromo() {
    const code = promoCode.trim();
    if (!code) return;
    setPromoLoading(true);
    setPromoSuccess(null);
    setPromoError(null);
    try {
      const r = await api<{ success?: boolean; discount?: { description: string }; error?: string }>(
        "/api/doctor/apply-promo",
        { method: "POST", body: JSON.stringify({ code }) },
      );
      if (r?.success) {
        setPromoSuccess(r.discount?.description ?? t("doctor.abonnement.promoApplied"));
        setPromoCode("");
        // Refresh current sub since promo may extend it
        try {
          const fresh = await api<Subscription>("/api/billing/current");
          setSub(fresh);
        } catch {}
      } else {
        setPromoError(r?.error ?? t("doctor.abonnement.promoErrorFallback"));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPromoError(msg || t("doctor.abonnement.promoErrorFallback"));
    } finally {
      setPromoLoading(false);
    }
  }

  if (sub === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.abonnement.title") }} />
        <Loader />
      </>
    );
  }

  const endsAt = sub?.endsAt ? new Date(sub.endsAt) : null;
  const daysLeft = endsAt
    ? Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86400000))
    : null;
  const isTrial = sub?.status === "trial";

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.abonnement.title") }} />
      <Screen>
        {/* ─── Current plan status ─── */}
        {!sub ? (
          <>
            <View style={[styles.hero, { backgroundColor: "#E5E7EB" }]}>
              <Ionicons name="card" size={32} color={colors.foregroundSecondary} />
              <Text style={[styles.heroPlan, { color: colors.foreground }]}>
                {t("doctor.abonnement.freePlan")}
              </Text>
              <Text style={styles.heroSub}>{t("doctor.abonnement.noSubscription")}</Text>
            </View>
            <Banner>{t("doctor.abonnement.noSubDesc")}</Banner>
          </>
        ) : (
          <>
            <View
              style={[
                styles.hero,
                isTrial && { backgroundColor: "#FEF3C7" },
              ]}
            >
              <Ionicons
                name={isTrial ? "time" : "card"}
                size={28}
                color={isTrial ? "#92400E" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.heroPlan,
                  isTrial && { color: "#92400E" },
                ]}
              >
                {isTrial
                  ? t("doctor.abonnement.trialLabel")
                  : PLAN_LABELS[sub.plan] ?? sub.plan}
              </Text>
              <Text
                style={[
                  styles.heroSub,
                  isTrial && { color: "#92400E" },
                ]}
              >
                {formatMillimes(sub.priceMillimes)} /{" "}
                {sub.billingCycle === "annual"
                  ? t("doctor.abonnement.annual").toLowerCase()
                  : t("doctor.abonnement.monthly").toLowerCase()}
              </Text>
            </View>

            <Card title={t("doctor.abonnement.status")}>
              <Kv label={t("doctor.abonnement.status")} value={labelStatus(sub.status)} />
              <Kv label={t("doctor.abonnement.startedOn")} value={formatDate(sub.startsAt)} />
              {endsAt && (
                <Kv
                  label={
                    isTrial
                      ? t("doctor.abonnement.trialExpiresOn")
                      : t("doctor.abonnement.expiresOn")
                  }
                  value={`${formatDate(endsAt)}${
                    daysLeft !== null
                      ? ` · ${t("doctor.abonnement.daysLeft", { count: String(daysLeft) })}`
                      : ""
                  }`}
                />
              )}
              <Kv
                label={t("doctor.abonnement.cycle")}
                value={
                  sub.billingCycle === "annual"
                    ? t("doctor.abonnement.annual")
                    : t("doctor.abonnement.monthly")
                }
              />
            </Card>

            {isTrial && (
              <Banner tone="warn">{t("doctor.abonnement.trialNote")}</Banner>
            )}
            {!isTrial && daysLeft !== null && daysLeft < 7 && (
              <Banner tone="warn">{t("doctor.abonnement.expiringSoon")}</Banner>
            )}
          </>
        )}

        {/* ─── Plan usage bars ─── */}
        {planInfo && (planInfo.limits.appointments?.max || planInfo.limits.sms?.max || planInfo.limits.patients?.max) ? (
          <Card title={t("doctor.abonnement.usageTitle")}>
            <UsageBar
              label={t("doctor.abonnement.usageRdv")}
              used={planInfo.limits.appointments?.used ?? 0}
              max={planInfo.limits.appointments?.max ?? null}
            />
            <UsageBar
              label={t("doctor.abonnement.usageSms")}
              used={planInfo.limits.sms?.used ?? 0}
              max={planInfo.limits.sms?.max ?? null}
            />
            <UsageBar
              label={t("doctor.abonnement.usagePatients")}
              used={planInfo.limits.patients?.used ?? 0}
              max={planInfo.limits.patients?.max ?? null}
            />
          </Card>
        ) : null}

        {/* ─── Feature flags ─── */}
        {planInfo && planInfo.enabledFeatures.length > 0 && (
          <Card title={t("doctor.abonnement.featuresTitle")}>
            {Object.entries(FEATURE_LABELS).map(([key, label]) => {
              const on = planInfo.enabledFeatures.includes(key);
              return (
                <View key={key} style={styles.featureRow}>
                  <Ionicons
                    name={on ? "checkmark-circle" : "close-circle-outline"}
                    size={16}
                    color={on ? colors.teal : colors.foregroundSecondary}
                  />
                  <Text
                    style={[
                      styles.featureLabel,
                      !on && { color: colors.foregroundSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        {/* ─── Promo code ─── */}
        <Card title={t("doctor.abonnement.promoCodeSection")}>
          {promoSuccess && (
            <View style={styles.promoOk}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.promoOkText}>{promoSuccess}</Text>
            </View>
          )}
          {promoError && <Text style={styles.promoErr}>{promoError}</Text>}
          <View style={styles.promoRow}>
            <TextInput
              value={promoCode}
              onChangeText={(v) => {
                setPromoCode(v.toUpperCase());
                setPromoError(null);
                setPromoSuccess(null);
              }}
              placeholder={t("doctor.abonnement.promoPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              autoCapitalize="characters"
              style={styles.promoInput}
            />
            <Pressable
              onPress={applyPromo}
              disabled={promoLoading || !promoCode.trim()}
              style={[
                styles.promoBtn,
                (promoLoading || !promoCode.trim()) && { opacity: 0.5 },
              ]}
            >
              {promoLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.promoBtnTxt}>
                  {t("doctor.abonnement.applyButton")}
                </Text>
              )}
            </Pressable>
          </View>
        </Card>

        {/* ─── Plans grid ─── */}
        {loadingPlans ? (
          <ActivityIndicator color={colors.teal} />
        ) : (
          plans.map((plan) => {
            const isCurrent = sub?.plan === plan.id;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.popular && { borderColor: colors.teal, borderWidth: 2 },
                  isCurrent && { backgroundColor: "#F0FDFA" },
                ]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                    <Text style={styles.popularBadgeTxt}>
                      {t("doctor.abonnement.recommendedBadge")}
                    </Text>
                  </View>
                )}
                <View style={styles.planHead}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons
                      name={plan.popular ? "ribbon" : "shield-checkmark-outline"}
                      size={20}
                      color={plan.popular ? colors.teal : colors.foregroundSecondary}
                    />
                    <Text style={styles.planName}>{plan.name}</Text>
                  </View>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.teal} />
                      <Text style={styles.currentBadgeTxt}>
                        {t("doctor.abonnement.yourPlanBadge")}
                      </Text>
                    </View>
                  )}
                </View>

                {plan.description && (
                  <Text style={styles.planDesc}>{plan.description}</Text>
                )}

                <View style={styles.priceRow}>
                  <Text style={styles.priceValue}>{plan.priceMillimes / 1000}</Text>
                  <Text style={styles.priceUnit}>
                    {" "}
                    {t("doctor.abonnement.currencyPerMonth")}
                  </Text>
                </View>

                <Text style={styles.featHeader}>
                  {t("doctor.abonnement.includedFeatures")}
                </Text>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.teal} />
                    <Text style={styles.featureLabel}>{f}</Text>
                  </View>
                ))}

                {plan.notIncluded && plan.notIncluded.length > 0 && (
                  <>
                    <Text style={[styles.featHeader, { color: colors.foregroundSecondary, marginTop: spacing.sm }]}>
                      {t("doctor.abonnement.notIncluded")}
                    </Text>
                    {plan.notIncluded.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Ionicons name="close" size={14} color={colors.foregroundSecondary} />
                        <Text style={[styles.featureLabel, { color: colors.foregroundSecondary }]}>{f}</Text>
                      </View>
                    ))}
                  </>
                )}

                {plan.teleconsultNote && (
                  <View style={styles.noteBox}>
                    <Ionicons name="information-circle" size={14} color="#1E40AF" />
                    <Text style={styles.noteText}>{plan.teleconsultNote}</Text>
                  </View>
                )}

                <Pressable
                  disabled={isCurrent}
                  onPress={() => Linking.openURL(`https://doktori.tn/medecin/abonnement`)}
                  style={[
                    styles.cta,
                    isCurrent && { backgroundColor: colors.border },
                    !isCurrent && plan.popular && { backgroundColor: colors.teal },
                    !isCurrent && !plan.popular && { backgroundColor: colors.foreground },
                  ]}
                >
                  <Text
                    style={[
                      styles.ctaTxt,
                      isCurrent && { color: colors.teal },
                    ]}
                  >
                    {isCurrent
                      ? t("doctor.abonnement.currentPlanButton")
                      : t("doctor.abonnement.choosePlan", { plan: plan.name })}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}

        {/* ─── Billing footer ─── */}
        <Card title={t("doctor.abonnement.billingInfoTitle")}>
          <BillingBullet
            strong={t("doctor.abonnement.securePayment")}
            text={t("doctor.abonnement.securePaymentDesc")}
          />
          <BillingBullet
            strong={t("doctor.abonnement.billingMonthly")}
            text={t("doctor.abonnement.billingMonthlyDesc")}
          />
          <BillingBullet
            strong={t("doctor.abonnement.billingCancel")}
            text={t("doctor.abonnement.billingCancelDesc")}
          />
          <BillingBullet
            strong={t("doctor.abonnement.billingTrial")}
            text={t("doctor.abonnement.billingTrialDesc")}
          />
          <BillingBullet
            strong={t("doctor.abonnement.billingCommissions")}
            text={t("doctor.abonnement.billingCommissionsDesc")}
          />
        </Card>
      </Screen>
    </>
  );
}

function UsageBar({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number | null;
}) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const tone = pct >= 90 ? "#DC2626" : pct >= 70 ? "#D97706" : colors.teal;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={styles.usageVal}>
          {used}
          {max !== null ? ` / ${max}` : ` / ${t("doctor.abonnement.unlimited")}`}
        </Text>
      </View>
      {max !== null && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: tone }]} />
        </View>
      )}
    </View>
  );
}

function BillingBullet({ strong, text }: { strong: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>
        <Text style={{ fontWeight: "700" }}>{strong}</Text> {text}
      </Text>
    </View>
  );
}

function labelStatus(s: string) {
  return (
    {
      active: "Actif",
      pending: "En attente",
      trial: "Essai",
      expired: "Expiré",
      cancelled: "Annulé",
    } as Record<string, string>
  )[s] ?? s;
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.teal,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
  },
  heroPlan: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13 },

  promoRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  promoBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  promoBtnTxt: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  promoOk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  promoOkText: { color: "#15803D", fontSize: 12, flex: 1 },
  promoErr: { color: "#DC2626", fontSize: 12 },

  usageLabel: { fontSize: 12, color: colors.foregroundSecondary },
  usageVal: { fontSize: 12, fontWeight: "700", color: colors.foreground },
  barTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },

  planCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.bg,
    gap: spacing.xs,
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  popularBadgeTxt: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  planHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planName: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  currentBadgeTxt: { color: colors.teal, fontSize: 11, fontWeight: "700" },
  planDesc: { fontSize: 12, color: colors.foregroundSecondary, marginBottom: spacing.xs },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priceValue: { fontSize: 32, fontWeight: "900", color: colors.foreground },
  priceUnit: { fontSize: 13, color: colors.foregroundSecondary },
  featHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingVertical: 2 },
  featureLabel: { fontSize: 12, color: colors.foreground, flex: 1, lineHeight: 16 },
  noteBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#EFF6FF",
    padding: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  noteText: { fontSize: 11, color: "#1E40AF", flex: 1, lineHeight: 15 },
  cta: {
    marginTop: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  ctaTxt: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  bulletDot: { color: colors.foregroundSecondary },
  bulletText: { fontSize: 11, color: colors.foregroundSecondary, flex: 1, lineHeight: 16 },
});
