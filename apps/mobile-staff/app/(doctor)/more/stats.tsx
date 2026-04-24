import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { colors, spacing, radii, api } from "@doktori/mobile-core";
import { Screen, Card, Kv, Loader } from "./_ui";

type Appointment = {
  id: string;
  startsAt: string;
  status: string;
};

export default function Stats() {
  const [appts, setAppts] = useState<Appointment[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<Appointment[]>("/api/appointments/doctor");
        setAppts(r);
      } catch {
        setAppts([]);
      }
    })();
  }, []);

  if (!appts) {
    return (
      <>
        <Stack.Screen options={{ title: "Stats" }} />
        <Loader />
      </>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthAppts = appts.filter((a) => new Date(a.startsAt) >= startOfMonth);
  const completed = monthAppts.filter((a) => a.status === "completed").length;
  const cancelled = monthAppts.filter((a) => a.status === "cancelled").length;
  const noShow = monthAppts.filter((a) => a.status === "no_show").length;
  const showRate = monthAppts.length
    ? Math.round((completed / monthAppts.length) * 100)
    : 0;
  const cancelRate = monthAppts.length
    ? Math.round(((cancelled + noShow) / monthAppts.length) * 100)
    : 0;

  const last12Weeks = Array.from({ length: 12 }, (_, i) => {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const count = appts.filter((a) => {
      const d = new Date(a.startsAt);
      return d >= start && d <= end;
    }).length;
    return { start, count };
  }).reverse();

  return (
    <>
      <Stack.Screen options={{ title: "Stats" }} />
      <Screen>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Kpi label="Ce mois" value={String(monthAppts.length)} />
          <Kpi label="Terminés" value={String(completed)} accent="#1E40AF" />
          <Kpi label="Absents" value={String(noShow)} accent="#991B1B" />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Kpi label="Taux présence" value={`${showRate}%`} accent="#16A34A" />
          <Kpi label="Annulations" value={`${cancelRate}%`} accent="#C2410C" />
        </View>

        <Card title="RDV par semaine — 12 dernières semaines">
          <BarChart data={last12Weeks} />
        </Card>

        <Card title="Performance du mois">
          <Kv label="Total RDV" value={String(monthAppts.length)} />
          <Kv label="Terminés" value={String(completed)} />
          <Kv label="Annulés" value={String(cancelled)} />
          <Kv label="No-show" value={String(noShow)} />
          <Kv label="Taux présence" value={`${showRate}%`} />
        </Card>
      </Screen>
    </>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, accent && { color: accent }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function BarChart({ data }: { data: Array<{ start: Date; count: number }> }) {
  const width = 310;
  const height = 140;
  const padding = 24;
  const barW = (width - padding * 2) / data.length - 4;
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = ((height - padding - 20) * d.count) / max;
          const x = padding + i * (barW + 4);
          const y = height - padding - h;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={3}
              fill={i === data.length - 1 ? colors.teal : colors.tealLight}
            />
          );
        })}
        {data.map((d, i) => {
          if (i % 2 !== 0) return null;
          const x = padding + i * (barW + 4) + barW / 2;
          return (
            <SvgText
              key={i}
              x={x}
              y={height - 6}
              fontSize={9}
              textAnchor="middle"
              fill={colors.foregroundSecondary}
            >
              {d.start.getDate()}/{d.start.getMonth() + 1}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  kpi: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  kpiValue: { fontSize: 22, fontWeight: "800", color: colors.teal },
  kpiLabel: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: "center",
  },
});
