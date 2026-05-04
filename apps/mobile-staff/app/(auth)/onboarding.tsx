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
import Svg, { Circle, Rect, Path, Ellipse, Line } from "react-native-svg";
import { router } from "expo-router";
import { colors, spacing, radii, t, useLocale } from "@doktori/mobile-core";

const ONBOARDING_KEY = "doktori.onboarding.done";
const { width: SCREEN_W } = Dimensions.get("window");

const W = "#FFFFFF";
const T = colors.teal;        // #0891B2
const TD = colors.tealDark;   // #0E7490
const WA = "rgba(255,255,255,0.15)";
const WB = "rgba(255,255,255,0.25)";

// ─── Slide 1 — Doctor ────────────────────────────────────────────────────────

function DoctorIllustration() {
  return (
    <Svg width={210} height={220} viewBox="0 0 210 220">
      {/* Decorative circles */}
      <Circle cx={105} cy={105} r={90} fill={WA} />
      <Circle cx={105} cy={105} r={62} fill={WA} />

      {/* White coat body */}
      <Rect x={52} y={130} width={106} height={90} rx={26} fill={W} />
      {/* Coat lapel V lines */}
      <Path d="M105 145 L80 132" stroke={TD} strokeWidth={2.5} strokeLinecap="round" opacity={0.25} />
      <Path d="M105 145 L130 132" stroke={TD} strokeWidth={2.5} strokeLinecap="round" opacity={0.25} />
      {/* Breast pocket */}
      <Rect x={112} y={150} width={26} height={20} rx={6} fill="rgba(8,145,178,0.12)" />
      {/* Pen in pocket */}
      <Rect x={119} y={146} width={4} height={14} rx={2} fill={TD} opacity={0.6} />

      {/* Neck */}
      <Rect x={90} y={120} width={30} height={22} rx={8} fill="#F0C9A0" />

      {/* Head */}
      <Ellipse cx={105} cy={97} rx={37} ry={40} fill="#F5D0A9" />

      {/* Hair */}
      <Path
        d="M70 90 Q73 60 105 55 Q137 60 140 90 Q138 68 105 64 Q72 68 70 90Z"
        fill="#4A2C17"
      />
      {/* Ear left */}
      <Ellipse cx={68} cy={100} rx={7} ry={10} fill="#F0C090" />
      {/* Ear right */}
      <Ellipse cx={142} cy={100} rx={7} ry={10} fill="#F0C090" />

      {/* Eyebrows */}
      <Path d="M85 84 Q93 80 100 84" stroke="#4A2C17" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M110 84 Q117 80 125 84" stroke="#4A2C17" strokeWidth={2.5} fill="none" strokeLinecap="round" />

      {/* Eyes white */}
      <Ellipse cx={92} cy={96} rx={8} ry={7} fill={W} />
      <Ellipse cx={118} cy={96} rx={8} ry={7} fill={W} />
      {/* Iris */}
      <Circle cx={92} cy={97} r={4.5} fill="#3D2B1F" />
      <Circle cx={118} cy={97} r={4.5} fill="#3D2B1F" />
      {/* Highlights */}
      <Circle cx={94} cy={95} r={1.5} fill={W} />
      <Circle cx={120} cy={95} r={1.5} fill={W} />

      {/* Nose */}
      <Path d="M102 105 Q105 113 108 105" stroke="#D4956A" strokeWidth={1.5} fill="none" strokeLinecap="round" />

      {/* Smile */}
      <Path d="M90 116 Q105 127 120 116" stroke="#C07850" strokeWidth={2.5} fill="none" strokeLinecap="round" />

      {/* Stethoscope */}
      <Path
        d="M80 130 Q66 148 68 166 Q70 182 84 182 Q96 182 96 170"
        stroke={WB}
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={96} cy={170} r={11} fill={WB} />
      <Circle cx={96} cy={170} r={6} fill="rgba(8,145,178,0.4)" />

      {/* Medical cross badge top-right */}
      <Circle cx={168} cy={46} r={24} fill={W} />
      <Rect x={159} y={38} width={18} height={7} rx={3.5} fill={T} />
      <Rect x={164} y={33} width={7} height={18} rx={3.5} fill={T} />

      {/* Small floating dots */}
      <Circle cx={30} cy={68} r={6} fill={WA} />
      <Circle cx={185} cy={150} r={5} fill={WA} />
      <Circle cx={22} cy={145} r={4} fill={WA} />
    </Svg>
  );
}

// ─── Slide 2 — Dossier médical ───────────────────────────────────────────────

