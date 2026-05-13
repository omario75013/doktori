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
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
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
  { label: "Ariana", value: "ariana" },
  { label: "Manouba", value: "manouba" },
  { label: "Ben Arous", value: "ben-arous" },
  { label: "La Marsa", value: "la-marsa" },
  { label: "Carthage", value: "carthage" },
  { label: "Gammarth", value: "gammarth" },
  { label: "Sfax", value: "sfax" },
  { label: "Sousse", value: "sousse" },
  { label: "Nabeul", value: "nabeul" },
  { label: "Monastir", value: "monastir" },
  { label: "Bizerte", value: "bizerte" },
  { label: "Gabès", value: "gabes" },
  { label: "Kairouan", value: "kairouan" },
  { label: "Béja", value: "beja" },
  { label: "Gafsa", value: "gafsa" },
  { label: "Kasserine", value: "kasserine" },
  { label: "Sidi Bouzid", value: "sidi-bouzid" },
  { label: "Mahdia", value: "mahdia" },
  { label: "Médenine", value: "medenine" },
  { label: "Tataouine", value: "tataouine" },
  { label: "Tozeur", value: "tozeur" },
  { label: "Kebili", value: "kebili" },
  { label: "Siliana", value: "siliana" },
  { label: "Le Kef", value: "le-kef" },
  { label: "Jendouba", value: "jendouba" },
  { label: "Zaghouan", value: "zaghouan" },
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

// ---------- Leaflet (OpenStreetMap) HTML builder ----------
type MarkerData = { id: string; slug: string; name: string; specialty: string; city: string; lat: number; lng: number };

