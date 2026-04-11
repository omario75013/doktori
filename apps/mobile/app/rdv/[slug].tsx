import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";

export default function BookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<any>(null);
  const [dates] = useState(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        value: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }),
      });
    }
    return arr;
  });
  const [selectedDate, setSelectedDate] = useState(dates[0].value);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.getDoctor(slug).then(setDoctor);
  }, [slug]);

  useEffect(() => {
    if (!doctor) return;
    setLoading(true);
    setSelectedTime(null);
    api.getSlots(doctor.id, selectedDate).then((s) => { setSlots(s); setLoading(false); }).catch(() => setLoading(false));
  }, [doctor, selectedDate]);

  async function handleBook() {
    if (!doctor || !selectedTime || !name || !phone) return;
    setLoading(true);
    try {
      await api.bookAppointment({
        doctorId: doctor.id,
        patientName: name,
        patientPhone: phone,
        date: selectedDate,
        startTime: selectedTime,
        reason: reason || undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de réserver");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Rendez-vous confirmé !</Text>
        <Text style={styles.successText}>Vous recevrez un SMS de rappel la veille.</Text>
        <Pressable style={styles.cta} onPress={() => router.push("/(tabs)")}>
          <Text style={styles.ctaText}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    );
  }

  const availableSlots = slots.filter((s) => s.available);

  return (
    <ScrollView style={styles.container}>
      {doctor && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avec {doctor.name}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Choisissez une date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {dates.map((d) => (
              <Pressable
                key={d.value}
                onPress={() => setSelectedDate(d.value)}
                style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
              >
                <Text style={[styles.dateChipText, selectedDate === d.value && styles.dateChipTextActive]}>
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Choisissez un créneau</Text>
        {loading ? (
          <ActivityIndicator color="#2563eb" style={{ marginTop: 12 }} />
        ) : availableSlots.length === 0 ? (
          <Text style={styles.empty}>Aucun créneau disponible ce jour</Text>
        ) : (
          <View style={styles.slotGrid}>
            {availableSlots.map((slot) => (
              <Pressable
                key={slot.startTime}
                onPress={() => setSelectedTime(slot.startTime)}
                style={[styles.slot, selectedTime === slot.startTime && styles.slotActive]}
              >
                <Text style={[styles.slotText, selectedTime === slot.startTime && styles.slotTextActive]}>
                  {slot.startTime}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {selectedTime && (
        <View style={styles.section}>
          <Text style={styles.label}>Vos coordonnées</Text>
          <TextInput style={styles.input} placeholder="Nom complet" value={name} onChangeText={setName} placeholderTextColor="#9ca3af" />
          <TextInput style={styles.input} placeholder="+216 XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#9ca3af" />
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Motif (optionnel)" value={reason} onChangeText={setReason} multiline placeholderTextColor="#9ca3af" />
          <Pressable style={[styles.cta, (!name || !phone) && { opacity: 0.5 }]} onPress={handleBook} disabled={!name || !phone || loading}>
            <Text style={styles.ctaText}>{loading ? "Réservation..." : "Confirmer le RDV"}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  section: { backgroundColor: "#fff", margin: 16, marginBottom: 0, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#f3f4f6", borderRadius: 8 },
  dateChipActive: { backgroundColor: "#2563eb" },
  dateChipText: { fontSize: 13, color: "#374151" },
  dateChipTextActive: { color: "#fff" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  slot: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#f3f4f6", borderRadius: 8, minWidth: 72, alignItems: "center" },
  slotActive: { backgroundColor: "#2563eb" },
  slotText: { fontSize: 14, color: "#374151" },
  slotTextActive: { color: "#fff", fontWeight: "600" },
  empty: { color: "#9ca3af", textAlign: "center", marginTop: 12 },
  input: { backgroundColor: "#f9fafb", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", marginTop: 8, fontSize: 15 },
  cta: { backgroundColor: "#2563eb", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 16 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "#f9fafb" },
  successIcon: { fontSize: 64, color: "#22c55e", marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 8 },
  successText: { fontSize: 15, color: "#6b7280", textAlign: "center" },
});
