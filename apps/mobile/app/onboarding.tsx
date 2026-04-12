import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  Search,
  CalendarCheck,
  Siren,
  Shield,
  Stethoscope,
} from "lucide-react-native";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

const { width } = Dimensions.get("window");

type Slide = {
  id: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  accentBg: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: Stethoscope,
    iconBg: colors.primary,
    iconColor: colors.white,
    accentBg: colors.primaryFaint,
    title: "Bienvenue sur Doktori",
    description:
      "La plateforme médicale tunisienne qui simplifie votre accès aux soins.",
  },
  {
    id: "search",
    icon: Search,
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
    accentBg: "#EFF6FF",
    title: "Trouvez votre médecin",
    description:
      "Recherchez par spécialité, ville ou nom. Consultez les avis et les disponibilités en temps réel.",
  },
  {
    id: "book",
    icon: CalendarCheck,
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
    accentBg: "#F0FDF4",
    title: "Réservez en 2 clics",
    description:
      "Choisissez un créneau, confirmez — c'est fait. Recevez un rappel SMS avant chaque consultation.",
  },
  {
    id: "sos",
    icon: Siren,
    iconBg: "#FEE2E2",
    iconColor: "#DC2626",
    accentBg: "#FEF2F2",
    title: "SOS Docteur",
    description:
      "Besoin d'un médecin en urgence ? Un médecin disponible vous contacte en moins de 2 minutes.",
  },
  {
    id: "ready",
    icon: Shield,
    iconBg: colors.mist,
    iconColor: colors.primary,
    accentBg: colors.primaryFaint,
    title: "Gratuit et sécurisé",
    description:
      "100% gratuit pour les patients. Vos données de santé sont protégées et ne sont jamais partagées.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  async function finish() {
    try {
      await SecureStore.setItemAsync("onboarding_done", "1");
    } catch {}
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

  return (
    <View style={styles.container}>
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
          return (
            <View style={[styles.slide, { width }]}>
              <View style={[styles.illustrationArea, { backgroundColor: item.accentBg }]}>
                {/* Decorative rings */}
                <View style={[styles.ring, styles.ringOuter, { borderColor: item.iconBg }]} />
                <View style={[styles.ring, styles.ringMiddle, { borderColor: item.iconBg }]} />
                <View style={[styles.iconWrap, { backgroundColor: item.iconBg }, shadow.lg]}>
                  <Icon size={44} color={item.iconColor} strokeWidth={1.8} />
                </View>
              </View>
              <View style={styles.textArea}>
                <Text style={styles.stepIndicator}>
                  {index + 1} / {SLIDES.length}
                </Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom: dots + button */}
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.25, 1, 0.25],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            );
          })}
        </View>
        <Button
          title={isLast ? "Commencer" : "Suivant"}
          onPress={next}
          size="lg"
          style={{ width: "100%" }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  skipBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
  },
  skipText: { fontSize: 14, color: colors.slate500, fontWeight: "600" },
  slide: { flex: 1 },
  illustrationArea: {
    flex: 0.5,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1.5,
    opacity: 0.12,
  },
  ringOuter: { width: 200, height: 200 },
  ringMiddle: { width: 150, height: 150, opacity: 0.2 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  textArea: {
    flex: 0.5,
    paddingHorizontal: 40,
    paddingTop: 32,
    alignItems: "center",
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate400,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 50,
    alignItems: "center",
    gap: spacing.lg,
  },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
});
