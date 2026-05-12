"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { DoctorCard } from "@/components/doctor-card";
import { DoctorMap } from "@/components/doctor-map-wrapper";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import {
  Search,
  MapPin,
  Stethoscope,
  Loader2,
  SearchX,
  Calendar,
  X,
  Info,
  Navigation,
  Crosshair,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  DollarSign,
  Clock,
  ChevronDown,
  Video,
  Building2,
  ArrowRight,
  Map,
  List,
} from "lucide-react";

interface Doctor {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  city: string;
  address: string;
  consultationFee: number | null;
  photoUrl: string | null;
  _geoDistance?: number; // meters from user, added by Meili when sorting by geo
  _geo?: { lat: number; lng: number }; // Meilisearch geo coordinates
  consultation_mode?: string; // 'cabinet' | 'teleconsult' | 'both'
}

interface ClinicResult {
  id: string;
  name: string;
  slug: string;
  city: string;
  cityLabel: string;
  address: string;
  logoUrl?: string | null;
}

interface SearchResponse {
  hits: Doctor[];
  clinics?: ClinicResult[];
  totalCount: number;
  parsed: { specialty: string | null; city: string | null; text: string };
  expanded?: boolean;
  facets?: {
    specialty: Record<string, number>;
    city: Record<string, number>;
  };
  activeFilters: {
    specialty: string | null;
    city: string | null;
    date: string | null;
    priceMin: number | null;
    priceMax: number | null;
    availability: string | null;
    sort: string;
    location: { lat: number; lng: number } | null;
  };
}

type SortKey = "relevance" | "proximity" | "price_asc" | "price_desc" | "name";
type Availability = "" | "today" | "tomorrow" | "week";

