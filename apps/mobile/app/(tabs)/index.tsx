import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Search as SearchIcon, SlidersHorizontal, MapPin, X,
  Stethoscope, Siren, Calendar, Star, Activity, Heart, Clock,
  ChevronRight,
} from "lucide-react-native";
import * as Location from "expo-location";
import { apiFetch } from "@/lib/api";
import { SPECIALTIES } from "@doktori/shared";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { DoctorCard } from "@/components/ui/DoctorCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { DoctorCardSkeleton } from "@/components/ui/SkeletonLoader";
import { getRecentDoctors, getFavorites, type SavedDoctor } from "@/lib/favorites";

const { width } = Dimensions.get("window");

type SortOption = "relevance" | "distance" | "fee_asc" | "fee_desc";
type AvailabilityOption = "all" | "today" | "tomorrow" | "week";

interface Filters {
  specialty: string | undefined;
  feeMin: string;
  feeMax: string;
  availability: AvailabilityOption;
  sort: SortOption;
  lat: number | undefined;
  lng: number | undefined;
}

const DEFAULT_FILTERS: Filters = {
  specialty: undefined, feeMin: "", feeMax: "",
  availability: "all", sort: "relevance",
  lat: undefined, lng: undefined,
};

const AVAILABILITY_OPTIONS: { id: AvailabilityOption; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "today", label: "Aujourd'hui" },
  { id: "tomorrow", label: "Demain" },
  { id: "week", label: "Cette semaine" },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "relevance", label: "Pertinence" },
  { id: "distance", label: "Proximité" },
];

const QUICK_SPECIALTIES = [
  { id: "generaliste", label: "Généraliste", icon: Stethoscope, color: colors.primary, bg: colors.primaryFaint },
  { id: "dentiste", label: "Dentiste", icon: Star, color: "#2563EB", bg: "#EFF6FF" },
  { id: "ophtalmologue", label: "Ophtalmo", icon: Activity, color: "#7C3AED", bg: "#F5F3FF" },
  { id: "cardiologue", label: "Cardio", icon: Activity, color: "#DC2626", bg: "#FEF2F2" },
];

