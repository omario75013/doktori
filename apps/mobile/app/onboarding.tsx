import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  Animated,
  Easing,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  Search,
  CalendarCheck,
  Siren,
  Shield,
  Stethoscope,
  ArrowRight,
  Sparkles,
} from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";

const { width, height } = Dimensions.get("window");

type Slide = {
  id: string;
  icon: any;
  gradient: [string, string];
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
  stat?: { value: string; label: string };
};

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: Stethoscope,
    gradient: [colors.primary, colors.primaryDark],
    iconColor: colors.white,
    title: "Doktori",
    subtitle: "Votre santé, simplement.",
    description: "La 1ère plateforme médicale tunisienne. Trouvez un médecin, prenez RDV, consultez en vidéo — tout depuis votre téléphone.",
    stat: { value: "500+", label: "Médecins" },
  },
  {
    id: "search",
    icon: Search,
    gradient: ["#2563EB", "#1D4ED8"],
    iconColor: colors.white,
    title: "Recherche intelligente",
    subtitle: "Le bon médecin, au bon moment.",
    description: "Filtrez par spécialité, ville, disponibilité. Consultez les avis vérifiés et les créneaux libres en temps réel.",
    stat: { value: "30+", label: "Spécialités" },
  },
  {
    id: "book",
    icon: CalendarCheck,
    gradient: ["#16A34A", "#15803D"],
    iconColor: colors.white,
    title: "RDV en 2 clics",
    subtitle: "Fini les files d'attente.",
    description: "Choisissez votre créneau, confirmez, c'est réglé. Rappel SMS automatique la veille.",
    stat: { value: "< 30s", label: "Pour réserver" },
  },
  {
    id: "sos",
    icon: Siren,
    gradient: ["#DC2626", "#B91C1C"],
    iconColor: colors.white,
    title: "SOS Docteur",
    subtitle: "Urgence non-vitale ? On gère.",
    description: "Activez SOS et un médecin disponible près de chez vous vous contacte en moins de 2 minutes.",
    stat: { value: "< 2 min", label: "Temps de réponse" },
  },
  {
    id: "ready",
    icon: Shield,
    gradient: [colors.primary, "#0E6E85"],
    iconColor: colors.white,
    title: "C'est parti !",
    subtitle: "100% gratuit. 100% sécurisé.",
    description: "Vos données de santé sont chiffrées et ne sont jamais partagées. Aucun frais pour les patients.",
  },
];

function FloatingOrb({ delay, x, y, size, color }: { delay: number; x: number; y: number; size: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3000 + delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration: 3000 + delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.3, 0.15] });
  return (
    <Animated.View style={{
      position: "absolute", left: x, top: y, width: size, height: size,
      borderRadius: size / 2, backgroundColor: color,
      transform: [{ translateY }], opacity,
    }} />
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  async function finish() {
    try { await SecureStore.setItemAsync("onboarding_done", "1"); } catch {}
    router.replace("/(auth)/login");
  }

  function next() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      finish();
    }
  }

  const isLast = currentIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[currentIndex];

  // Interpolate background color
  const backgroundColor = scrollX.interpolate({
    inputRange: SLIDES.map((_, i) => i * width),
    outputRange: SLIDES.map((s) => s.gradient[0]),
    extrapolate: "clamp",
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle="light-content" />

      {/* Floating orbs */}
      <FloatingOrb delay={0} x={width * 0.1} y={height * 0.08} size={120} color="rgba(255,255,255,0.08)" />
      <FloatingOrb delay={500} x={width * 0.6} y={height * 0.15} size={80} color="rgba(255,255,255,0.06)" />
      <FloatingOrb delay={1000} x={width * 0.75} y={height * 0.05} size={160} color="rgba(255,255,255,0.05)" />
      <FloatingOrb delay={300} x={width * 0.2} y={height * 0.25} size={60} color="rgba(255,255,255,0.1)" />

      {/* Skip button */}
      {!isLast && (
        <Pressable style={styles.skipBtn} onPress={finish}>
          <Text style={styles.skipText}>Passer</Text>
        </Pressable>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item, index }) => {
          const Icon = item.icon;
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const iconScale = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: "clamp" });
          const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: "clamp" });
          const textTranslateY = scrollX.interpolate({ inputRange, outputRange: [30, 0, 30], extrapolate: "clamp" });

          return (
            <View style={[styles.slide, { width }]}>
              {/* Icon area */}
              <View style={styles.iconArea}>
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
                  {/* Glow rings */}
                  <View style={styles.glowRing3} />
                  <View style={styles.glowRing2} />
                  <View style={styles.glowRing1} />
                  <View style={styles.iconCircle}>
                    <Icon size={52} color={item.iconColor} strokeWidth={1.6} />
                  </View>
                </Animated.View>
              </View>

              {/* Text area */}
              <Animated.View style={[styles.textArea, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>

                {item.stat && (
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{item.stat.value}</Text>
                    <Text style={styles.statLabel}>{item.stat.label}</Text>
                  </View>
                )}
              </Animated.View>
            </View>
          );
        }}
      />

      {/* Bottom controls */}
      <Animated.View style={[styles.bottom, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 32, 8], extrapolate: "clamp" });
            const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: "clamp" });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        {/* CTA Button */}
        <Pressable style={styles.ctaBtn} onPress={next}>
          <Text style={styles.ctaText}>{isLast ? "Commencer" : "Suivant"}</Text>
          <View style={styles.ctaArrow}>
            {isLast ? <Sparkles size={18} color={colors.primary} /> : <ArrowRight size={18} color={colors.primary} />}
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: {
    position: "absolute", top: 58, right: 24, zIndex: 10,
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  skipText: { fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  slide: { flex: 1 },
  iconArea: {
    flex: 0.45, alignItems: "center", justifyContent: "center",
  },
  iconContainer: { alignItems: "center", justifyContent: "center", width: 200, height: 200 },
  glowRing3: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  glowRing2: {
    position: "absolute", width: 150, height: 150, borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  glowRing1: {
    position: "absolute", width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  textArea: {
    flex: 0.55, paddingHorizontal: 36, alignItems: "center",
  },
  subtitle: {
    fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase", letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 34, fontWeight: "900", color: colors.white,
    textAlign: "center", marginBottom: spacing.md,
    letterSpacing: -0.8,
  },
  description: {
    fontSize: 16, color: "rgba(255,255,255,0.85)",
    textAlign: "center", lineHeight: 25, maxWidth: 320,
  },
  statCard: {
    marginTop: spacing.xl,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.lg,
    paddingVertical: 14, paddingHorizontal: 28,
    alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  statValue: { fontSize: 28, fontWeight: "900", color: colors.white },
  statLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  bottom: {
    paddingHorizontal: 32, paddingBottom: 50,
    alignItems: "center", gap: 24,
  },
  dots: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.white },
  ctaBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white,
    paddingVertical: 16, paddingLeft: 32, paddingRight: 8,
    borderRadius: radius.full, gap: 12,
    width: "100%", justifyContent: "center",
  },
  ctaText: { fontSize: 17, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  ctaArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryFaint,
    alignItems: "center", justifyContent: "center",
  },
});
