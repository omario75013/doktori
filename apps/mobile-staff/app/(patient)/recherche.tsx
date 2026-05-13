import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Switch,
  BackHandler,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";

// ---------- types ----------
type Doctor = {
  id: string;
  name: string;
  specialty: string;
  city: string;
  slug: string;
  photoUrl: string | null;
  consultationFee?: number | null;
  averageRating?: number;
  acceptsCnam?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  _geo?: { lat: number; lng: number } | null;
};

type SearchResponse = {
  hits: Doctor[];
  totalCount?: number;
};

type LatLng = { lat: number; lng: number };

// ---------- static filter options ----------
const SPECIALTIES: { label: string; value: string }[] = [
  { label: "Généraliste", value: "generaliste" },
  { label: "Cardiologue", value: "cardiologue" },
  { label: "Pédiatre", value: "pediatre" },
  { label: "Dermatologue", value: "dermatologue" },
  { label: "Dentiste", value: "dentiste" },
  { label: "Gynécologue", value: "gynecologue" },
  { label: "Ophtalmologue", value: "ophtalmologue" },
  { label: "ORL", value: "orl" },
  { label: "Psychiatre", value: "psychiatre" },
  { label: "Kinésithérapeute", value: "kinesitherapeute" },
];

const CITIES: { label: string; value: string }[] = [
  { label: "Tunis", value: "tunis" },
  { label: "Sfax", value: "sfax" },
  { label: "Sousse", value: "sousse" },
  { label: "Ariana", value: "ariana" },
  { label: "Nabeul", value: "nabeul" },
  { label: "Monastir", value: "monastir" },
  { label: "Bizerte", value: "bizerte" },
  { label: "Gabès", value: "gabes" },
];

// City centroids (fallback when doctor has no lat/lng)
const CITY_CENTROIDS: Record<string, LatLng> = {
  tunis: { lat: 36.8065, lng: 10.1815 },
  ariana: { lat: 36.862, lng: 10.196 },
  sfax: { lat: 34.7406, lng: 10.7603 },
  sousse: { lat: 35.8256, lng: 10.6369 },
  nabeul: { lat: 36.4561, lng: 10.7376 },
  monastir: { lat: 35.7643, lng: 10.8113 },
  bizerte: { lat: 37.2744, lng: 9.8739 },
  gabes: { lat: 33.8815, lng: 10.0982 },
  "la-marsa": { lat: 36.878, lng: 10.3246 },
  "lac-1": { lat: 36.8395, lng: 10.238 },
  "lac-2": { lat: 36.846, lng: 10.2423 },
  "la-soukra": { lat: 36.887, lng: 10.255 },
  raoued: { lat: 36.9, lng: 10.22 },
  manouba: { lat: 36.81, lng: 10.1 },
};

const TUNIS_DEFAULT: LatLng = { lat: 36.8065, lng: 10.1815 };

// Tunisia consultation fee buckets (millimes)
const FEE_BUCKETS: { value: "low" | "mid" | "high"; min: number; max: number | null }[] = [
  { value: "low", min: 0, max: 50_000 },
  { value: "mid", min: 50_000, max: 100_000 },
  { value: "high", min: 100_000, max: null },
];

type ViewMode = "list" | "map";
type FeeBucket = "low" | "mid" | "high" | null;

// ---------- helpers ----------
function initialsOf(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "?";
  return parts.map((p) => p[0]!.toUpperCase()).join("");
}

function formatFee(millimes: number | null | undefined): string {
  if (millimes == null || isNaN(millimes)) return "—";
  return `${(millimes / 1000).toFixed(0)} DT`;
}

