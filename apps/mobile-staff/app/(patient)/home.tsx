import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

const SPECIALTIES = [
  { label: "Généraliste", value: "generaliste" },
  { label: "Cardiologue", value: "cardiologue" },
  { label: "Pédiatre", value: "pediatre" },
  { label: "Dermatologue", value: "dermatologue" },
  { label: "Dentiste", value: "dentiste" },
];

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  city: string;
  slug: string;
  photoUrl: string | null;
  averageRating?: number;
  availableToday?: boolean;
};

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  doctorName: string;
  doctorSpecialty: string;
};

async function getPatientToken(): Promise<string | null> {
  const SecureStore = await import("expo-secure-store").catch(() => null);
  return SecureStore ? SecureStore.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

export default function PatientHome() {
  const { locale } = useLocale();
  const [patientName, setPatientName] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [results, setResults] = useState<Doctor[]>([]);
  const [defaultDoctors, setDefaultDoctors] = useState<Doctor[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingDefault, setLoadingDefault] = useState(true);
  const [nextAppt, setNextAppt] = useState<Appointment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadDefaultDoctors();
  }, []);

  async function loadData() {
    try {
      const token = await getPatientToken();
      if (!token) return;
      const appts = await api<Appointment[]>("/api/appointments/patient", { token });
      const upcoming = appts.filter(
        (a) => a.status !== "cancelled" && new Date(a.startsAt) > new Date()
      );
      setNextAppt(upcoming[0] ?? null);
    } catch {
      // silent fail
    }
  }

  async function loadDefaultDoctors() {
    setLoadingDefault(true);
    try {
      const data = await api<{ hits: Doctor[] }>("/api/search", { skipAuth: true });
      setDefaultDoctors(data.hits ?? []);
    } catch {
      // silent fail
    } finally {
      setLoadingDefault(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadDefaultDoctors()]);
    setRefreshing(false);
  }, []);

  async function search(q: string, specialty: string | null) {
    if (!q && !specialty) {
      setIsSearchActive(false);
      setResults([]);
      return;
    }
    setIsSearchActive(true);
    setSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (specialty) params.set("specialty", specialty);
      const data = await api<{ hits: Doctor[] }>(`/api/search?${params.toString()}`, {
        skipAuth: true,
      });
      setResults(data.hits ?? []);
    } catch {
      setSearchError(t("common.error"));
    } finally {
      setSearching(false);
    }
  }

  function handleQueryChange(text: string) {
    setQuery(text);
    search(text, selectedSpecialty);
  }

  function handleSpecialty(spec: string) {
    const next = selectedSpecialty === spec ? null : spec;
    setSelectedSpecialty(next);
    search(query, next);
  }

  function minutesUntil(iso: string): number {
    return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  }

  const canJoin = nextAppt
    ? nextAppt.type === "teleconsult" && Math.abs(minutesUntil(nextAppt.startsAt)) <= 15
    : false;

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.greeting}>
              {t("patient.home.greeting", { name: patientName ? `, ${patientName}` : "" })}
            </Text>
            <Text style={styles.subGreeting}>{t("patient.home.subGreeting")}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pressable
              onPress={() => router.push("/(patient)/notifications")}
              style={styles.iconBtn}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.teal} />
            </Pressable>
            <Pressable onPress={() => router.push("/(patient)/profil")}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={colors.teal} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={colors.foregroundSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder={t("patient.home.searchPlaceholder")}
            placeholderTextColor={colors.foregroundSecondary}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); search("", selectedSpecialty); }}>
              <Ionicons name="close-circle" size={18} color={colors.foregroundSecondary} />
            </Pressable>
          )}
        </View>

        {/* Specialty chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
          {SPECIALTIES.map((s) => (
            <Pressable
              key={s.value}
              onPress={() => handleSpecialty(s.value)}
              style={[styles.chip, selectedSpecialty === s.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedSpecialty === s.value && styles.chipTextActive]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isSearchActive ? (
          /* Search results */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("patient.home.searchResults")}</Text>
            {searching ? (
              <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.lg }} />
            ) : searchError ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{searchError}</Text>
                <Pressable onPress={() => search(query, selectedSpecialty)} style={styles.retryBtn}>
                  <Text style={styles.retryText}>{t("common.retry")}</Text>
                </Pressable>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={40} color={colors.border} />
                <Text style={styles.emptyText}>{t("patient.home.noResults")}</Text>
              </View>
            ) : (
              results.map((doc) => <DoctorCard key={doc.id} doc={doc} />)
            )}
          </View>
        ) : (
          <>
            {/* Next appointment card */}
            {nextAppt && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("patient.home.nextRdv")}</Text>
                <View style={styles.apptCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.apptDoctor}>{nextAppt.doctorName}</Text>
                    <Text style={styles.apptMeta}>{nextAppt.doctorSpecialty}</Text>
                    <Text style={styles.apptDate}>
                      {new Date(nextAppt.startsAt).toLocaleDateString("fr-FR", {
                        weekday: "long", day: "numeric", month: "long",
                      })} à {new Date(nextAppt.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    {minutesUntil(nextAppt.startsAt) > 0 && (
                      <Text style={styles.countdown}>{t("patient.home.inMin", { min: minutesUntil(nextAppt.startsAt) })}</Text>
                    )}
                  </View>
                  {canJoin && (
                    <Pressable style={styles.joinBtn}>
                      <Text style={styles.joinBtnText}>{t("patient.home.join")}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* Default doctors list */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("patient.home.availableDoctors")}</Text>
              {loadingDefault ? (
                <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.lg }} />
              ) : defaultDoctors.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="medical-outline" size={40} color={colors.border} />
                  <Text style={styles.emptyText}>{t("patient.home.noDoctors")}</Text>
                </View>
              ) : (
                defaultDoctors.map((doc) => <DoctorCard key={doc.id} doc={doc} />)
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DoctorCard({ doc }: { doc: Doctor }) {
  return (
    <Pressable
      style={styles.doctorCard}
      onPress={() => router.push({ pathname: "/(patient)/doctor/[slug]" as never, params: { slug: doc.slug } })}
    >
      <View style={styles.doctorAvatar}>
        <Text style={styles.doctorAvatarText}>
          {doc.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.doctorName}>{doc.name}</Text>
        <Text style={styles.doctorMeta}>{doc.specialty} • {doc.city}</Text>
        {!!doc.averageRating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>{doc.averageRating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      {doc.availableToday && (
        <View style={styles.availBadge}>
          <Text style={styles.availText}>{t("patient.home.available")}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting: { fontSize: 20, fontWeight: "700", color: colors.foreground },
  subGreeting: { fontSize: 13, color: colors.foregroundSecondary, marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
  chipsScroll: { marginBottom: spacing.md },
  chipsContent: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.foregroundSecondary },
  chipTextActive: { color: "#FFFFFF" },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: spacing.sm,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorAvatarText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  doctorName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  doctorMeta: { fontSize: 12, color: colors.foregroundSecondary },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  ratingText: { fontSize: 12, color: colors.foregroundSecondary },
  availBadge: {
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  availText: { fontSize: 11, fontWeight: "600", color: colors.teal },
  apptCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.teal,
    gap: spacing.md,
  },
  apptDoctor: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  apptMeta: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  apptDate: { fontSize: 13, color: "#FFF", marginTop: 4 },
  countdown: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  joinBtn: {
    backgroundColor: "#FFF",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  joinBtnText: { color: colors.teal, fontWeight: "700", fontSize: 14 },
  emptyApptCard: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
  },
  emptyState: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  emptySubText: { fontSize: 13, color: colors.foregroundSecondary },
  retryBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryText: { color: "#FFF", fontWeight: "700" },
});
