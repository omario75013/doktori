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
  Bell,
  Shield,
  Stethoscope,
} from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

const { width } = Dimensions.get("window");

type Slide = {
  id: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: Stethoscope,
    iconBg: colors.primary,
    iconColor: colors.white,
    title: "Bienvenue sur Doktori",
    description:
      "La plateforme médicale tunisienne qui simplifie votre accès aux soins. Trouvez un médecin et prenez rendez-vous en quelques secondes.",
  },
  {
    id: "search",
    icon: Search,
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
    title: "Trouvez votre médecin",
    description:
      "Recherchez par spécialité, ville ou nom. Consultez les avis, les tarifs et les disponibilités en temps réel.",
  },
  {
    id: "book",
    icon: CalendarCheck,
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
    title: "Réservez en 2 clics",
    description:
      "Choisissez un créneau, confirmez — c'est fait. Recevez un rappel SMS automatique avant chaque consultation.",
  },
  {
    id: "sos",
    icon: Siren,
    iconBg: "#FEE2E2",
    iconColor: "#DC2626",
    title: "SOS Docteur",
    description:
      "Besoin d'un médecin en urgence ? Activez SOS et un médecin disponible près de chez vous vous contacte en moins de 2 minutes.",
  },
  {
    id: "ready",
    icon: Shield,
    iconBg: colors.mist,
    iconColor: colors.primary,
    title: "Gratuit et sécurisé",
    description:
      "Doktori est 100% gratuit pour les patients. Vos données de santé sont protégées et ne sont jamais partagées.",
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

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {currentIndex < SLIDES.length - 1 && (
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
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={[styles.slide, { width }]}>
              <View style={styles.illustrationArea}>
                {/* Decorative circles */}
                <View style={[styles.circle, styles.circleLg, { backgroundColor: item.iconBg, opacity: 0.15 }]} />
                <View style={[styles.circle, styles.circleMd, { backgroundColor: item.iconBg, opacity: 0.25 }]} />
                <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
                  <Icon size={48} color={item.iconColor} strokeWidth={1.8} />
                </View>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
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
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
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
          title={currentIndex === SLIDES.length - 1 ? "Commencer" : "Suivant"}
          onPress={next}
          style={{ width: "100%" } as any}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  skipBtn: { position: "absolute", top: 60, right: 20, zIndex: 10, padding: 8 },
  skipText: { fontSize: 15, color: colors.slate500, fontWeight: "600" },
  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  illustrationArea: {
    width: 200, height: 200, alignItems: "center", justifyContent: "center",
    marginBottom: 40,
  },
  circle: { position: "absolute", borderRadius: 9999 },
  circleLg: { width: 200, height: 200 },
  circleMd: { width: 140, height: 140 },
  iconWrap: {
    width: 96, height: 96, borderRadius: 32, alignItems: "center",
    justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 24, elevation: 8,
  },
  title: {
    fontSize: 26, fontWeight: "800", color: colors.ink, textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 15, color: colors.slate500, textAlign: "center", lineHeight: 22,
    maxWidth: 320,
  },
  bottom: {
    paddingHorizontal: 32, paddingBottom: 50, alignItems: "center", gap: 24,
  },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
});