function HealthIllustration() {
  return (
    <Svg width={200} height={210} viewBox="0 0 200 210">
      <Circle cx={100} cy={105} r={88} fill={WA} />

      {/* Clipboard body */}
      <Rect x={28} y={30} width={144} height={168} rx={18} fill={W} />

      {/* Clipboard top band */}
      <Rect x={28} y={30} width={144} height={46} rx={18} fill="rgba(8,145,178,0.18)" />
      <Rect x={28} y={58} width={144} height={18} fill="rgba(8,145,178,0.18)" />

      {/* Clip */}
      <Rect x={72} y={18} width={56} height={22} rx={11} fill={W} />
      <Rect x={82} y={14} width={36} height={18} rx={9} fill={TD} />

      {/* Header title bar */}
      <Rect x={48} y={42} width={96} height={9} rx={4.5} fill="rgba(8,145,178,0.55)" />

      {/* Patient info rows */}
      <Rect x={48} y={90} width={104} height={8} rx={4} fill="rgba(8,145,178,0.3)" />
      <Rect x={48} y={107} width={80} height={8} rx={4} fill="rgba(8,145,178,0.2)" />
      <Rect x={48} y={124} width={92} height={8} rx={4} fill="rgba(8,145,178,0.2)" />

      {/* Divider */}
      <Line x1={38} y1={142} x2={162} y2={142} stroke="rgba(8,145,178,0.15)" strokeWidth={1.5} />

      {/* ECG pulse line */}
      <Path
        d="M38 165 L58 165 L65 147 L72 183 L79 155 L86 165 L162 165"
        stroke={T}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.65}
      />

      {/* Heart icon top-right corner */}
      <Path
        d="M156 68 C156 62 151 57 146 61 C141 57 136 62 136 68 C136 78 146 88 146 88 C146 88 156 78 156 68Z"
        fill={TD}
        opacity={0.75}
      />

      {/* Decorative dots */}
      <Circle cx={22} cy={55} r={5} fill={WA} />
      <Circle cx={182} cy={160} r={4} fill={WA} />
    </Svg>
  );
}

// ─── Slide 3 — Cabinet professionnel ─────────────────────────────────────────

function CabinetIllustration() {
  const windows = [
    [44, 118], [88, 118], [132, 118],
    [44, 155], [88, 155], [132, 155],
  ];
  return (
    <Svg width={210} height={215} viewBox="0 0 210 215">
      <Circle cx={105} cy={108} r={90} fill={WA} />

      {/* Sky / ground */}
      <Rect x={15} y={175} width={180} height={18} rx={9} fill={WA} />

      {/* Building body */}
      <Rect x={28} y={72} width={154} height={115} rx={12} fill={W} />

      {/* Roof band */}
      <Rect x={28} y={72} width={154} height={32} rx={12} fill="rgba(8,145,178,0.2)" />
      <Rect x={28} y={92} width={154} height={12} fill="rgba(8,145,178,0.2)" />

      {/* Building name bar */}
      <Rect x={52} y={82} width={106} height={9} rx={4.5} fill="rgba(8,145,178,0.5)" />

      {/* Windows */}
      {windows.map(([x, y], i) => (
        <Rect key={i} x={x} y={y} width={26} height={24} rx={5}
          fill={i === 1 ? "rgba(8,145,178,0.35)" : "rgba(8,145,178,0.15)"} />
      ))}

      {/* Door */}
      <Rect x={82} y={152} width={46} height={58} rx={10} fill="rgba(14,116,144,0.55)" />
      <Circle cx={105} cy={180} r={3} fill={WB} />

      {/* Medical cross sign */}
      <Circle cx={170} cy={48} r={26} fill={W} />
      <Rect x={160} y={40} width={20} height={7} rx={3.5} fill={T} />
      <Rect x={166} y={34} width={7} height={20} rx={3.5} fill={T} />

      {/* Flagpole */}
      <Rect x={103} y={42} width={4} height={34} rx={2} fill={WB} />
      <Path d="M107 42 L124 48 L107 54Z" fill={W} opacity={0.6} />

      {/* People dots (team) */}
      <Circle cx={30} cy={42} r={8} fill={WA} />
      <Circle cx={50} cy={28} r={6} fill={WA} />
      <Circle cx={20} cy={148} r={5} fill={WA} />
    </Svg>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { locale } = useLocale();
  const SLIDES = [
    {
      key: "welcome",
      title: t("onboarding.slide1Title"),
      subtitle: t("onboarding.slide1Desc"),
      illustration: <DoctorIllustration />,
    },
    {
      key: "health",
      title: t("onboarding.slide2Title"),
      subtitle: t("onboarding.slide2Desc"),
      illustration: <HealthIllustration />,
    },
    {
      key: "pro",
      title: t("onboarding.slide3Title"),
      subtitle: t("onboarding.slide3Desc"),
      illustration: <CabinetIllustration />,
    },
  ];
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = activeIndex === SLIDES.length - 1;
  const slide = SLIDES[activeIndex];

  async function markDoneAndContinue() {
    const SecureStore = await import("expo-secure-store").catch(() => null);
    if (SecureStore) {
      await SecureStore.setItemAsync(ONBOARDING_KEY, "1");
    }
    router.replace("/(auth)/role");
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
        <View style={styles.skipRow}>
          <Pressable onPress={markDoneAndContinue} hitSlop={12}>
            <Text style={styles.skip}>{t("onboarding.skip")}</Text>
          </Pressable>
        </View>

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

      <SafeAreaView style={styles.card} edges={["bottom"]}>
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          onPress={goNext}
        >
          <Text style={styles.primaryBtnText}>
            {isLast ? t("onboarding.start") : t("onboarding.next")}
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.teal },
  safe: { flex: 1 },
  skipRow: {
    alignItems: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  skip: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
  illustrationScroll: { flex: 1 },
  illustrationSlide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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
  dot: { width: 8, height: 8, borderRadius: radii.full, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.teal },
  primaryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
