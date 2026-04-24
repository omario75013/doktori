import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";
import { Screen, Loader, Empty, formatDate } from "./_ui";

type Referral = {
  id: string;
  fromDoctorName: string;
  toDoctorName: string;
  patientName: string;
  reason: string;
  status: "pending" | "accepted" | "declined" | "completed";
  patientConsentStatus: "pending" | "granted" | "denied";
  createdAt: string;
};

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FED7AA", fg: "#9A3412" },
  accepted: { bg: "#DCFCE7", fg: "#166534" },
  declined: { bg: "#FECACA", fg: "#991B1B" },
  completed: { bg: "#DBEAFE", fg: "#1E40AF" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  declined: "Déclinée",
  completed: "Terminée",
};

export default function Referencements() {
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const [incoming, setIncoming] = useState<Referral[]>([]);
  const [outgoing, setOutgoing] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inc, out] = await Promise.all([
          api<Referral[]>("/api/doctor/referrals?direction=incoming").catch(() => []),
          api<Referral[]>("/api/doctor/referrals?direction=outgoing").catch(() => []),
        ]);
        setIncoming(inc ?? []);
        setOutgoing(out ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Référencements" }} />
        <Loader />
      </>
    );
  }

  const list = tab === "incoming" ? incoming : outgoing;

  return (
    <>
      <Stack.Screen options={{ title: "Référencements" }} />
      <Screen>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === "incoming" && styles.tabActive]}
            onPress={() => setTab("incoming")}
          >
            <Text
              style={[styles.tabText, tab === "incoming" && styles.tabTextActive]}
            >
              Reçus ({incoming.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === "outgoing" && styles.tabActive]}
            onPress={() => setTab("outgoing")}
          >
            <Text
              style={[styles.tabText, tab === "outgoing" && styles.tabTextActive]}
            >
              Envoyés ({outgoing.length})
            </Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <Empty icon="swap-horizontal-outline" title="Aucun référencement" />
        ) : (
          list.map((r) => {
            const tone = STATUS_TONES[r.status] ?? { bg: colors.bgSecondary, fg: colors.teal };
            return (
              <View key={r.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={styles.head}>
                    <Ionicons
                      name="swap-horizontal"
                      size={14}
                      color={colors.foregroundSecondary}
                    />
                    <Text style={styles.other}>
                      {tab === "incoming" ? r.fromDoctorName : r.toDoctorName}
                    </Text>
                  </View>
                  <Text style={styles.patient}>Patient : {r.patientName}</Text>
                  <Text style={styles.reason} numberOfLines={2}>
                    {r.reason}
                  </Text>
                  <Text style={styles.date}>{formatDate(r.createdAt)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.badgeText, { color: tone.fg }]}>
                    {STATUS_LABELS[r.status]}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.foregroundSecondary },
  tabTextActive: { color: colors.teal, fontWeight: "700" },

  row: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  other: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  patient: { fontSize: 12, color: colors.foreground, marginTop: 4 },
  reason: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  date: { fontSize: 10, color: colors.foregroundSecondary, marginTop: 4 },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 9, fontWeight: "700" },
});
