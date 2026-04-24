import { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radii } from "@doktori/mobile-core";

const ONBOARDING_KEY = "doktori.onboarding.done";
const { width: SCREEN_W } = Dimensions.get("window");

// ─── Geometric illustrations (no SVG) ───────────────────────────────────────

function MedicalCrossIllustration() {
  return (
    <View style={ill.crossContainer}>
      <View style={ill.crossCircle}>
        {/* Vertical bar */}
        <View style={ill.crossV} />
        {/* Horizontal bar */}
        <View style={ill.crossH} />
      </View>
      {/* Decorative dots */}
      <View style={[ill.dot, { top: 10, right: 18 }]} />
      <View style={[ill.dot, { bottom: 14, left: 20 }]} />
      <View style={[ill.dotSm, { top: 30, left: 12 }]} />
    </View>
  );
}

function DossierIllustration() {
  return (
    <View style={ill.dossierContainer}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            ill.dossierBar,
            {
              width: 160 - i * 18,
              opacity: 1 - i * 0.18,
              backgroundColor: i === 0 ? colors.teal : i === 1 ? colors.tealLight : colors.tealDark,
            },
          ]}
        />
      ))}
      {/* Small accent line on top bar */}
      <View style={ill.dossierAccent} />
    </View>
  );
}

function HospitalIllustration() {
  return (
    <View style={ill.hospitalContainer}>
      {/* Building base */}
      <View style={ill.hospitalBase}>
        {/* Windows row 1 */}
        <View style={ill.windowRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={ill.window} />
          ))}
        </View>
        {/* Windows row 2 */}
        <View style={ill.windowRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={ill.window} />
          ))}
        </View>
      </View>
      {/* Entrance door */}
      <View style={ill.hospitalDoor} />
      {/* Roof accent */}
      <View style={ill.hospitalRoof} />
      {/* Side decorative dot */}
      <View style={[ill.dot, { top: 4, right: 8 }]} />
    </View>
  );
}

const ill = StyleSheet.create({
  // Cross
  crossContainer: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  crossCircle: {
    width: 120,
    height: 120,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  crossV: {
    position: "absolute",
    width: 20,
    height: 68,
    borderRadius: radii.sm,
    backgroundColor: "#FFFFFF",
  },
  crossH: {
    position: "absolute",
    width: 68,
    height: 20,
    borderRadius: radii.sm,
    backgroundColor: "#FFFFFF",
  },
  dot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: radii.full,
    backgroundColor: colors.tealLight,
  },
  dotSm: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  // Dossier
  dossierContainer: {
    width: 160,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dossierBar: {
    height: 28,
    borderRadius: radii.md,
    alignSelf: "center",
  },
  dossierAccent: {
    position: "absolute",
    top: 8,
    left: 32,
    width: 40,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  // Hospital
  hospitalContainer: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  hospitalRoof: {
    width: 130,
    height: 18,
    borderRadius: radii.sm,
    backgroundColor: colors.tealDark,
    marginBottom: -2,
  },
  hospitalBase: {
    width: 120,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  windowRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  window: {
    width: 20,
    height: 20,
    borderRadius: radii.sm - 2,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  hospitalDoor: {
    width: 30,
    height: 36,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    backgroundColor: colors.tealDark,
    marginTop: -2,
  },
});

// ─── Slide data ──────────────────────────────────────────────────────────────

const SLIDES = [
  {
    key: "welcome",
    title: "Bienvenue sur Doktori",
    subtitle: "Prenez rendez-vous avec votre médecin en quelques secondes.",
    illustration: <MedicalCrossIllustration />,
  },
  {
    key: "health",
    title: "Gérez votre santé",
    subtitle: "Accédez à votre dossier médical, ordonnances et historique.",
    illustration: <DossierIllustration />,
  },
  {
    key: "pro",
    title: "Espace Professionnel",
    subtitle: "Médecins et secrétaires : gérez votre cabinet depuis l'appli.",
    illustration: <HospitalIllustration />,
  },
] as const;

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

  async function markDoneAndContinue() {
    const SecureStore = await import("expo-secure-store").catch(() => null);
    if (SecureStore) {
      await SecureStore.setItemAsync(ONBOARDING_KEY, "1");
    }
    router.replace("/(auth)/patient-login");
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(idx);
  }

  function goNext() {
    if (isLast) {
      markDoneAndContinue();
    } else {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * SCREEN_W, animated: true });
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Skip link — teal zone */}
        <View style={styles.skipRow}>
          <Pressable onPress={markDoneAndContinue} hitSlop={12}>
            <Text style={styles.skip}>Passer</Text>
          </Pressable>
        </View>

        {/* Illustration carousel — stays in teal zone */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.illustrationScroll}
        >
          {SLIDES.map((s) => (
            <View key={s.key} style={[styles.illustrationSlide, { width: SCREEN_W }]}>
              {s.illustration}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* White card — fully below the teal zone */}
      <SafeAreaView style={styles.card} edges={["bottom"]}>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          onPress={goNext}
        >
          <Text style={styles.primaryBtnText}>
            {isLast ? "Commencer" : "Suivant"}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.teal,
  },
  safe: {
    // occupies the top ~55% in teal
    flex: 1,
  },
  skipRow: {
    alignItems: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  skip: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
  illustrationScroll: {
    flex: 1,
  },
  illustrationSlide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // White card at the bottom
  card: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii["3xl"],
    borderTopRightRadius: radii["3xl"],
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    paddingBottom: spacing["3xl"],
    gap: spacing.md,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.teal,
    textAlign: "center",
  },
  slideSubtitle: {
    fontSize: 15,
    color: colors.foregroundSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.teal,
  },
  primaryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
