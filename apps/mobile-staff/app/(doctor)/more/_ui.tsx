import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "@doktori/mobile-core";

export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  if (scroll) {
    return (
      <ScrollView contentContainerStyle={styles.scroll} style={styles.root}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.root, styles.scroll]}>{children}</View>;
}

export function Card({
  title,
  children,
  right,
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      {title && (
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{title}</Text>
          {right}
        </View>
      )}
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

export function Kv({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text
        style={[
          styles.kvValue,
          mono && { fontFamily: "monospace" },
          !value && { fontStyle: "italic", color: colors.foregroundSecondary },
        ]}
      >
        {value ?? "Non renseigné"}
      </Text>
    </View>
  );
}

export function Empty({
  icon = "information-circle-outline",
  title,
  sub,
}: {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  sub?: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={32} color={colors.foregroundSecondary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {sub && <Text style={styles.emptySub}>{sub}</Text>}
    </View>
  );
}

export function Loader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={colors.teal} />
    </View>
  );
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn";
  children: React.ReactNode;
}) {
  const bg = tone === "warn" ? "#FEF3C7" : "#DBEAFE";
  const fg = tone === "warn" ? "#92400E" : "#1E40AF";
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Ionicons
        name={tone === "warn" ? "warning" : "information-circle"}
        size={16}
        color={fg}
      />
      <Text style={[styles.bannerText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function formatMillimes(m: number | null | undefined): string {
  if (m == null) return "—";
  return `${(m / 1000).toFixed(3).replace(".", ",")} DT`;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["2xl"] },
  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  kvLabel: { fontSize: 13, color: colors.foregroundSecondary },
  kvValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
    flex: 1,
    textAlign: "right",
  },
  empty: {
    padding: spacing["2xl"],
    alignItems: "center",
    gap: spacing.xs,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  emptySub: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    textAlign: "center",
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  bannerText: { flex: 1, fontSize: 12, lineHeight: 16 },
});

export default function _UI() { return null; }