function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getDoctorCoords(doc: Doctor): LatLng | null {
  if (typeof doc.latitude === "number" && typeof doc.longitude === "number") {
    return { lat: doc.latitude, lng: doc.longitude };
  }
  if (doc._geo && typeof doc._geo.lat === "number" && typeof doc._geo.lng === "number") {
    return { lat: doc._geo.lat, lng: doc._geo.lng };
  }
  const key = (doc.city || "").toLowerCase().trim();
  if (key && CITY_CENTROIDS[key]) return CITY_CENTROIDS[key]!;
  return null;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} ${t("patient.recherche.km")}`;
  return `${Math.round(km)} ${t("patient.recherche.km")}`;
}

// ---------- lazy map module (graceful fallback in Expo Go) ----------
let MapsModule: typeof import("react-native-maps") | null | undefined = undefined;
function loadMaps(): typeof import("react-native-maps") | null {
  if (MapsModule !== undefined) return MapsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    MapsModule = require("react-native-maps");
    return MapsModule as typeof import("react-native-maps");
  } catch {
    MapsModule = null;
    return null;
  }
}

// ---------- screen ----------
export default function PatientRecherche() {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [feeBucket, setFeeBucket] = useState<FeeBucket>(null);
  const [acceptsCnam, setAcceptsCnam] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [results, setResults] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const mapRef = useRef<unknown>(null);

  // Detect location on mount
  useEffect(() => {
    (async () => {
      try {
        const Location = await import("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationDenied(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      } catch {
        setLocationDenied(true);
      }
    })();
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (specialty) params.set("specialty", specialty);
      if (city) params.set("city", city);
      if (feeBucket) {
        const b = FEE_BUCKETS.find((x) => x.value === feeBucket);
        if (b) {
          params.set("priceMin", String(b.min));
          if (b.max != null) params.set("priceMax", String(b.max));
        }
      }
      if (userLocation && sortByDistance) {
        params.set("lat", String(userLocation.lat));
        params.set("lng", String(userLocation.lng));
      }
      const data = await api<SearchResponse>(`/api/search?${params.toString()}`, {
        skipAuth: true,
      });
      let hits = data.hits ?? [];
      if (acceptsCnam) hits = hits.filter((d) => d.acceptsCnam === true);
      setResults(hits);
    } catch {
      setError(t("patient.recherche.error"));
      setResults([]);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }, [query, specialty, city, feeBucket, acceptsCnam, sortByDistance, userLocation]);

  // Debounce search on filter change
  useEffect(() => {
    const handle = setTimeout(() => {
      search();
    }, 350);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/(patient)/plus-menu" as never);
      return true;
    });
    return () => sub.remove();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await search();
    setRefreshing(false);
  }, [search]);

  const filtersActive = useMemo(
    () => !!(query || specialty || city || feeBucket || acceptsCnam || sortByDistance),
    [query, specialty, city, feeBucket, acceptsCnam, sortByDistance]
  );

  const clearFilters = () => {
    setQuery("");
    setSpecialty(null);
    setCity(null);
    setFeeBucket(null);
    setAcceptsCnam(false);
    setSortByDistance(false);
  };

  // Enrich + (optionally) sort by distance client-side
  const displayedResults = useMemo(() => {
    const enriched = results.map((d) => {
      const coords = getDoctorCoords(d);
      const dist = userLocation && coords ? distanceKm(userLocation, coords) : null;
      return { doc: d, coords, dist };
    });
    if (sortByDistance && userLocation) {
      enriched.sort((a, b) => {
        if (a.dist == null && b.dist == null) return 0;
        if (a.dist == null) return 1;
        if (b.dist == null) return -1;
        return a.dist - b.dist;
      });
    }
    return enriched;
  }, [results, userLocation, sortByDistance]);

  const initialRegion = useMemo(() => {
    const center = userLocation ?? TUNIS_DEFAULT;
    return {
      latitude: center.lat,
      longitude: center.lng,
      latitudeDelta: userLocation ? 0.15 : 0.5,
      longitudeDelta: userLocation ? 0.15 : 0.5,
    };
  }, [userLocation]);

  const recenter = useCallback(() => {
    const Maps = loadMaps();
    if (!Maps || !mapRef.current) return;
    const target = userLocation ?? TUNIS_DEFAULT;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = mapRef.current;
    if (typeof m.animateToRegion === "function") {
      m.animateToRegion(
        {
          latitude: target.lat,
          longitude: target.lng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        },
        500
      );
    }
  }, [userLocation]);

  // ---------- map render ----------
  function renderMap() {
    const Maps = loadMaps();
    if (!Maps) {
      return (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>{t("patient.recherche.mapUnavailable")}</Text>
        </View>
      );
    }
    const MapView = Maps.default;
    const Marker = Maps.Marker;
    const Callout = Maps.Callout;
    const PROVIDER_GOOGLE =
      Platform.OS === "android" ? Maps.PROVIDER_GOOGLE : undefined;

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={(r: unknown) => {
            mapRef.current = r;
          }}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation={!!userLocation}
          showsMyLocationButton={false}
        >
          {displayedResults.map(({ doc, coords }) => {
            if (!coords) return null;
            return (
              <Marker
                key={doc.id}
                coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                pinColor={colors.teal}
              >
                <Callout
                  onPress={() =>
                    router.push({
                      pathname: "/(patient)/doctor/[slug]" as never,
                      params: { slug: doc.slug },
                    })
                  }
                >
                  <View style={styles.callout}>
                    <Text style={styles.calloutName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={styles.calloutMeta} numberOfLines={1}>
                      {doc.specialty}
                      {doc.city ? ` · ${doc.city}` : ""}
                    </Text>
                    <Text style={styles.calloutLink}>
                      {t("patient.recherche.viewProfile")}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        <Pressable style={styles.recenterBtn} onPress={recenter} hitSlop={6}>
          <Ionicons name="locate" size={20} color={colors.teal} />
        </Pressable>

        {locationDenied && (
          <View style={styles.locDeniedBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={14}
              color={colors.foregroundSecondary}
            />
            <Text style={styles.locDeniedText}>
              {t("patient.recherche.permissionDenied")}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(patient)/plus-menu" as never)} hitSlop={10} style={styles.headerBtn}>
          <Ionicons
            name={isAr ? "chevron-forward" : "chevron-back"}
            size={24}
            color={colors.foreground}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{t("patient.recherche.title")}</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Search box */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.foregroundSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("patient.recherche.placeholder")}
          placeholderTextColor={colors.foregroundSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => search()}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.foregroundSecondary} />
          </Pressable>
        )}
      </View>

      {/* View toggle: List / Map */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, viewMode === "list" && styles.toggleActive]}
          onPress={() => setViewMode("list")}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={viewMode === "list" ? "#fff" : colors.foregroundSecondary}
          />
          <Text
            style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}
          >
            {t("patient.recherche.viewList")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewMode === "map" && styles.toggleActive]}
          onPress={() => setViewMode("map")}
        >
          <Ionicons
            name="map-outline"
            size={16}
            color={viewMode === "map" ? "#fff" : colors.foregroundSecondary}
          />
          <Text
            style={[styles.toggleText, viewMode === "map" && styles.toggleTextActive]}
          >
            {t("patient.recherche.viewMap")}
          </Text>
        </Pressable>
        {filtersActive && (
          <Pressable onPress={clearFilters} style={styles.clearBtn} hitSlop={6}>
            <Text style={styles.clearText}>{t("patient.recherche.clear")}</Text>
          </Pressable>
        )}
      </View>

      {viewMode === "map" ? (
        // Map mode: render full-bleed map below toggle, no scroll
        <View style={{ flex: 1, marginTop: spacing.md }}>{renderMap()}</View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.teal}
            />
          }
        >
          {/* Specialty chips */}
          <Text style={styles.filterLabel}>{t("patient.recherche.specialty")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            {SPECIALTIES.map((s) => {
              const active = specialty === s.value;
              return (
                <Pressable
                  key={s.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSpecialty(active ? null : s.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* City chips */}
          <Text style={styles.filterLabel}>{t("patient.recherche.city")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            {CITIES.map((c) => {
              const active = city === c.value;
              return (
                <Pressable
                  key={c.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCity(active ? null : c.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Fee chips */}
          <Text style={styles.filterLabel}>{t("patient.recherche.fee")}</Text>
          <View style={styles.feeRow}>
            {FEE_BUCKETS.map((b) => {
              const active = feeBucket === b.value;
              return (
                <Pressable
                  key={b.value}
                  style={[styles.feeChip, active && styles.chipActive]}
                  onPress={() => setFeeBucket(active ? null : b.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(`patient.recherche.fee_${b.value}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* CNAM toggle */}
          <View style={styles.cnamRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cnamLabel}>{t("patient.recherche.cnamLabel")}</Text>
              <Text style={styles.cnamHint}>{t("patient.recherche.cnamHint")}</Text>
            </View>
            <Switch
              value={acceptsCnam}
              onValueChange={setAcceptsCnam}
              trackColor={{ false: colors.border, true: colors.teal }}
              thumbColor="#fff"
            />
          </View>

          {/* Sort by distance chip (only if location available) */}
          {userLocation && (
            <Pressable
              onPress={() => setSortByDistance((v) => !v)}
              style={[
                styles.sortChip,
                sortByDistance && styles.sortChipActive,
              ]}
            >
              <Ionicons
                name="navigate-outline"
                size={14}
                color={sortByDistance ? "#fff" : colors.foregroundSecondary}
              />
              <Text
                style={[
                  styles.chipText,
                  sortByDistance && styles.chipTextActive,
                ]}
              >
                {t("patient.recherche.sortByDistance")}
              </Text>
            </Pressable>
          )}

          {locationDenied && (
            <Text style={styles.locHint}>
              {t("patient.recherche.permissionDenied")}
            </Text>
          )}

          {/* Results */}
          <Text style={styles.resultsHeader}>
            {loading
              ? t("patient.recherche.searching")
              : t("patient.recherche.resultsCount").replace(
                  "{count}",
                  String(displayedResults.length)
                )}
          </Text>

          {loading && !refreshing && (
            <ActivityIndicator
              color={colors.teal}
              style={{ marginVertical: spacing.lg }}
            />
          )}

          {!loading && error && (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={40} color={colors.border} />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          )}

          {!loading && !error && displayedResults.length === 0 && hasSearched && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.border} />
              <Text style={styles.emptyText}>{t("patient.recherche.empty")}</Text>
              <Text style={styles.emptySubText}>
                {t("patient.recherche.emptyHint")}
              </Text>
            </View>
          )}

          {!loading &&
            displayedResults.map(({ doc, dist }) => (
              <Pressable
                key={doc.id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/(patient)/doctor/[slug]" as never,
                    params: { slug: doc.slug },
                  })
                }
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initialsOf(doc.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text style={styles.docMeta} numberOfLines={1}>
                    {doc.specialty}
                    {doc.city ? ` · 📍 ${doc.city}` : ""}
                    {dist != null ? ` · ${formatDistance(dist)}` : ""}
                  </Text>
                  <View style={styles.chipsLine}>
                    {typeof doc.averageRating === "number" && doc.averageRating > 0 && (
                      <View style={styles.miniChip}>
                        <Ionicons name="star" size={11} color={colors.teal} />
                        <Text style={styles.miniChipText}>
                          {doc.averageRating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    {doc.consultationFee != null && (
                      <View style={styles.miniChip}>
                        <Ionicons
                          name="cash-outline"
                          size={11}
                          color={colors.foregroundSecondary}
                        />
                        <Text style={styles.miniChipText}>
                          {formatFee(doc.consultationFee)}
                        </Text>
                      </View>
                    )}
                    {doc.acceptsCnam && (
                      <View
                        style={[styles.miniChip, { backgroundColor: colors.bgSecondary }]}
                      >
                        <Text style={[styles.miniChipText, { color: colors.teal }]}>
                          CNAM
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons
                  name={isAr ? "chevron-back" : "chevron-forward"}
                  size={18}
                  color={colors.foregroundSecondary}
                />
              </Pressable>
            ))}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  toggleActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  toggleText: { fontSize: 13, fontWeight: "600", color: colors.foregroundSecondary },
  toggleTextActive: { color: "#fff" },
  clearBtn: { marginLeft: "auto", paddingHorizontal: spacing.sm },
  clearText: { fontSize: 13, color: colors.teal, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipsScroll: { marginBottom: spacing.sm },
  chipsRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
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
  chipTextActive: { color: "#fff" },
  feeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  feeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  cnamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
  },
  cnamLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  cnamHint: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  sortChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  sortChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  locHint: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  resultsHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foregroundSecondary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  docName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  docMeta: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  chipsLine: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  miniChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  miniChipText: { fontSize: 11, fontWeight: "600", color: colors.foregroundSecondary },
  mapContainer: { flex: 1, position: "relative" },
  mapPlaceholder: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.xl * 2,
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
  },
  recenterBtn: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  locDeniedBanner: {
    position: "absolute",
    top: spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  locDeniedText: { fontSize: 12, color: colors.foregroundSecondary },
  callout: { minWidth: 180, maxWidth: 240, padding: 4 },
  calloutName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  calloutMeta: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  calloutLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal,
    marginTop: 6,
  },
  emptyState: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  emptySubText: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center" },
});
