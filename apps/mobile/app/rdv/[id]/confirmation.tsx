import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleCheckBig, Video, Calendar, Home } from "lucide-react-native";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

export default function ConfirmationScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isTeleconsult = type === "teleconsult";

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <View style={[styles.iconWrap, shadow.lg]}>
          <CircleCheckBig size={56} color={colors.green} />
        </View>

        <Text style={styles.title}>Rendez-vous confirmé !</Text>

        {isTeleconsult ? (
          <View style={styles.infoCard}>
            <View style={styles.videoBadge}>
              <Video size={16} color={colors.white} />
              <Text style={styles.videoBadgeText}>Consultation vidéo</Text>
            </View>
            <Text style={styles.subtitle}>
              Vous recevrez un lien vidéo avant votre rendez-vous.
            </Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>
            Vous recevrez un SMS de rappel la veille de votre consultation.
          </Text>
        )}
      </Animated.View>

      <View style={styles.buttonsWrap}>
        <Button
          title="Voir mes rendez-vous"
          onPress={() => router.replace("/(tabs)/mes-rdv")}
          size="lg"
          icon={<Calendar size={18} color={colors.white} />}
          style={{ width: "100%" }}
        />
        <Button
          title="Retour à l'accueil"
          onPress={() => router.replace("/(tabs)")}
          variant="ghost"
          size="md"
          icon={<Home size={18} color={colors.primary} />}
          style={{ width: "100%", marginTop: spacing.sm }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.greenFaint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: colors.slate500,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  infoCard: {
    alignItems: "center",
    marginTop: spacing.lg,
    backgroundColor: colors.purpleFaint,
    padding: spacing.md,
    borderRadius: radius.lg,
    width: "100%",
  },
  videoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  videoBadgeText: { fontSize: 13, fontWeight: "700", color: colors.white },
  buttonsWrap: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
