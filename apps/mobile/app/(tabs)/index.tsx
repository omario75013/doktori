// apps/mobile/app/(tabs)/index.tsx
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Search as SearchIcon, Filter, MapPin, ChevronDown, ChevronUp } from "lucide-react-native";
import * as Location from "expo-location";
import { apiFetch } from "@/lib/api";
import { SPECIALTIES } from "@doktori/shared";
import { colors, spacing, radius } from "@/lib/theme";
import { DoctorCard } from "@/components/ui/DoctorCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
  specialty: undefined,
  feeMin: "",
  feeMax: "",
  availability: "all",
  sort: "relevance",
  lat: undefined,
  lng: undefined,
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
  { id: "fee_asc", label: "Tarif ↑" },
  { id: "fee_desc", label: "Tarif ↓" },
];

function countActiveFilters(filters: Filters): number {
  let count = 0;
  if (filters.specialty) count++;
  if (filters.feeMin) count++;
  if (filters.feeMax) count++;
  if (filters.availability !== "all") count++;
  if (filters.sort !== "relevance") count++;
  return count;
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

  const activeFilterCount = countActiveFilters(filters);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (filters.specialty) params.set("specialty", filters.specialty);
      if (filters.feeMin) params.set("feeMin", filters.feeMin);
      if (filters.feeMax) params.set("feeMax", filters.feeMax);
      if (filters.availability !== "all") params.set("availability", filters.availability);
      if (filters.sort !== "relevance") params.set("sort", filters.sort);
      if (filters.lat !== undefined) params.set("lat", String(filters.lat));
      if (filters.lng !== undefined) params.set("lng", String(filters.lng));

      const data = await apiFetch<any>(`/api/search?${params.toString()}`);
      setResults(data.hits || []);
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

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  async function requestLocation() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setFilters((prev) => ({
        ...prev,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        sort: "distance",
      }));
    } catch (e) {
      console.error("Location error:", e);
    } finally {
      setLocationLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trouvez un médecin</Text>
        <View style={styles.searchRow}>
          <SearchIcon size={18} color={colors.slate500} />
          <TextInput
            style={styles.input}
            placeholder="Nom, spécialité, ville..."
            placeholderTextColor={colors.slate500}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Filters toggle row */}
        <View style={styles.filterToggleRow}>
          <Pressable
            style={[styles.filterToggleBtn, filtersExpanded && styles.filterToggleBtnActive]}
            onPress={() => setFiltersExpanded((v) => !v)}
          >
            <Filter size={15} color={filtersExpanded ? colors.white : colors.primary} />
            <Text style={[styles.filterToggleText, filtersExpanded && styles.filterToggleTextActive]}>
              Filtres
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
            {filtersExpanded ? (
              <ChevronUp size={14} color={filtersExpanded ? colors.white : colors.primary} />
            ) : (
              <ChevronDown size={14} color={colors.primary} />
            )}
          </Pressable>

          {/* Near me */}
          <Pressable
            style={[styles.nearMeBtn, filters.lat !== undefined && styles.nearMeBtnActive]}
            onPress={requestLocation}
            disabled={locationLoading}
          >
            <MapPin size={15} color={filters.lat !== undefined ? colors.white : colors.primary} />
            <Text style={[styles.nearMeText, filters.lat !== undefined && styles.nearMeTextActive]}>
              {locationLoading ? "..." : "Près de moi"}
            </Text>
          </Pressable>

          {activeFilterCount > 0 && (
            <Pressable onPress={resetFilters} style={styles.resetLink}>
              <Text style={styles.resetText}>Réinitialiser</Text>
            </Pressable>
          )}
        </View>

        {/* Expandable filter panel */}
        {filtersExpanded && (
          <View style={styles.filterPanel}>
            {/* Specialty chips */}
            <Text style={styles.filterLabel}>Spécialité</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {SPECIALTIES.map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.chip, filters.specialty === s.id && styles.chipActive]}
                  onPress={() => updateFilter("specialty", filters.specialty === s.id ? undefined : s.id)}
                >
                  <Text style={[styles.chipText, filters.specialty === s.id && styles.chipTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Fee range */}
            <Text style={[styles.filterLabel, { marginTop: spacing.sm }]}>Tarif (DT)</Text>
            <View style={styles.feeRow}>
              <TextInput
                style={styles.feeInput}
                placeholder="Min"
                placeholderTextColor={colors.slate500}
                keyboardType="numeric"
                value={filters.feeMin}
                onChangeText={(v) => updateFilter("feeMin", v)}
              />
              <Text style={styles.feeSeparator}>—</Text>
              <TextInput
                style={styles.feeInput}
                placeholder="Max"
                placeholderTextColor={colors.slate500}
                keyboardType="numeric"
                value={filters.feeMax}
                onChangeText={(v) => updateFilter("feeMax", v)}
              />
            </View>

            {/* Availability */}
            <Text style={[styles.filterLabel, { marginTop: spacing.sm }]}>Disponibilité</Text>
            <View style={styles.pillRow}>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.pill, filters.availability === opt.id && styles.pillActive]}
                  onPress={() => updateFilter("availability", opt.id)}
                >
                  <Text style={[styles.pillText, filters.availability === opt.id && styles.pillTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Sort */}
            <Text style={[styles.filterLabel, { marginTop: spacing.sm }]}>Trier par</Text>
            <View style={styles.pillRow}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.pill, filters.sort === opt.id && styles.pillActive]}
                  onPress={() => updateFilter("sort", opt.id)}
                >
                  <Text style={[styles.pillText, filters.sort === opt.id && styles.pillTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="Recherchez un médecin"
              description="Tapez un nom, une spécialité ou une ville"
            />
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
    padding: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  input: { flex: 1, fontSize: 16, color: colors.ink },
  filterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  filterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  filterToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterToggleText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  filterToggleTextActive: { color: colors.white },
  badge: {
    backgroundColor: colors.red,
    borderRadius: radius.full,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.white },
  nearMeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  nearMeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nearMeText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  nearMeTextActive: { color: colors.white },
  resetLink: { paddingVertical: 8 },
  resetText: { fontSize: 13, color: colors.slate500, textDecorationLine: "underline" },
  filterPanel: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  filterLabel: { fontSize: 13, fontWeight: "600", color: colors.slate500, marginBottom: spacing.xs },
  chipsScroll: { maxHeight: 40 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.mist, borderRadius: radius.full },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextActive: { color: colors.white, fontWeight: "600" },
  feeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  feeInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.ink,
  },
  feeSeparator: { fontSize: 16, color: colors.slate500 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, color: colors.ink },
  pillTextActive: { color: colors.white, fontWeight: "600" },
});
