import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  city: string;
  address: string;
  bio?: string;
  photoUrl?: string;
  slug: string;
};

type AppointmentType = {
  id: string;
  name: string;
  durationMinutes: number;
  price?: number;
};

type Slot = {
  startTime: string;
  endTime: string;
};

type AvailabilityDay = {
  date: string;
  slots: Slot[];
};

function getWeekDays(): Date[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function DoctorProfile() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weekDays = getWeekDays();

  useEffect(() => {
    if (!slug) return;
    loadDoctor();
  }, [slug]);

  useEffect(() => {
    if (doctor) loadSlots();
  }, [doctor, selectedDay, selectedType]);

  async function loadDoctor() {
    setLoadingDoctor(true);
    setError(null);
    try {
      const doc = await api<Doctor>(`/api/doctors/by-slug/${slug}`, { skipAuth: true });
      setDoctor(doc);
      const typesData = await api<AppointmentType[]>(`/api/appointment-types?doctorId=${doc.id}`, { skipAuth: true });
      setTypes(typesData);
      if (typesData.length > 0) setSelectedType(typesData[0]);
    } catch {
      setError("Impossible de charger le profil du médecin");
    } finally {
      setLoadingDoctor(false);
    }
  }

  async function loadSlots() {
    if (!doctor) return;
    setLoadingSlots(true);
    try {
      const qp = new URLSearchParams({ start: isoDate(selectedDay), days: "1" });
      if (selectedType) qp.set("typeId", selectedType.id);
      const data = await api<{ days: AvailabilityDay[] }>(
        `/api/doctors/by-slug/${slug}/availability?${qp}`,
        { skipAuth: true }
      );
      const day = data.days?.find((d) => d.date === isoDate(selectedDay));
      setSlots(day?.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  if (loadingDoctor) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      </SafeAreaView>
    );
  }

  if (error || !doctor) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error ?? "Médecin introuvable"}</Text>
          <Pressable onPress={loadDoctor} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      {/* Custom back header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Profil médecin</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Doctor info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {doctor.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.specialty}>{doctor.specialty}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.foregroundSecondary} />
            <Text style={styles.locationText}>{doctor.address}</Text>
          </View>
        </View>

        {/* Bio */}
        {doctor.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.bio}>{doctor.bio}</Text>
          </View>
        )}

        {/* Motifs */}
        {types.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Motif de consultation</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {types.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setSelectedType(t)}
                  style={[styles.typeChip, selectedType?.id === t.id && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, selectedType?.id === t.id && styles.typeChipTextActive]}>
                    {t.name}
                  </Text>
                  <Text style={[styles.typeDuration, selectedType?.id === t.id && { color: "rgba(255,255,255,0.8)" }]}>
                    {t.durationMinutes} min
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Day picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disponibilités</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.md }}>
            {weekDays.map((d) => {
              const active = isoDate(d) === isoDate(selectedDay);
              return (
                <Pressable key={isoDate(d)} onPress={() => setSelectedDay(d)} style={[styles.dayBtn, active && styles.dayBtnActive]}>
                  <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{DAYS[d.getDay()]}</Text>
                  <Text style={[styles.dayNum, active && styles.dayNumActive]}>{d.getDate()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingSlots ? (
            <ActivityIndicator color={colors.teal} />
          ) : slots.length === 0 ? (
            <View style={styles.noSlots}>
              <Text style={styles.noSlotsText}>Aucun créneau disponible ce jour</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => {
                const dateStr = isoDate(selectedDay);
                const startsAt = `${dateStr}T${slot.startTime}:00`;
                const endsAt = `${dateStr}T${slot.endTime}:00`;
                return (
                  <Pressable
                    key={slot.startTime}
                    style={styles.slotBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/(patient)/booking/[slug]" as never,
                        params: {
                          slug: doctor.slug,
                          doctorId: doctor.id,
                          slot: startsAt,
                          slotEnd: endsAt,
                          typeId: selectedType?.id ?? "",
                          typeName: selectedType?.name ?? "",
                          doctorName: doctor.name,
                          doctorSpecialty: doctor.specialty,
                          doctorAddress: doctor.address,
                        },
                      })
                    }
                  >
                    <Text style={styles.slotText}>{slot.startTime}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: colors.foreground },
  content: { paddingBottom: spacing["3xl"] },
  profileSection: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontSize: 28, fontWeight: "800" },
  doctorName: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  specialty: { fontSize: 14, color: colors.foregroundSecondary },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 13, color: colors.foregroundSecondary },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: spacing.md },
  bio: { fontSize: 14, color: colors.foregroundSecondary, lineHeight: 21 },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 2,
  },
  typeChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  typeChipText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  typeChipTextActive: { color: "#FFF" },
  typeDuration: { fontSize: 11, color: colors.foregroundSecondary },
  dayBtn: {
    width: 52,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  dayBtnActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  dayLabel: { fontSize: 11, fontWeight: "600", color: colors.foregroundSecondary },
  dayLabelActive: { color: "rgba(255,255,255,0.8)" },
  dayNum: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  dayNumActive: { color: "#FFF" },
  noSlots: { alignItems: "center", paddingVertical: spacing.xl },
  noSlotsText: { fontSize: 14, color: colors.foregroundSecondary },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slotBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  slotText: { fontSize: 14, fontWeight: "600", color: colors.teal },
  errorState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  errorText: { fontSize: 15, color: colors.foregroundSecondary, textAlign: "center" },
  retryBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryText: { color: "#FFF", fontWeight: "700" },
});
