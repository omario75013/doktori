import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radii, t, useLocale } from "@doktori/mobile-core";

const ROLE_KEY = "doktori.staff.role";

export default function RolePicker() {
  const { locale } = useLocale();
  async function choose(role: "doctor" | "secretary") {
    const SecureStore = await import("expo-secure-store").catch(() => null);
    if (SecureStore) {
      await SecureStore.setItemAsync(ROLE_KEY, role);
    }
    router.replace(`/(auth)/login?role=${role}`);
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top brand section */}
        <View style={styles.topSection}>
          <View style={styles.logoMark}>
            {/* Abstract D-shape mark */}
            <View style={styles.logoCircle} />
            <View style={styles.logoCut} />
          </View>
          <Text style={styles.brand}>{t("auth.appName")}</Text>
          <Text style={styles.tagline}>{t("auth.tagline")}</Text>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          <RoleCard
            label={t("auth.doctor")}
            description={t("auth.doctorDesc")}
            accentColor={colors.teal}
            onPress={() => choose("doctor")}
            illustration={<StethoscopeIllustration />}
          />
          <RoleCard
            label={t("auth.secretary")}
            description={t("auth.secretaryDesc")}
            accentColor={colors.tealDark}
            onPress={() => choose("secretary")}
            illustration={<CalendarIllustration />}
          />
        </View>

        {/* Patient login link */}
        <View style={styles.patientRow}>
          <View style={styles.separator} />
          <Pressable
            onPress={() => router.replace("/(auth)/patient-login")}
            hitSlop={12}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text style={styles.patientLink}>
              {t("auth.isPatient")}{" "}
              <Text style={styles.patientLinkBold}>{t("auth.patientLogin")}</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Stethoscope illustration ─────────────────────────────────────────────────

function StethoscopeIllustration() {
  return (
    <View style={stetho.container}>
      {/* Earpiece circle */}
      <View style={stetho.circle} />
      {/* Tube vertical left */}
      <View style={[stetho.tube, stetho.tubeLeft]} />
      {/* Tube vertical right */}
      <View style={[stetho.tube, stetho.tubeRight]} />
      {/* Chest piece */}
      <View style={stetho.chestPiece} />
    </View>
  );
}

const stetho = StyleSheet.create({
  container: {
    width: 80,
    height: 100,
    alignItems: "center",
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    borderWidth: 5,
    borderColor: colors.teal,
    backgroundColor: "transparent",
  },
  tube: {
    position: "absolute",
    width: 5,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.teal,
    top: 28,
  },
  tubeLeft: { left: 22 },
  tubeRight: { right: 22 },
  chestPiece: {
    position: "absolute",
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    borderWidth: 4,
    borderColor: colors.tealLight,
  },
});

// ─── Calendar illustration ────────────────────────────────────────────────────

function CalendarIllustration() {
  const dots = [0, 1, 2, 3, 4, 5];
  return (
    <View style={cal.container}>
      {/* Calendar header bar */}
      <View style={cal.header} />
      {/* 3x2 dot grid */}
      <View style={cal.grid}>
        {dots.map((i) => (
          <View
            key={i}
            style={[
              cal.dot,
              // highlight first two as "booked"
              i < 2 && { backgroundColor: colors.tealDark },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    backgroundColor: "transparent",
    alignItems: "center",
    gap: spacing.xs,
  },
  header: {
    width: 72,
    height: 18,
    borderRadius: radii.sm,
    backgroundColor: colors.tealDark,
  },
  grid: {
    width: 72,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: radii.sm - 2,
    backgroundColor: colors.teal,
    opacity: 0.75,
  },
});

// ─── Role card ────────────────────────────────────────────────────────────────

function RoleCard({
  label,
  description,
  accentColor,
  illustration,
  onPress,
}: {
  label: string;
  description: string;
  accentColor: string;
  illustration: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        card.root,
        { borderLeftColor: accentColor },
        pressed && { opacity: 0.88 },
      ]}
    >
      {/* Left content */}
      <View style={card.left}>
        <Text style={card.label}>{label}</Text>
        <Text style={card.description}>{description}</Text>
        <View style={[card.arrow, { borderColor: accentColor }]}>
          <Text style={[card.arrowText, { color: accentColor }]}>→</Text>
        </View>
      </View>

      {/* Right illustration */}
      <View style={card.right}>{illustration}</View>
    </Pressable>
  );
}

const card = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii["2xl"],
    borderLeftWidth: 4,
    height: 160,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.bg,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  left: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: "center",
  },
  label: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.foreground,
  },
  description: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    lineHeight: 18,
    maxWidth: 160,
  },
  arrow: {
    marginTop: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  right: {
    width: 90,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSecondary },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  topSection: {
    paddingTop: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    gap: spacing.xs,
  },
  logoMark: {
    width: 48,
    height: 48,
    marginBottom: spacing.md,
  },
  logoCircle: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
  },
  logoCut: {
    position: "absolute",
    right: 0,
    top: 8,
    width: 22,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.tealDark,
  },
  tagline: {
    fontSize: 15,
    color: colors.foregroundSecondary,
  },
  cards: {
    gap: spacing.lg,
  },
  patientRow: {
    marginTop: spacing["2xl"],
    alignItems: "center",
    gap: spacing.lg,
  },
  separator: {
    width: "60%",
    height: 1,
    backgroundColor: colors.border,
  },
  patientLink: {
    fontSize: 14,
    color: colors.foregroundSecondary,
    textAlign: "center",
  },
  patientLinkBold: {
    color: colors.teal,
    fontWeight: "700",
  },
});
