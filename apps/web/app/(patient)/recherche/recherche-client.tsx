"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { DoctorCard } from "@/components/doctor-card";
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
  Filter,
  Check,
  DollarSign,
  Clock,
  ChevronDown,
  Video,
  Building2,
  ArrowRight,
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
        setResults(data.hits);
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

  // Geolocation
  function requestGeolocation() {
    if (!navigator.geolocation) {
      setGeoError(t("geoUnsupported"));
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("proximity");
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(err.code === err.PERMISSION_DENIED ? t("geoDenied") : t("geoUnavailable"));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
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
      label: SPECIALTIES.find((s) => s.id === parsedSpecialty)?.label || parsedSpecialty,
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
      label: "En vidéo",
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
    <div className="min-h-screen bg-[#F0FDFA]/30 dark:bg-gray-900 overflow-x-hidden">
      {/* ═══════════════ SEARCH HEADER ═══════════════ */}
      <div className="sticky top-16 z-20 border-b border-[#E6F4F1] bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          {/* Search input */}
          <div className="flex items-center gap-3">
            <div className="group flex h-12 flex-1 items-center rounded-xl border-2 border-[#E6F4F1] bg-white px-3 shadow-sm transition-all focus-within:border-[#0891B2]">
              <Search className="h-4 w-4 shrink-0 text-[#5E7574]" strokeWidth={2.5} />
              <input
                type="text"
                placeholder={t("inputPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-full flex-1 border-0 bg-transparent px-2 text-sm text-[#134E4A] placeholder:text-[#5E7574]/60 outline-none"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-[#0891B2]" />}
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="relative flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#E6F4F1] bg-white text-[#0891B2] lg:hidden"
              aria-label={t("filtersAriaLabel")}
            >
              <SlidersHorizontal className="h-5 w-5" strokeWidth={2.5} />
              {filterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E] text-[10px] font-bold text-white ring-2 ring-white">
                  {filterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5E7574]">
                {t("activeFiltersLabel")}
              </span>
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.onRemove}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-[#0891B2] px-3 py-1 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#0E7490]"
                >
                  <span>{chip.label}</span>
                  <X className="h-3 w-3 transition-transform group-hover:scale-110" strokeWidth={3} />
                </button>
              ))}
              <button
                onClick={resetAll}
                className="text-xs font-bold text-[#5E7574] hover:text-[#134E4A] hover:underline"
              >
                {t("clearAll")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ MAIN LAYOUT ═══════════════ */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* ═══════════════ SIDEBAR FILTERS ═══════════════ */}
          <aside className={`${mobileFiltersOpen ? "fixed inset-0 z-50 overflow-y-auto bg-white p-4 lg:static lg:p-0" : "hidden lg:block"}`}>
            {mobileFiltersOpen && (
              <div className="mb-4 flex items-center justify-between border-b pb-3 lg:hidden">
                <h2 className="font-heading text-lg font-bold text-[#134E4A]">{t("mobileFiltersTitle")}</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100"
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
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0891B2] bg-white px-3 text-xs font-bold text-[#0891B2] transition-all hover:bg-[#F0FDFA] disabled:opacity-60"
                  >
                    {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" strokeWidth={2.5} />}
                    {geoLoading ? t("locating") : t("findNearMe")}
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-[#22C55E]/10 px-3 py-2 text-xs font-bold text-[#16A34A] ring-1 ring-[#22C55E]/30">
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
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
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
                        label={s.label}
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
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
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
                        label={c.label}
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
                className="mt-6 h-12 w-full rounded-xl bg-[#0891B2] font-bold text-white lg:hidden"
              >
                {t("apply", { count: results.length })}
              </button>
            )}
          </aside>

          {/* ═══════════════ RESULTS ═══════════════ */}
          <div>
            {/* Date picker + sort bar */}
            <div className="mb-4 space-y-3">
              {/* Teleconsult toggle pill */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModeFilter(modeFilter === "teleconsult" ? "" : "teleconsult")}
                  className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                    modeFilter === "teleconsult"
                      ? "border-purple-600 bg-purple-600 text-white shadow-sm"
                      : "border-purple-200 bg-white text-purple-700 hover:border-purple-400 hover:bg-purple-50"
                  }`}
                >
                  <Video className="h-3.5 w-3.5" strokeWidth={2.5} />
                  En vidéo
                </button>
              </div>

              {/* Date picker */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5E7574]">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {t("dateLabel")}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setDate("")}
                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      !date ? "bg-[#0891B2] text-white shadow-sm" : "bg-white text-[#5E7574] ring-1 ring-[#E6F4F1]"
                    }`}
                  >
                    {t("dateAll")}
                  </button>
                  {dates.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDate(d.value === date ? "" : d.value)}
                      className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        date === d.value ? "bg-[#0891B2] text-white shadow-sm" : "bg-white text-[#5E7574] ring-1 ring-[#E6F4F1]"
                      }`}
                    >
                      {d.isToday ? t("availabilityToday") : d.isTomorrow ? t("availabilityTomorrow") : d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#5E7574]">
                  {loading ? (
                    t("searching")
                  ) : (
                    <>
                      <span className="font-bold text-[#134E4A]">{results.length}</span>{" "}
                      {results.length === 1 ? t("resultSingular") : t("resultPlural")}
                      {totalCount > results.length ? ` ${t("totalSuffix", { total: totalCount })}` : ""}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-[#5E7574]" strokeWidth={2.5} />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    aria-label={t("sortLabel")}
                    className="h-9 rounded-lg border border-[#E6F4F1] bg-white px-3 pr-8 text-xs font-bold text-[#134E4A] outline-none focus:border-[#0891B2]"
                  >
                    <option value="relevance">{t("sortRelevance")}</option>
                    {(userLocation || parsedCity) && <option value="proximity">{t("sortProximity")}</option>}
                    <option value="price_asc">{t("sortPriceAsc")}</option>
                    <option value="price_desc">{t("sortPriceDesc")}</option>
                    <option value="name">{t("sortName")}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Recent searches — shown when search is empty and no results yet */}
            {!searched && !loading && recentSearches.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5E7574]">
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
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E6F4F1] bg-white px-3 py-1.5 text-xs font-medium text-[#134E4A] hover:border-[#0891B2] hover:bg-[#F0FDFA] transition-all"
                      >
                        <Search className="h-3 w-3 text-[#5E7574]" strokeWidth={2.5} />
                        {label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      localStorage.removeItem("doktori_recent_searches");
                      setRecentSearches([]);
                    }}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-[#5E7574] hover:text-red-500 transition-colors"
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
              <div className="rounded-2xl border border-[#E6F4F1] bg-white py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0FDFA] text-[#5E7574]">
                  <SearchX className="h-8 w-8" strokeWidth={2} />
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold text-[#134E4A]">{t("emptyTitle")}</h3>
                <p className="mt-2 text-sm text-[#5E7574]">{t("emptyDesc")}</p>
                <button
                  onClick={resetAll}
                  className="mt-6 inline-flex h-10 items-center rounded-lg border border-[#E6F4F1] bg-white px-4 text-sm font-medium text-[#134E4A] hover:bg-[#F0FDFA]"
                >
                  {t("reset")}
                </button>
              </div>
            )}

            {/* Clinic results */}
            {clinicResults.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#0891B2]" strokeWidth={2.5} />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#134E4A]">
                    Centres médicaux
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {clinicResults.map((clinic) => (
                    <Link
                      key={clinic.id}
                      href={`/centre-medical/${clinic.slug}`}
                      className="group flex items-center gap-3 rounded-2xl border border-[#E6F4F1] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#0891B2]/40 hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0891B2]">
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
                        <p className="font-heading text-sm font-bold text-[#134E4A] truncate">
                          {clinic.name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#5E7574]">
                          <MapPin className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                          {clinic.cityLabel || clinic.city}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#5E7574] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0891B2]" strokeWidth={2.5} />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="grid gap-3">
                {results.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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
    <div className="rounded-2xl border border-[#E6F4F1] bg-white p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#0891B2]" strokeWidth={2.5} />
          <span className="text-xs font-bold uppercase tracking-wider text-[#134E4A]">{label}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[#5E7574] transition-transform ${open ? "" : "-rotate-90"}`}
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
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-all ${
        selected
          ? "bg-[#0891B2] text-white"
          : "text-[#134E4A] hover:bg-[#F0FDFA]"
      }`}
    >
      <span className="flex items-center gap-2">
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            selected ? "bg-white/20 text-white" : "bg-[#F0FDFA] text-[#0E7490]"
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
