import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";
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

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  essentiel: "Essentiel",
  pro: "Pro",
  clinique: "Clinique",
};

export default function Abonnement() {
  const [sub, setSub] = useState<Subscription | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<Subscription>("/api/billing/current");
        setSub(r);
      } catch {
        setSub(null);
      }
    })();
  }, []);

  if (sub === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "Abonnement" }} />
        <Loader />
      </>
    );
  }

  const endsAt = sub?.endsAt ? new Date(sub.endsAt) : null;
  const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - Date.now()) / 86400000) : null;

  return (
    <>
      <Stack.Screen options={{ title: "Abonnement" }} />
      <Screen>
        {!sub ? (
          <>
            <View style={[styles.hero, { backgroundColor: "#E5E7EB" }]}>
              <Ionicons name="card" size={32} color={colors.foregroundSecondary} />
              <Text style={[styles.heroPlan, { color: colors.foreground }]}>
                Plan Gratuit
              </Text>
              <Text style={styles.heroSub}>Aucun abonnement actif.</Text>
            </View>
            <Banner>
              Passez à un plan payant pour déverrouiller téléconsult, réseau, SMS
              illimités et plus. Édition depuis le portail web.
            </Banner>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <Ionicons name="card" size={28} color="#FFFFFF" />
              <Text style={styles.heroPlan}>{PLAN_LABELS[sub.plan] ?? sub.plan}</Text>
              <Text style={[styles.heroSub, { color: "rgba(255,255,255,0.85)" }]}>
                {formatMillimes(sub.priceMillimes)} /
                {sub.billingCycle === "annual" ? " an" : " mois"}
              </Text>
            </View>

            <Card title="Statut">
              <Kv label="Statut" value={labelStatus(sub.status)} />
              <Kv label="Commencé le" value={formatDate(sub.startsAt)} />
              {endsAt && (
                <Kv
                  label="Expire le"
                  value={`${formatDate(endsAt)}${
                    daysLeft !== null ? ` · ${daysLeft} j restant` : ""
                  }`}
                />
              )}
              <Kv
                label="Cycle"
                value={sub.billingCycle === "annual" ? "Annuel" : "Mensuel"}
              />
            </Card>

            {daysLeft !== null && daysLeft < 7 && (
              <Banner tone="warn">
                Votre abonnement expire bientôt. Renouvelez depuis le portail web.
              </Banner>
            )}
          </>
        )}
      </Screen>
    </>
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
});
