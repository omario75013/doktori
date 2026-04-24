import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii } from "@doktori/mobile-core";

export default function HomeScreen() {
  // TODO: hydrate from /api/patients/me (JWT Bearer) once patient-login ships
  const firstName = "Ahmed";

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
      >
        {/* 24pt breathing room above greeting per plan */}
        <View style={{ height: spacing.xl }} />
        <Text style={styles.greeting}>Bonjour, {firstName}</Text>
        <Text style={styles.sub}>Que souhaitez-vous faire aujourd&apos;hui ?</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Prochain rendez-vous</Text>
          <Text style={styles.cardValue}>Aucun pour le moment</Text>
        </View>

        <View style={styles.quickRow}>
          <QuickAction label="Trouver un médecin" />
          <QuickAction label="Mes RDV" />
          <QuickAction label="Messages" />
          <QuickAction label="Ordonnances" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ label }: { label: string }) {
  return (
    <View style={styles.quick}>
      <Text style={styles.quickText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, gap: spacing.md },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.foreground,
  },
  sub: {
    fontSize: 14,
    color: colors.foregroundSecondary,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.bgSecondary,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardLabel: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.foreground,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quick: {
    flexGrow: 1,
    flexBasis: "47%",
    borderRadius: radii.lg,
    backgroundColor: colors.teal,
    padding: spacing.lg,
    alignItems: "center",
  },
  quickText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
