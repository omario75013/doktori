import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { api } from "@/lib/api";
import { SPECIALTIES, CITIES } from "@doktori/shared";

export default function DoctorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDoctor(slug).then((d) => { setDoctor(d); setLoading(false); }).catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2563eb" />;
  if (!doctor) return <Text style={{ padding: 20 }}>Médecin introuvable</Text>;

  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);

  return (
    <>
      <Stack.Screen options={{ title: doctor.name }} />
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{doctor.name.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{doctor.name}</Text>
          <Text style={styles.specialty}>{spec?.label}</Text>
          <Text style={styles.city}>{city?.label}</Text>
          {doctor.consultationFee && (
            <Text style={styles.fee}>Consultation : {doctor.consultationFee / 1000} DT</Text>
          )}
          <Text style={styles.address}>{doctor.address}</Text>
          {doctor.bio && <Text style={styles.bio}>{doctor.bio}</Text>}
        </View>

        <Pressable style={styles.cta} onPress={() => router.push(`/rdv/${doctor.slug}`)}>
          <Text style={styles.ctaText}>Prendre rendez-vous</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  card: { backgroundColor: "#fff", margin: 16, padding: 24, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#2563eb" },
  name: { fontSize: 20, fontWeight: "700", color: "#111827" },
  specialty: { fontSize: 16, color: "#2563eb", marginTop: 4 },
  city: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  fee: { fontSize: 14, color: "#111827", marginTop: 8 },
  address: { fontSize: 13, color: "#6b7280", marginTop: 8, textAlign: "center" },
  bio: { fontSize: 14, color: "#374151", marginTop: 16, lineHeight: 20, textAlign: "center" },
  cta: { backgroundColor: "#2563eb", margin: 16, padding: 16, borderRadius: 12, alignItems: "center" },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
