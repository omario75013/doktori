import { Pressable, View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";
import { SPECIALTIES, CITIES } from "@doktori/shared";

type Props = {
  doctor: {
    id: string;
    name: string;
    slug: string;
    specialty: string;
    city: string;
    consultationFee?: number | null;
  };
  onPress: () => void;
};

export function DoctorCard({ doctor, onPress }: Props) {
  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{doctor.name?.charAt(0) || "?"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{doctor.name}</Text>
        <Text style={styles.specialty}>{spec?.label ?? doctor.specialty}</Text>
        <Text style={styles.city}>{city?.label ?? doctor.city}</Text>
      </View>
      {doctor.consultationFee ? (
        <Text style={styles.fee}>{doctor.consultationFee / 1000} DT</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: radius.md,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.mist,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: colors.primary },
  name: { fontSize: 16, fontWeight: "600", color: colors.ink },
  specialty: { fontSize: 14, color: colors.primary, marginTop: 2 },
  city: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  fee: { fontSize: 16, fontWeight: "700", color: colors.ink },
});
