import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, ActivityIndicator, Alert, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { getPatient } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

const PURPLE = "#7C3AED";

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
  const [consultMode, setConsultMode] = useState<"cabinet" | "teleconsult">("cabinet");

  useEffect(() => {
    api.getDoctor(slug).then((d) => {
      setDoctor(d);
      // Auto-select teleconsult if that's the only option
      if (d?.consultation_mode === "teleconsult") {
        setConsultMode("teleconsult");
      }
    });
  }, [slug]);

  useEffect(() => {
    getPatient().then((p) => {
      if (p?.name) setName(p.name);
      if (p?.phone) setPhone(p.phone);
    });
  }, []);

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
      const result = await api.bookAppointment({
        doctorId: doctor.id,
        patientName: name,
        patientPhone: phone,
        date: selectedDate,
        startTime: selectedTime,
        reason: reason || undefined,
        type: consultMode === "teleconsult" ? "teleconsult" : undefined,
      });
      if (result?.id) {
        const isTeleconsult = doctor?.consultation_mode === "teleconsult";
        const confirmPath = isTeleconsult
          ? `/rdv/${result.id}/confirmation?type=teleconsult`
          : `/rdv/${result.id}/confirmation`;
        router.replace(confirmPath as any);
      } else {
        Alert.alert("Réservation confirmée", "Votre rendez-vous a été pris.");
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de réserver");
    } finally {
      setLoading(false);
    }
  }

  const availableSlots = slots.filter((s) => s.available);

  return (
    <ScrollView style={styles.container}>
      {doctor && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avec {doctor.name}</Text>
        </View>
      )}

      {/* Mode selection — only shown when doctor supports both */}
      {doctor?.consultation_mode === "both" && (
        <View style={styles.section}>
          <Text style={styles.label}>Type de consultation</Text>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeCard, consultMode === "cabinet" && styles.modeCardActiveTeal]}
              onPress={() => setConsultMode("cabinet")}
            >
              <Text style={styles.modeIcon}>🏥</Text>
              <Text style={[styles.modeLabel, consultMode === "cabinet" && styles.modeLabelActiveTeal]}>
                Au cabinet
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeCard, consultMode === "teleconsult" && styles.modeCardActivePurple]}
              onPress={() => setConsultMode("teleconsult")}
            >
              <Text style={styles.modeIcon}>📹</Text>
              <Text style={[styles.modeLabel, consultMode === "teleconsult" && styles.modeLabelActivePurple]}>
                En vidéo
              </Text>
            </Pressable>
          </View>
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
          <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
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
          <TextInput style={styles.input} placeholder="Nom complet" value={name} onChangeText={setName} placeholderTextColor={colors.slate500} />
          <TextInput style={styles.input} placeholder="+216 XX XXX XXX" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.slate500} />
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Motif (optionnel)" value={reason} onChangeText={setReason} multiline placeholderTextColor={colors.slate500} />
          <Button
            title={loading ? "Réservation..." : "Confirmer le RDV"}
            onPress={handleBook}
            loading={loading}
            disabled={!name || !phone}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { backgroundColor: colors.white, margin: spacing.md, marginBottom: 0, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: colors.ink },
  label: { fontSize: 14, fontWeight: "600", color: colors.slate500, marginBottom: 4 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.mist, borderRadius: radius.sm },
  dateChipActive: { backgroundColor: colors.primary },
  dateChipText: { fontSize: 13, color: colors.slate500 },
  dateChipTextActive: { color: colors.white },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  slot: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.mist, borderRadius: radius.sm, minWidth: 72, alignItems: "center" },
  slotActive: { backgroundColor: colors.primary },
  slotText: { fontSize: 14, color: colors.slate500 },
  slotTextActive: { color: colors.white, fontWeight: "600" },
  empty: { color: colors.slate500, textAlign: "center", marginTop: 12 },
  input: { backgroundColor: colors.bg, padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, marginTop: 8, fontSize: 15 },
  modeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  modeCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    gap: spacing.xs,
  },
  modeCardActiveTeal: { borderColor: colors.primary, backgroundColor: "#F0FDFA" },
  modeCardActivePurple: { borderColor: PURPLE, backgroundColor: "#F5F3FF" },
  modeIcon: { fontSize: 24 },
  modeLabel: { fontSize: 14, fontWeight: "600", color: colors.slate500 },
  modeLabelActiveTeal: { color: colors.primary },
  modeLabelActivePurple: { color: PURPLE },
});
