import { useRef } from "react";
import { Pressable, View, Text, StyleSheet, Animated } from "react-native";
import { MapPin, Star, Video } from "lucide-react-native";
import { colors, radius, spacing, shadow } from "@/lib/theme";
import { SPECIALTIES, CITIES } from "@doktori/shared";

type Props = {
  doctor: {
    id: string;
    name: string;
    slug: string;
    specialty: string;
    city: string;
    consultationFee?: number | null;
    averageRating?: number | null;
    reviewCount?: number;
    consultation_mode?: string;
    isAvailableToday?: boolean;
  };
  onPress: () => void;
};

export function DoctorCard({ doctor, onPress }: Props) {
  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);
  const scale = useRef(new Animated.Value(1)).current;
  const hasTeleconsult = doctor.consultation_mode === "teleconsult" || doctor.consultation_mode === "both";

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <Pressable style={[styles.card, shadow.sm]} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{doctor.name?.charAt(0) || "?"}</Text>
          </View>
          {doctor.isAvailableToday && <View style={styles.onlineDot} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{doctor.name}</Text>
          <Text style={styles.specialty} numberOfLines={1}>{spec?.label ?? doctor.specialty}</Text>
          <View style={styles.metaRow}>
            <MapPin size={12} color={colors.slate400} />
            <Text style={styles.city}>{city?.label ?? doctor.city}</Text>
            {doctor.averageRating != null && doctor.averageRating > 0 && (
              <>
                <View style={styles.metaDot} />
                <Star size={12} color={colors.orange} fill={colors.orange} />
                <Text style={styles.rating}>{doctor.averageRating.toFixed(1)}</Text>
                {doctor.reviewCount != null && doctor.reviewCount > 0 && (
                  <Text style={styles.reviewCount}>({doctor.reviewCount})</Text>
                )}
              </>
            )}
          </View>
          {hasTeleconsult && (
            <View style={styles.teleconsultTag}>
              <Video size={11} color={colors.purple} />
              <Text style={styles.teleconsultText}>Vidéo</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: colors.primary },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.white,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink, letterSpacing: -0.2 },
  specialty: { fontSize: 14, color: colors.primary, marginTop: 2, fontWeight: "500" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.slate400, marginHorizontal: 4 },
  city: { fontSize: 13, color: colors.slate500 },
  rating: { fontSize: 13, fontWeight: "600", color: colors.ink, marginLeft: 2 },
  reviewCount: { fontSize: 12, color: colors.slate400 },
  teleconsultTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: colors.purpleFaint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  teleconsultText: { fontSize: 11, fontWeight: "600", color: colors.purple },
});