function countActiveFilters(f: Filters): number {
  let c = 0;
  if (f.specialty) c++;
  if (f.availability !== "all") c++;
  if (f.sort !== "relevance") c++;
  return c;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentDoctors, setRecentDoctors] = useState<SavedDoctor[]>([]);
  const [favoriteDoctors, setFavoriteDoctors] = useState<SavedDoctor[]>([]);

  useEffect(() => {
    getRecentDoctors().then(setRecentDoctors);
    getFavorites().then(setFavoriteDoctors);
  }, []);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const activeFilterCount = countActiveFilters(filters);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (filters.specialty) params.set("specialty", filters.specialty);
      if (filters.availability !== "all") params.set("availability", filters.availability);
      if (filters.sort !== "relevance") params.set("sort", filters.sort);
      if (filters.lat !== undefined) params.set("lat", String(filters.lat));
      if (filters.lng !== undefined) params.set("lng", String(filters.lng));
      const data = await apiFetch<any>(`/api/search?${params.toString()}`);
      setResults(data.hits || []);
      setHasSearched(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  useEffect(() => {
    const handler = setTimeout(doSearch, 300);
    return () => clearTimeout(handler);
  }, [doSearch]);

  function onRefresh() {
    setRefreshing(true);
    doSearch().finally(() => setRefreshing(false));
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() { setFilters(DEFAULT_FILTERS); }

  async function requestLocation() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setFilters((prev) => ({
        ...prev, lat: location.coords.latitude, lng: location.coords.longitude, sort: "distance",
      }));
    } catch (e) { console.error(e); }
    finally { setLocationLoading(false); }
  }

  const showHero = !searchFocused && !hasSearched && results.length === 0;

  return (
    <View style={styles.container}>
      {/* Search header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}>
        {/* Search bar */}
        <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
          <SearchIcon size={20} color={searchFocused ? colors.primary : colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un médecin..."
            placeholderTextColor={colors.slate400}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <X size={18} color={colors.slate400} />
            </Pressable>
          )}
        </View>

        {/* Quick filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable
            style={[styles.filterPill, filters.lat !== undefined && styles.filterPillActive]}
            onPress={requestLocation}
            disabled={locationLoading}
          >
            <MapPin size={14} color={filters.lat !== undefined ? colors.white : colors.primary} />
            <Text style={[styles.filterPillText, filters.lat !== undefined && styles.filterPillTextActive]}>
              {locationLoading ? "..." : "Près de moi"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterPill, filtersExpanded && styles.filterPillActive]}
            onPress={() => setFiltersExpanded((v) => !v)}
          >
            <SlidersHorizontal size={14} color={filtersExpanded ? colors.white : colors.primary} />
            <Text style={[styles.filterPillText, filtersExpanded && styles.filterPillTextActive]}>Filtres</Text>
            {activeFilterCount > 0 && (
              <View style={styles.countBadge}><Text style={styles.countBadgeText}>{activeFilterCount}</Text></View>
            )}
          </Pressable>

          {AVAILABILITY_OPTIONS.filter(o => o.id !== "all").map((opt) => (
            <Pressable
              key={opt.id}
              style={[styles.filterPill, filters.availability === opt.id && styles.filterPillActive]}
              onPress={() => updateFilter("availability", filters.availability === opt.id ? "all" : opt.id)}
            >
              <Text style={[styles.filterPillText, filters.availability === opt.id && styles.filterPillTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}

          {activeFilterCount > 0 && (
            <Pressable style={styles.resetPill} onPress={resetFilters}>
              <X size={14} color={colors.red} />
            </Pressable>
          )}
        </ScrollView>

        {/* Expanded filter panel */}
        {filtersExpanded && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterLabel}>Spécialité</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
              {SPECIALTIES.map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.chip, filters.specialty === s.id && styles.chipActive]}
                  onPress={() => updateFilter("specialty", filters.specialty === s.id ? undefined : s.id)}
                >
                  <Text style={[styles.chipText, filters.specialty === s.id && styles.chipTextActive]}>{s.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.filterLabel, { marginTop: 8 }]}>Trier par</Text>
            <View style={styles.pillRow}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, filters.sort === opt.id && styles.chipActive]}
                  onPress={() => updateFilter("sort", opt.id)}
                >
                  <Text style={[styles.chipText, filters.sort === opt.id && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Animated.View>

      {/* Results or hero */}
      {loading && !refreshing ? (
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <DoctorCardSkeleton />
          <DoctorCardSkeleton />
          <DoctorCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={showHero ? (
            <View>
              {/* Quick specialty cards */}
              <Text style={styles.quickTitle}>Spécialités populaires</Text>
              <View style={styles.quickGrid}>
                {QUICK_SPECIALTIES.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Pressable
                      key={s.id}
                      style={[styles.quickCard, shadow.sm]}
                      onPress={() => {
                        updateFilter("specialty", s.id);
                        setHasSearched(true);
                      }}
                    >
                      <View style={[styles.quickIcon, { backgroundColor: s.bg }]}>
                        <Icon size={22} color={s.color} />
                      </View>
                      <Text style={styles.quickLabel}>{s.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* SOS banner */}
              <Pressable style={[styles.sosBanner, shadow.md]} onPress={() => router.push("/(tabs)/sos")}>
                <View style={styles.sosIconWrap}>
                  <Siren size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sosTitle}>Urgence ?</Text>
                  <Text style={styles.sosSubtitle}>Un médecin vous contacte en moins de 2 min</Text>
                </View>
                <View style={styles.sosArrow}>
                  <Text style={styles.sosArrowText}>→</Text>
                </View>
              </Pressable>

              {/* Favorites */}
              {favoriteDoctors.length > 0 && (
                <View style={styles.heroSection}>
                  <View style={styles.heroSectionHeader}>
                    <Heart size={16} color={colors.red} fill={colors.red} />
                    <Text style={styles.quickTitle}>Mes médecins favoris</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                    {favoriteDoctors.map((d) => (
                      <Pressable key={d.id} style={[styles.miniDoctorCard, shadow.sm]} onPress={() => router.push(`/medecin/${d.slug}`)}>
                        <View style={styles.miniAvatar}><Text style={styles.miniAvatarText}>{d.name.charAt(0)}</Text></View>
                        <Text style={styles.miniName} numberOfLines={1}>{d.name}</Text>
                        <Text style={styles.miniSpec} numberOfLines={1}>{d.specialty}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Recent doctors */}
              {recentDoctors.length > 0 && (
                <View style={styles.heroSection}>
                  <View style={styles.heroSectionHeader}>
                    <Clock size={16} color={colors.slate500} />
                    <Text style={styles.quickTitle}>Consultés récemment</Text>
                  </View>
                  {recentDoctors.slice(0, 3).map((d) => (
                    <Pressable key={d.id} style={[styles.recentCard, shadow.sm]} onPress={() => router.push(`/medecin/${d.slug}`)}>
                      <View style={styles.recentAvatar}><Text style={styles.recentAvatarText}>{d.name.charAt(0)}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recentName}>{d.name}</Text>
                        <Text style={styles.recentSpec}>{d.specialty}</Text>
                      </View>
                      <ChevronRight size={16} color={colors.slate200} />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* All specialties link */}
              <Pressable style={styles.allSpecBtn} onPress={() => setFiltersExpanded(true)}>
                <Text style={styles.allSpecText}>Voir toutes les spécialités</Text>
              </Pressable>
            </View>
          ) : null}
          ListEmptyComponent={
            hasSearched ? (
              <EmptyState
                icon={<SearchIcon size={48} color={colors.slate200} />}
                title="Aucun résultat"
                description="Essayez avec d'autres termes ou filtres"
              />
            ) : null
          }
          renderItem={({ item }) => (
            <DoctorCard doctor={item} onPress={() => router.push(`/medecin/${item.slug}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    ...shadow.sm,
  },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.bg,
    marginHorizontal: spacing.md, paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border,
  },
  searchRowFocused: {
    borderColor: colors.primary, backgroundColor: colors.white,
    ...shadow.sm,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink },
  filterRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 4,
  },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPillText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  filterPillTextActive: { color: colors.white },
  countBadge: {
    backgroundColor: colors.red, borderRadius: radius.full,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  countBadgeText: { fontSize: 10, fontWeight: "700", color: colors.white },
  resetPill: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.redFaint, alignItems: "center", justifyContent: "center",
  },
  filterPanel: {
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  filterLabel: {
    fontSize: 12, fontWeight: "700", color: colors.slate400,
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.bg, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextActive: { color: colors.white, fontWeight: "600" },

  // Hero section
  quickTitle: {
    fontSize: 16, fontWeight: "800", color: colors.ink,
    marginBottom: spacing.sm, letterSpacing: -0.3,
  },
  quickGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickCard: {
    width: (width - spacing.md * 2 - spacing.sm) / 2 - 1,
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, alignItems: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  quickIcon: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  quickLabel: { fontSize: 14, fontWeight: "700", color: colors.ink },

  // SOS Banner
  sosBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.red, borderRadius: radius.xl,
    padding: spacing.md, marginBottom: spacing.md,
  },
  sosIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  sosTitle: { fontSize: 16, fontWeight: "800", color: colors.white },
  sosSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  sosArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  sosArrowText: { fontSize: 18, color: colors.white, fontWeight: "700" },

  // Hero sections
  heroSection: { marginBottom: spacing.lg },
  heroSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },

  // Mini doctor cards (favorites horizontal scroll)
  miniDoctorCard: {
    width: 100, alignItems: "center", padding: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  miniAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  miniAvatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  miniName: { fontSize: 12, fontWeight: "700", color: colors.ink, textAlign: "center" },
  miniSpec: { fontSize: 11, color: colors.slate400, textAlign: "center", marginTop: 1 },

  // Recent doctor cards
  recentCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xs,
  },
  recentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" },
  recentAvatarText: { fontSize: 15, fontWeight: "700", color: colors.primary },
  recentName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  recentSpec: { fontSize: 12, color: colors.slate400 },

  allSpecBtn: { alignItems: "center", paddingVertical: spacing.sm },
  allSpecText: { fontSize: 14, fontWeight: "600", color: colors.primary, textDecorationLine: "underline" },
});
