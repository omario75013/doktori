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
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Search as SearchIcon, SlidersHorizontal, MapPin, X, ChevronDown, ChevronUp, Stethoscope } from "lucide-react-native";
import * as Location from "expo-location";
import { apiFetch } from "@/lib/api";
import { SPECIALTIES } from "@doktori/shared";
import { colors, spacing, radius, shadow } from "@/lib/theme";
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
  const [hasSearched, setHasSearched] = useState(false);

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

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  async function requestLocation() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
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
      {/* Search header */}
      <View style={[styles.header, shadow.sm]}>
        {/* Search bar */}
        <View style={[styles.searchRow, shadow.sm]}>
          <SearchIcon size={20} color={colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom, spécialité, ville..."
            placeholderTextColor={colors.slate400}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <X size={18} color={colors.slate400} />
            </Pressable>
          )}
        </View>

        {/* Filter pills row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {/* Filters button */}
          <Pressable
            style={[styles.filterPill, filtersExpanded && styles.filterPillActive]}
            onPress={() => setFiltersExpanded((v) => !v)}
          >
            <SlidersHorizontal size={14} color={filtersExpanded ? colors.white : colors.primary} />
            <Text style={[styles.filterPillText, filtersExpanded && styles.filterPillTextActive]}>Filtres</Text>
            {activeFilterCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Near me */}
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

          {/* Quick specialty pills */}
          {SPECIALTIES.slice(0, 6).map((s) => (
            <Pressable
              key={s.id}
              style={[styles.filterPill, filters.specialty === s.id && styles.filterPillActive]}
              onPress={() => updateFilter("specialty", filters.specialty === s.id ? undefined : s.id)}
            >
              <Text style={[styles.filterPillText, filters.specialty === s.id && styles.filterPillTextActive]}>
                {s.label}
              </Text>
            </Pressable>
          ))}

          {activeFilterCount > 0 && (
            <Pressable style={styles.resetPill} onPress={resetFilters}>
              <X size={14} color={colors.slate500} />
              <Text style={styles.resetText}>Effacer</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Expandable filter panel */}
        {filtersExpanded && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterLabel}>Spécialité</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
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

            <Text style={[styles.filterLabel, { marginTop: spacing.sm }]}>Disponibilité</Text>
            <View style={styles.pillRow}>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, filters.availability === opt.id && styles.chipActive]}
                  onPress={() => updateFilter("availability", opt.id)}
                >
                  <Text style={[styles.chipText, filters.availability === opt.id && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterLabel, { marginTop: spacing.sm }]}>Trier par</Text>
            <View style={styles.pillRow}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.chip, filters.sort === opt.id && styles.chipActive]}
                  onPress={() => updateFilter("sort", opt.id)}
                >
                  <Text style={[styles.chipText, filters.sort === opt.id && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Results */}
      {loading && !refreshing ? (
        <LoadingSpinner message="Recherche en cours..." />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Stethoscope size={48} color={colors.primaryLight} />}
              title={hasSearched ? "Aucun résultat" : "Trouvez votre médecin"}
              description={
                hasSearched
                  ? "Essayez avec d'autres termes ou filtres"
                  : "Recherchez par nom, spécialité ou ville"
              }
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
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bg,
    marginHorizontal: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  filterPillTextActive: { color: colors.white },
  countBadge: {
    backgroundColor: colors.red,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  countBadgeText: { fontSize: 10, fontWeight: "700", color: colors.white },
  resetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resetText: { fontSize: 13, color: colors.slate500 },
  filterPanel: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  filterLabel: { fontSize: 12, fontWeight: "700", color: colors.slate500, marginBottom: spacing.xs, textTransform: "uppercase", letterSpacing: 0.5 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextActive: { color: colors.white, fontWeight: "600" },
});