function buildLeafletHtml(
  center: LatLng,
  zoom: number,
  markers: MarkerData[],
  userLoc: LatLng | null,
  viewProfileLabel: string
): string {
  const safe = (s: string) =>
    String(s ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const markersJs = markers
    .map(
      (m) =>
        `addMarker(${m.lat},${m.lng},'${safe(m.id)}','${safe(m.slug)}','${safe(m.name)}','${safe(m.specialty)}','${safe(m.city)}');`
    )
    .join("\n");
  const userJs = userLoc
    ? `L.circleMarker([${userLoc.lat},${userLoc.lng}],{radius:7,color:'#0891B2',fillColor:'#0891B2',fillOpacity:0.6,weight:2}).addTo(map);`
    : "";
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#eee;}
  .leaflet-popup-content{margin:8px 10px;font-family:-apple-system,Roboto,sans-serif;}
  .pop-name{font-size:14px;font-weight:700;color:#111;}
  .pop-meta{font-size:12px;color:#666;margin-top:2px;}
  .pop-link{display:inline-block;margin-top:6px;font-size:12px;font-weight:700;color:#0891B2;text-decoration:none;}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map',{zoomControl:true,attributionControl:true}).setView([${center.lat},${center.lng}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  function post(obj){try{window.ReactNativeWebView.postMessage(JSON.stringify(obj));}catch(e){}}
  function addMarker(lat,lng,id,slug,name,specialty,city){
    var m = L.marker([lat,lng]).addTo(map);
    var html = '<div class="pop-name">'+name+'</div>'+
      '<div class="pop-meta">'+specialty+(city?' &middot; '+city:'')+'</div>'+
      '<a class="pop-link" href="#" onclick="post({type:\\'marker\\',slug:\\''+slug+'\\'});return false;">${safe(viewProfileLabel)}</a>';
    m.bindPopup(html);
  }
  ${userJs}
  ${markersJs}
  window.__recenter = function(lat,lng,z){ map.setView([lat,lng], z || 13, {animate:true}); };
  document.addEventListener('message', function(ev){
    try{ var d = JSON.parse(ev.data); if(d && d.type==='recenter') window.__recenter(d.lat,d.lng,d.zoom); }catch(e){}
  });
  window.addEventListener('message', function(ev){
    try{ var d = JSON.parse(ev.data); if(d && d.type==='recenter') window.__recenter(d.lat,d.lng,d.zoom); }catch(e){}
  });
</script>
</body></html>`;
}

// ---------- DropdownPicker ----------
type Item = { value: string; label: string };

function DropdownPicker({
  label,
  value,
  items,
  placeholder,
  onChange,
  searchable,
}: {
  label: string;
  value: string | null;
  items: Item[];
  placeholder: string;
  onChange: (v: string | null) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = useMemo(() => items.find((i) => i.value === value) ?? null, [items, value]);
  const filtered = useMemo(() => {
    if (!searchable || !q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(needle));
  }, [items, q, searchable]);

  const close = () => {
    setOpen(false);
    setQ("");
  };

  return (
    <>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.ddButton}
      >
        <Text
          style={[
            styles.ddButtonText,
            !selected && styles.ddButtonPlaceholder,
          ]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.foregroundSecondary} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={close}
      >
        <View style={styles.ddBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={close} />
          <SafeAreaView style={styles.ddSheet} edges={["bottom"]}>
            <View style={styles.ddSheetHeader}>
              <Text style={styles.ddSheetTitle}>{placeholder}</Text>
              <Pressable onPress={close} hitSlop={10} style={styles.ddCloseBtn}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            {searchable && (
              <View style={styles.ddSearchBox}>
                <Ionicons name="search-outline" size={16} color={colors.foregroundSecondary} />
                <TextInput
                  style={styles.ddSearchInput}
                  placeholder={t("patient.recherche.searchInList")}
                  placeholderTextColor={colors.foregroundSecondary}
                  value={q}
                  onChangeText={setQ}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {q.length > 0 && (
                  <Pressable onPress={() => setQ("")} hitSlop={10}>
                    <Ionicons name="close-circle" size={16} color={colors.foregroundSecondary} />
                  </Pressable>
                )}
              </View>
            )}

            {/* Clear / None row */}
            <Pressable
              style={styles.ddItem}
              onPress={() => {
                onChange(null);
                close();
              }}
            >
              <Text style={[styles.ddItemText, styles.ddNoneText]}>
                {t("patient.recherche.none")}
              </Text>
              {value === null && (
                <Ionicons name="checkmark" size={18} color={colors.teal} />
              )}
            </Pressable>

            <FlatList
              data={filtered}
              keyExtractor={(it) => it.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={styles.ddItem}
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                  >
                    <Text
                      style={[
                        styles.ddItemText,
                        active && styles.ddItemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark" size={18} color={colors.teal} />
                    )}
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
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

  const mapRef = useRef<WebView | null>(null);

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

  const mapCenter = useMemo<LatLng>(
    () => userLocation ?? TUNIS_DEFAULT,
    [userLocation]
  );
  const mapZoom = userLocation ? 12 : 7;

  const mapMarkers = useMemo<MarkerData[]>(() => {
    return displayedResults
      .filter((r) => r.coords)
      .map(({ doc, coords }) => ({
        id: doc.id,
        slug: doc.slug,
        name: doc.name,
        specialty: doc.specialty || "",
        city: doc.city || "",
        lat: coords!.lat,
        lng: coords!.lng,
      }));
  }, [displayedResults]);

  // Rebuild HTML only when marker set or user location changes (avoids reload churn).
  const leafletHtml = useMemo(
    () =>
      buildLeafletHtml(
        mapCenter,
        mapZoom,
        mapMarkers,
        userLocation,
        t("patient.recherche.viewProfile")
      ),
    [mapCenter, mapZoom, mapMarkers, userLocation]
  );

  const recenter = useCallback(() => {
    if (!mapRef.current) return;
    const target = userLocation ?? TUNIS_DEFAULT;
    const msg = JSON.stringify({
      type: "recenter",
      lat: target.lat,
      lng: target.lng,
      zoom: 13,
    });
    mapRef.current.injectJavaScript(
      `try{window.__recenter(${target.lat},${target.lng},13);}catch(e){};true;`
    );
    // also dispatch a message for completeness
    void msg;
  }, [userLocation]);

  const onMapMessage = useCallback((ev: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(ev.nativeEvent.data) as { type?: string; slug?: string };
      if (data?.type === "marker" && data.slug) {
        router.push({
          pathname: "/(patient)/doctor/[slug]" as never,
          params: { slug: data.slug },
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // ---------- map render ----------
  function renderMap() {
    return (
      <View style={styles.mapContainer}>
        <WebView
          ref={(r) => {
            mapRef.current = r;
          }}
          style={StyleSheet.absoluteFillObject}
          originWhitelist={["*"]}
          source={{ html: leafletHtml }}
          javaScriptEnabled
          domStorageEnabled
          onMessage={onMapMessage}
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
          allowsInlineMediaPlayback
        />

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
          {/* Specialty dropdown */}
          <DropdownPicker
            label={t("patient.recherche.specialty")}
            value={specialty}
            items={SPECIALTIES}
            placeholder={t("patient.recherche.selectSpecialty")}
            onChange={setSpecialty}
            searchable
          />

          {/* City dropdown */}
          <DropdownPicker
            label={t("patient.recherche.city")}
            value={city}
            items={CITIES}
            placeholder={t("patient.recherche.selectCity")}
            onChange={setCity}
            searchable
          />

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
  ddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  ddButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  ddButtonPlaceholder: {
    fontWeight: "500",
    color: colors.foregroundSecondary,
  },
  ddBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  ddSheet: {
    maxHeight: "75%",
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.md,
  },
  ddSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  ddSheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  ddCloseBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  ddSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
  },
  ddSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    padding: 0,
  },
  ddItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ddItemText: {
    fontSize: 15,
    color: colors.foreground,
  },
  ddItemTextActive: {
    color: colors.teal,
    fontWeight: "700",
  },
  ddNoneText: {
    color: colors.foregroundSecondary,
    fontStyle: "italic",
  },
});