function formatDateLocale(date: Date, locale: string): string {
  const bcp = locale === "ar" ? "ar-TN" : "fr-FR";
  return date.toLocaleDateString(bcp, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getLabel(item: { label: string; labelAr?: string }, locale: string): string {
  return locale === "ar" && item.labelAr ? item.labelAr : item.label;
}

function RechercheInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("search");
  const locale = useLocale();

  // Core query
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [specialty, setSpecialty] = useState(() => searchParams.get("specialty") || "");
  const [city, setCity] = useState(() => searchParams.get("city") || "");
  const [date, setDate] = useState(() => searchParams.get("date") || "");

  // Teleconsult filter
  const [modeFilter, setModeFilter] = useState(() => searchParams.get("mode") || "");

  // Enriched filters
  const [priceMin, setPriceMin] = useState(() => searchParams.get("priceMin") || "");
  const [priceMax, setPriceMax] = useState(() => searchParams.get("priceMax") || "");
  const [availability, setAvailability] = useState<Availability>(
    () => (searchParams.get("availability") || "") as Availability
  );
  const [sort, setSort] = useState<SortKey>(
    () => (searchParams.get("sort") as SortKey) || "relevance"
  );

  // Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<
    Array<{ query: string; specialty: string; city: string; timestamp: number }>
  >([]);

  // Comparator selection (max 3 doctors)
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("doktori_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  function saveRecentSearch(q: string, spec: string, ct: string) {
    if (!q && !spec && !ct) return;
    try {
      const stored = localStorage.getItem("doktori_recent_searches");
      const recent: Array<{ query: string; specialty: string; city: string; timestamp: number }> =
        stored ? JSON.parse(stored) : [];
      recent.unshift({ query: q, specialty: spec, city: ct, timestamp: Date.now() });
      const deduped = recent.filter(
        (item, idx, arr) =>
          arr.findIndex(
            (x) => x.query === item.query && x.specialty === item.specialty && x.city === item.city
          ) === idx
      );
      const trimmed = deduped.slice(0, 5);
      localStorage.setItem("doktori_recent_searches", JSON.stringify(trimmed));
      setRecentSearches(trimmed);
    } catch {
      // ignore storage errors
    }
  }

  function applyRecentSearch(item: { query: string; specialty: string; city: string }) {
    setQuery(item.query);
    setSpecialty(item.specialty);
    setCity(item.city);
  }

  // Results
  const [results, setResults] = useState<Doctor[]>([]);
  const [clinicResults, setClinicResults] = useState<ClinicResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [parsed, setParsed] = useState<{ specialty: string | null; city: string | null; text: string }>({
    specialty: null,
    city: null,
    text: "",
  });
  const [expanded, setExpanded] = useState(false);
  const [facets, setFacets] = useState<{
    specialty: Record<string, number>;
    city: Record<string, number>;
  }>({ specialty: {}, city: {} });

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchResults = useCallback(
    async (
      q: string,
      spec: string,
      ct: string,
      dt: string,
      pMin: string,
      pMax: string,
      avail: string,
      sortKey: SortKey,
      loc: { lat: number; lng: number } | null,
      mode: string
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (spec) params.set("specialty", spec);
        if (ct) params.set("city", ct);
        if (dt) params.set("date", dt);
        if (pMin) params.set("priceMin", pMin);
        if (pMax) params.set("priceMax", pMax);
        if (avail) params.set("availability", avail);
        if (sortKey && sortKey !== "relevance") params.set("sort", sortKey);
        if (loc) {
          params.set("lat", String(loc.lat));
          params.set("lng", String(loc.lng));
        }
        if (mode) params.set("mode", mode);

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error("Erreur");
        const data: SearchResponse = await res.json();
        // Normalize latitude/longitude (string from DB) → _geo {lat,lng} for map markers
        const hits = (data.hits || []).map((d) => {
          if (d._geo) return d;
          const lat = typeof (d as any).latitude === "string" ? parseFloat((d as any).latitude) : (d as any).latitude;
          const lng = typeof (d as any).longitude === "string" ? parseFloat((d as any).longitude) : (d as any).longitude;
          if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
            return { ...d, _geo: { lat, lng } };
          }
          return d;
        });
        setResults(hits);
        setPage(1);
        setClinicResults(data.clinics || []);
        setTotalCount(data.totalCount);
        setParsed(data.parsed);
        setExpanded(data.expanded || false);
        setFacets(data.facets || { specialty: {}, city: {} });
        // Persist to recent searches
        if (q || spec || ct) {
          saveRecentSearch(q, spec, ct);
        }
      } catch {
        setResults([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    },
    []
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query, specialty, city, date, priceMin, priceMax, availability, sort, userLocation, modeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, specialty, city, date, priceMin, priceMax, availability, sort, userLocation, modeFilter, fetchResults]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (specialty) params.set("specialty", specialty);
    if (city) params.set("city", city);
    if (date) params.set("date", date);
    if (priceMin) params.set("priceMin", priceMin);
    if (priceMax) params.set("priceMax", priceMax);
    if (availability) params.set("availability", availability);
    if (sort && sort !== "relevance") params.set("sort", sort);
    if (modeFilter) params.set("mode", modeFilter);
    const url = `/recherche${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(url, { scroll: false });
  }, [query, specialty, city, date, priceMin, priceMax, availability, sort, modeFilter, router]);

  // Auto-request geolocation when user opens the Carte view
  useEffect(() => {
    if (showMap && !userLocation && !geoLoading && navigator.geolocation) {
      requestGeolocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  // Geolocation
  function requestGeolocation() {
    if (!navigator.geolocation) {
      setGeoError(t("geoUnsupported"));
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    // Use watchPosition to capture the most accurate reading over a short window.
    // Browsers often return a coarse cached fix first, then refine to GPS/Wi-Fi
    // accuracy a few seconds later. We keep the reading with the smallest
    // `coords.accuracy` (in meters) and stop the watch after 10s or once we
    // hit ≤50m accuracy.
    let best: GeolocationPosition | null = null;
    let settled = false;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (settled) return;
        if (!best || pos.coords.accuracy < best.coords.accuracy) {
          best = pos;
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setSort("proximity");
          setGeoLoading(false);
        }
        if (pos.coords.accuracy <= 50) {
          settled = true;
          navigator.geolocation.clearWatch(watchId);
        }
      },
      (err) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        setGeoLoading(false);
        if (!best) {
          setGeoError(err.code === err.PERMISSION_DENIED ? t("geoDenied") : t("geoUnavailable"));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    // Safety stop after 10s — keep best reading we have
    setTimeout(() => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      setGeoLoading(false);
    }, 10000);
  }

  function resetAll() {
    setQuery("");
    setSpecialty("");
    setCity("");
    setDate("");
    setPriceMin("");
    setPriceMax("");
    setAvailability("");
    setSort("relevance");
    setUserLocation(null);
    setModeFilter("");
  }

  // Active filter chips
  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  const parsedSpecialty = specialty || parsed.specialty;
  const parsedCity = city || parsed.city;
  if (parsedSpecialty) {
    activeChips.push({
      key: "spec",
      label: (() => { const s = SPECIALTIES.find((s) => s.id === parsedSpecialty); return s ? getLabel(s, locale) : parsedSpecialty; })(),
      onRemove: () => setSpecialty(""),
    });
  }
  if (parsedCity) {
    activeChips.push({
      key: "city",
      label: CITIES.find((c) => c.id === parsedCity)?.label || parsedCity,
      onRemove: () => setCity(""),
    });
  }
  if (date) {
    activeChips.push({
      key: "date",
      label: formatDateLocale(new Date(date), locale),
      onRemove: () => setDate(""),
    });
  }
  if (priceMin || priceMax) {
    const label = t("chipPriceRange", { min: priceMin || "0", max: priceMax || t("chipPriceInfinity") });
    activeChips.push({
      key: "price",
      label,
      onRemove: () => {
        setPriceMin("");
        setPriceMax("");
      },
    });
  }
  if (availability) {
    const labels: Record<string, string> = {
      today: t("availabilityToday"),
      tomorrow: t("availabilityTomorrow"),
      week: t("availabilityWeek"),
    };
    activeChips.push({
      key: "avail",
      label: labels[availability] || availability,
      onRemove: () => setAvailability(""),
    });
  }
  if (userLocation) {
    activeChips.push({
      key: "geo",
      label: t("chipNearMe"),
      onRemove: () => setUserLocation(null),
    });
  }
  if (modeFilter === "teleconsult") {
    activeChips.push({
      key: "mode",
      label: t("videoMode"),
      onRemove: () => setModeFilter(""),
    });
  }

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: toISODate(d),
      label: formatDateLocale(d, locale),
      isToday: i === 0,
      isTomorrow: i === 1,
    };
  });

  const filterCount = activeChips.length;

  return (
    <div>
      {/* ═══════════════ PAGE HEADER (cyan redesign) ═══════════════ */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="ds-eyebrow">{t("eyebrow")}</div>
          <h1 className="ds-page-title">{t("pageTitle")}</h1>
          {totalCount > 0 ? (
            <p className="ds-page-sub">
              <strong style={{ color: "var(--ink-900)" }}>{t("totalCount", { count: totalCount })}</strong>
              {" · "}
              {t("sortedByRelevance")}
            </p>
          ) : (
            <p className="ds-page-sub">{t("subtitle")}</p>
          )}
        </div>
      </div>

      {/* ═══════════════ SEARCH BAR (cyan redesign — segmented spec | city) ═══════════════ */}
      <div className="ds-card-patient mb-5" style={{ padding: 10 }}>
        <div className="flex items-center gap-2">
          {/* Specialty / query segment */}
          <label
            className="flex flex-1 items-center gap-2.5 px-3.5 h-[46px] rounded-xl border"
            style={{ background: "var(--surface-2)", borderColor: "var(--line-cool)" }}
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: "var(--ink-500)" }} strokeWidth={2} />
            <input
              type="text"
              placeholder={t("inputPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full flex-1 min-w-0 border-0 bg-transparent text-[14px] font-semibold outline-none"
              style={{ color: "var(--ink-900)" }}
            />
            {parsed.specialty && (
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
                style={{ background: "var(--primary-50)", color: "var(--primary-700)" }}
              >
                Spécialité
              </span>
            )}
            {loading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--primary-500)" }} />}
          </label>

          {/* Divider */}
          <div className="hidden md:block" style={{ width: 1, height: 32, background: "var(--line-cool)" }} />

          {/* City segment */}
          <label
            className="hidden md:flex flex-1 items-center gap-2.5 px-3.5 h-[46px] rounded-xl border"
            style={{ background: "var(--surface-2)", borderColor: "var(--line-cool)" }}
          >
            <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--ink-500)" }} strokeWidth={2} />
            <input
              type="text"
              placeholder="Ville, quartier"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-full flex-1 min-w-0 border-0 bg-transparent text-[14px] font-semibold outline-none"
              style={{ color: "var(--ink-900)" }}
            />
            <span className="text-[12px] whitespace-nowrap" style={{ color: "var(--ink-400)" }}>
              · rayon 10 km
            </span>
          </label>

          {/* Submit */}
          <button
            type="button"
            className="ds-btn ds-btn-primary shrink-0"
            onClick={() =>
              fetchResults(
                query,
                specialty,
                city,
                date,
                priceMin,
                priceMax,
                availability,
                sort,
                userLocation,
                modeFilter,
              )
            }
          >
            <Search className="w-4 h-4" /> Rechercher
          </button>

          {/* Mobile filter toggle (kept for narrow viewports) */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="ds-btn ds-btn-ghost lg:hidden"
            aria-label={t("filtersAriaLabel")}
            style={{ width: 46, height: 46, padding: 0, borderRadius: 12 }}
          >
            <SlidersHorizontal className="h-5 w-5" strokeWidth={2.2} />
            {filterCount > 0 && (
              <span
                className="ms-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "var(--primary-500)", color: "#fff" }}
              >
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--ink-400)" }}
            >
              {t("activeFiltersLabel")}
            </span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold"
                style={{ background: "var(--primary-500)", color: "#fff" }}
              >
                <span>{chip.label}</span>
                <X className="h-3 w-3" strokeWidth={3} />
              </button>
            ))}
            <button
              onClick={resetAll}
              className="text-[11.5px] font-bold hover:underline"
              style={{ color: "var(--ink-500)" }}
            >
              {t("clearAll")}
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════ MAIN LAYOUT ═══════════════ */}
      <div className="w-full">
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          {/* ═══════════════ SIDEBAR FILTERS ═══════════════ */}
          <aside
            className={
              mobileFiltersOpen
                ? "fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-gray-900 p-4 lg:static lg:z-auto lg:bg-transparent dark:lg:bg-transparent lg:p-0 lg:overflow-visible"
                : "hidden lg:block"
            }
          >
            {mobileFiltersOpen && (
              <div className="mb-4 flex items-center justify-between border-b dark:border-gray-700 pb-3 lg:hidden">
                <h2 className="font-heading text-lg font-bold text-foreground">{t("mobileFiltersTitle")}</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="space-y-5">
              {/* Geolocation */}
              <FilterGroup icon={Crosshair} label={t("locationLabel")}>
                {!userLocation ? (
                  <button
                    onClick={requestGeolocation}
                    disabled={geoLoading}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary bg-white px-3 text-xs font-bold text-primary transition-all hover:bg-secondary disabled:opacity-60"
                  >
                    {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" strokeWidth={2.5} />}
                    {geoLoading ? t("locating") : t("findNearMe")}
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs font-bold text-doktori-green-dark ring-1 ring-accent/30">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="h-4 w-4" strokeWidth={2.5} />
                      {t("positionActive")}
                    </span>
                    <button onClick={() => setUserLocation(null)}>
                      <X className="h-3 w-3" strokeWidth={3} />
                    </button>
                  </div>
                )}
                {geoError && <p className="mt-2 text-xs text-red-600">{geoError}</p>}
              </FilterGroup>

              {/* Availability */}
              <FilterGroup icon={Clock} label={t("availabilityLabel")}>
                <div className="grid gap-1.5">
                  {([
                    { value: "", label: t("availabilityAll") },
                    { value: "today", label: t("availabilityToday") },
                    { value: "tomorrow", label: t("availabilityTomorrow") },
                    { value: "week", label: t("availabilityWeek") },
                  ] as const).map((opt) => (
                    <FilterOption
                      key={opt.value}
                      label={opt.label}
                      selected={availability === opt.value}
                      onClick={() => setAvailability(opt.value as Availability)}
                    />
                  ))}
                </div>
              </FilterGroup>

              {/* Specialty with counts */}
              <FilterGroup icon={Stethoscope} label={t("specialtyLabel")}>
                <div className="max-h-64 space-y-1 overflow-y-auto pe-1">
                  <FilterOption
                    label={t("specialtyAll")}
                    selected={!specialty}
                    onClick={() => setSpecialty("")}
                  />
                  {SPECIALTIES.map((s) => {
                    const count = facets.specialty[s.id] || 0;
                    return (
                      <FilterOption
                        key={s.id}
                        label={getLabel(s, locale)}
                        count={count}
                        selected={specialty === s.id}
                        onClick={() => setSpecialty(s.id === specialty ? "" : s.id)}
                      />
                    );
                  })}
                </div>
              </FilterGroup>

              {/* City with counts */}
              <FilterGroup icon={MapPin} label={t("cityLabel")}>
                <div className="max-h-64 space-y-1 overflow-y-auto pe-1">
                  <FilterOption
                    label={t("cityAll")}
                    selected={!city}
                    onClick={() => setCity("")}
                  />
                  {CITIES.map((c) => {
                    const count = facets.city[c.id] || 0;
                    return (
                      <FilterOption
                        key={c.id}
                        label={getLabel(c, locale)}
                        count={count}
                        selected={city === c.id}
                        onClick={() => setCity(c.id === city ? "" : c.id)}
                      />
                    );
                  })}
                </div>
              </FilterGroup>

              {/* Price range */}
              <FilterGroup icon={DollarSign} label={t("priceLabel")}>
                <div className="grid gap-1.5">
                  {([
                    { min: "", max: "", label: t("priceAll") },
                    { min: "", max: "50", label: t("priceUnder50") },
                    { min: "50", max: "100", label: t("price50to100") },
                    { min: "100", max: "", label: t("priceOver100") },
                  ] as const).map((opt, i) => (
                    <FilterOption
                      key={i}
                      label={opt.label}
                      selected={priceMin === opt.min && priceMax === opt.max}
                      onClick={() => {
                        setPriceMin(opt.min);
                        setPriceMax(opt.max);
                      }}
                    />
                  ))}
                </div>
              </FilterGroup>
            </div>

            {mobileFiltersOpen && (
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-6 h-12 w-full rounded-xl bg-primary font-bold text-white lg:hidden"
              >
                {t("apply", { count: results.length })}
              </button>
            )}
          </aside>

          {/* ═══════════════ RESULTS ═══════════════ */}
          <div className="pt-4">
            {/* Date picker + sort bar */}
            <div className="mb-4 space-y-3">
              {/* Teleconsult + date sections removed in cyan redesign — those
                  filters now live in the sidebar's "Mode de consultation"
                  group + the upper search bar. */}
              {false && (
                <>
                <div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setDate("")}
                    className={`min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                      !date ? "bg-primary text-white shadow-sm" : "bg-white dark:bg-gray-800 text-muted-foreground ring-1 ring-border dark:ring-gray-700"
                    }`}
                  >
                    {t("dateAll")}
                  </button>
                  {dates.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDate(d.value === date ? "" : d.value)}
                      className={`min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                        date === d.value ? "bg-primary text-white shadow-sm" : "bg-white dark:bg-gray-800 text-muted-foreground ring-1 ring-border dark:ring-gray-700"
                      }`}
                    >
                      {d.isToday ? t("availabilityToday") : d.isTomorrow ? t("availabilityTomorrow") : d.label}
                    </button>
                  ))}
                </div>
              </div>
                </>
              )}

              {/* Results count + Liste / Carte toggle + Trier value */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-[13.5px]" style={{ color: "var(--ink-500)" }}>
                  {loading ? (
                    t("searching")
                  ) : (
                    <>
                      <strong style={{ color: "var(--ink-900)" }}>
                        {results.length} {results.length === 1 ? t("resultSingular") : t("resultPlural")}
                      </strong>
                      {totalCount > results.length ? ` ${t("totalSuffix", { total: totalCount })}` : ""}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="ds-tabs" style={{ padding: 3 }}>
                    <button
                      type="button"
                      className={`ds-tab ${!showMap ? "on" : ""}`}
                      style={{ padding: "6px 12px", fontSize: 12.5 }}
                      onClick={() => setShowMap(false)}
                    >
                      <Calendar className="w-3.5 h-3.5" /> Liste
                    </button>
                    <button
                      type="button"
                      className={`ds-tab ${showMap ? "on" : ""}`}
                      style={{ padding: "6px 12px", fontSize: 12.5 }}
                      onClick={() => setShowMap(true)}
                    >
                      <MapPin className="w-3.5 h-3.5" /> Carte
                    </button>
                  </div>
                  <label className="ds-btn ds-btn-ghost ds-btn-sm cursor-pointer relative">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span style={{ color: "var(--ink-700)" }}>
                      {sort === "relevance"
                        ? t("sortRelevance")
                        : sort === "proximity"
                        ? t("sortProximity")
                        : sort === "price_asc"
                        ? t("sortPriceAsc")
                        : sort === "price_desc"
                        ? t("sortPriceDesc")
                        : sort === "name"
                        ? t("sortName")
                        : sort}
                    </span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      aria-label={t("sortLabel")}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    >
                      <option value="relevance">{t("sortRelevance")}</option>
                      {(userLocation || parsedCity) && (
                        <option value="proximity">{t("sortProximity")}</option>
                      )}
                      <option value="price_asc">{t("sortPriceAsc")}</option>
                      <option value="price_desc">{t("sortPriceDesc")}</option>
                      <option value="name">{t("sortName")}</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Mini map preview — real OSM tiles via Leaflet (hidden in Carte view) */}
              {!showMap && (
              <div
                className="ps-map-mini relative rounded-2xl overflow-hidden border mb-3"
                style={{
                  height: 160,
                  borderColor: "var(--line-cool)",
                }}
              >
                <div className="absolute inset-0">
                  {results.length > 0 ? (
                    <DoctorMap doctors={results} userLocation={userLocation} onUserLocationChange={setUserLocation} />
                  ) : (
                    /* Static OSM tile fallback so the area still has a real
                       cartographic background even before any results land. */
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="https://tile.openstreetmap.org/9/271/195.png"
                      srcSet="https://tile.openstreetmap.org/9/271/195.png 1x, https://tile.openstreetmap.org/10/542/391.png 2x"
                      alt=""
                      aria-hidden
                      className="w-full h-full object-cover"
                      style={{ filter: "saturate(0.85)" }}
                    />
                  )}
                </div>
                <div
                  className="absolute top-3.5 left-3.5 px-3 py-1.5 rounded-full font-bold inline-flex items-center gap-2 text-[12px] z-10"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--line-cool)",
                    color: "var(--ink-900)",
                    boxShadow: "var(--shadow-1)",
                  }}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {t("mapResults", { count: totalCount || results.length })}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="absolute top-3.5 right-3.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer z-10"
                  style={{ background: "var(--ink-900)", color: "#fff", border: 0 }}
                >
                  Agrandir la carte
                </button>
              </div>
              )}
            </div>

            {/* Recent searches — shown when search is empty and no results yet */}
            {!searched && !loading && recentSearches.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Recherches récentes
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((item, idx) => {
                    const specLabel = SPECIALTIES.find((s) => s.id === item.specialty)?.label;
                    const cityLabel = CITIES.find((c) => c.id === item.city)?.label;
                    const parts = [item.query, specLabel, cityLabel].filter(Boolean);
                    const label = parts.join(" · ") || "Recherche";
                    return (
                      <button
                        key={idx}
                        onClick={() => applyRecentSearch(item)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:bg-secondary dark:hover:bg-gray-700 transition-all"
                      >
                        <Search className="h-3 w-3 text-muted-foreground" strokeWidth={2.5} />
                        {label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      localStorage.removeItem("doktori_recent_searches");
                      setRecentSearches([]);
                    }}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                    Effacer
                  </button>
                </div>
              </div>
            )}

            {/* Expanded banner */}
            {expanded && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-900 ring-1 ring-blue-200">
                <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                <p>
                  <strong>{t("expandedBannerTitle")}</strong> {t("expandedBannerDesc")}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!loading && searched && results.length === 0 && (
              <div className="rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                  <SearchX className="h-8 w-8" strokeWidth={2} />
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold text-foreground">{t("emptyTitle")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("emptyDesc")}</p>
                <button
                  onClick={resetAll}
                  className="mt-6 inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  {t("reset")}
                </button>
              </div>
            )}

            {/* Clinic results */}
            {clinicResults.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" strokeWidth={2.5} />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Centres médicaux
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {clinicResults.map((clinic) => (
                    <Link
                      key={clinic.id}
                      href={`/centre-medical/${clinic.slug}`}
                      className="group flex items-center gap-3 rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        {clinic.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={clinic.logoUrl}
                            alt={clinic.name}
                            className="h-10 w-10 rounded-lg object-contain"
                          />
                        ) : (
                          <Building2 className="h-6 w-6" strokeWidth={2} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm font-bold text-foreground truncate">
                          {clinic.name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                          {clinic.cityLabel || clinic.city}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={2.5} />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Loading skeletons — reserve height equal to typical 20-result page to prevent CLS */}
            {loading && results.length === 0 && (
              <div className="grid gap-3" aria-hidden>
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
                  >
                    <div className="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                      <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-secondary" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mobile map/list toggle — reserve fixed slot to avoid CLS when results arrive */}
            <div className="mb-4 flex h-9 items-center gap-2 lg:hidden">
              {results.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowMap(false)}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-all ${
                      !showMap
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-foreground hover:border-primary/40"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-all ${
                      showMap
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-foreground hover:border-primary/40"
                    }`}
                  >
                    <Map className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Carte ({results.length})
                  </button>
                </>
              )}
            </div>

            {/* Carte view — full Leaflet map showing all results */}
            {showMap && (
              <div className="ps-map-shell rounded-2xl overflow-hidden border" style={{ borderColor: "var(--line-cool)", height: 600 }}>
                {results.length > 0 ? (
                  <DoctorMap doctors={results} userLocation={userLocation} onUserLocationChange={setUserLocation} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-6" style={{ background: "var(--surface-2)" }}>
                    <MapPin className="w-8 h-8" style={{ color: "var(--ink-300)" }} strokeWidth={1.5} />
                    <p className="text-[13.5px] font-semibold" style={{ color: "var(--ink-500)" }}>
                      Lancez une recherche pour afficher les médecins sur la carte
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Results list — hidden when Carte view is active */}
            {!showMap && results.length > 0 && (() => {
              const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
              const currentPage = Math.min(page, totalPages);
              const startIdx = (currentPage - 1) * PAGE_SIZE;
              const pageDoctors = results.slice(startIdx, startIdx + PAGE_SIZE);
              return (
                <div>
                  <div className="grid gap-3">
                    {pageDoctors.map((doctor) => {
                      const checked = compareIds.includes(doctor.id);
                      const disabled = !checked && compareIds.length >= 3;
                      return (
                        <div key={doctor.id} className="relative">
                          <label
                            className={`absolute end-3 top-3 z-10 flex cursor-pointer items-center gap-1.5 rounded-full border bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm transition ${
                              checked
                                ? "border-primary text-primary"
                                : disabled
                                ? "border-border text-muted-foreground/50 cursor-not-allowed"
                                : "border-border text-muted-foreground hover:border-primary"
                            }`}
                            title={disabled ? "Maximum 3 médecins" : "Comparer ce médecin"}
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3 cursor-pointer accent-primary disabled:cursor-not-allowed"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCompareIds((prev) => [...prev, doctor.id].slice(0, 3));
                                } else {
                                  setCompareIds((prev) => prev.filter((id) => id !== doctor.id));
                                }
                              }}
                            />
                            <span>Comparer</span>
                          </label>
                          <DoctorCard doctor={doctor} showSlots />
                        </div>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <nav
                      className="mt-6 flex items-center justify-center gap-1.5"
                      aria-label="Pagination"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        disabled={currentPage === 1}
                        aria-label="Page précédente"
                        className="ds-btn ds-btn-ghost"
                        style={{ width: 40, height: 40, padding: 0, borderRadius: 12 }}
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === totalPages ||
                            Math.abs(p - currentPage) <= 1,
                        )
                        .reduce<(number | "…")[]>((acc, p) => {
                          if (acc.length && p - (acc[acc.length - 1] as number) > 1)
                            acc.push("…");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "…" ? (
                            <span
                              key={`gap-${i}`}
                              className="px-1 text-sm"
                              style={{ color: "var(--ink-400)" }}
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setPage(p);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              aria-current={p === currentPage ? "page" : undefined}
                              className={
                                p === currentPage
                                  ? "ds-btn ds-btn-primary"
                                  : "ds-btn ds-btn-ghost"
                              }
                              style={{ width: 40, height: 40, padding: 0, borderRadius: 12 }}
                            >
                              {p}
                            </button>
                          ),
                        )}
                      <button
                        type="button"
                        onClick={() => {
                          setPage((p) => Math.min(totalPages, p + 1));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        disabled={currentPage === totalPages}
                        aria-label="Page suivante"
                        className="ds-btn ds-btn-ghost"
                        style={{ width: 40, height: 40, padding: 0, borderRadius: 12 }}
                      >
                        ›
                      </button>
                    </nav>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Sticky map column removed in cyan redesign — use the inline
              "Vue carte" toggle on the results header instead. */}
        </div>
      </div>

      {/* Sticky comparator bar */}
      {compareIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-primary/20 bg-white px-4 py-3 shadow-2xl">
            <span className="text-sm font-bold text-foreground">
              {compareIds.length} médecin{compareIds.length > 1 ? "s" : ""} sélectionné{compareIds.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Effacer
            </button>
            <button
              type="button"
              disabled={compareIds.length < 2}
              onClick={() => router.push(`/comparer?ids=${compareIds.join(",")}`)}
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-doktori-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Comparer ({compareIds.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════ Reusable filter components ═════════════════ */

function FilterGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-start"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" strokeWidth={2.5} />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{label}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
          strokeWidth={2.5}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function FilterOption({
  label,
  selected,
  count,
  onClick,
}: {
  label: string;
  selected: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-xs font-medium transition-all ${
        selected
          ? "bg-primary text-white"
          : "text-foreground hover:bg-secondary"
      }`}
    >
      <span className="flex items-center gap-2">
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            selected ? "bg-white/20 text-white" : "bg-secondary text-doktori-teal-dark"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function RecherchePage() {
  return (
    <Suspense>
      <RechercheInner />
    </Suspense>
  );
}
