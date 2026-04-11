"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DoctorCard } from "@/components/doctor-card";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Stethoscope,
  Loader2,
  SearchX,
  Calendar,
  X,
  Info,
  Navigation,
  Crosshair,
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
}

interface ParsedFilters {
  specialty: string | null;
  city: string | null;
  text: string;
}

interface SearchResponse {
  hits: Doctor[];
  parsed: ParsedFilters;
  expanded?: boolean;
  dateFilter?: string | null;
}

function formatDateFR(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
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

  // Initialize state from URL on mount
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [specialty, setSpecialty] = useState(() => searchParams.get("specialty") || "");
  const [city, setCity] = useState(() => searchParams.get("city") || "");
  const [date, setDate] = useState(() => searchParams.get("date") || "");

  // Patient geolocation (opt-in via button click)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [results, setResults] = useState<Doctor[]>([]);
  const [parsed, setParsed] = useState<ParsedFilters>({
    specialty: null,
    city: null,
    text: "",
  });
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchResults = useCallback(
    async (
      q: string,
      spec: string,
      ct: string,
      dt: string,
      loc: { lat: number; lng: number } | null
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (spec) params.set("specialty", spec);
        if (ct) params.set("city", ct);
        if (dt) params.set("date", dt);
        if (loc) {
          params.set("lat", String(loc.lat));
          params.set("lng", String(loc.lng));
        }

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error("Erreur de recherche");
        const data: SearchResponse = await res.json();
        setResults(data.hits);
        setParsed(data.parsed);
        setExpanded(data.expanded || false);
      } catch {
        setResults([]);
        setParsed({ specialty: null, city: null, text: "" });
        setExpanded(false);
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
      fetchResults(query, specialty, city, date, userLocation);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, specialty, city, date, userLocation, fetchResults]);

  // Request browser geolocation
  function requestGeolocation() {
    if (!navigator.geolocation) {
      setGeoError("Géolocalisation non supportée par votre navigateur");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Autorisation refusée. Activez la géolocalisation.");
        } else {
          setGeoError("Impossible d'obtenir votre position.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function clearGeolocation() {
    setUserLocation(null);
    setGeoError(null);
  }

  // Sync URL when filters change (preserve shareable links)
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (specialty) params.set("specialty", specialty);
    if (city) params.set("city", city);
    if (date) params.set("date", date);
    const url = `/recherche${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(url, { scroll: false });
  }, [query, specialty, city, date, router]);

  // Build next 14 days for the date picker
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: toISODate(d),
      label: formatDateFR(d),
      isToday: i === 0,
      isTomorrow: i === 1,
    };
  });

  const parsedSpecialtyLabel = parsed.specialty
    ? SPECIALTIES.find((s) => s.id === parsed.specialty)?.label
    : null;
  const parsedCityLabel = parsed.city
    ? CITIES.find((c) => c.id === parsed.city)?.label
    : null;
  const hasParsedFilters = !!(parsedSpecialtyLabel || parsedCityLabel);

  const activeFilterCount = [specialty, city, date].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F0FDFA]/30">
      {/* ══════════════════════ HEADER ══════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-b from-white to-[#F0FDFA]/50 px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_theme(colors.gray.200)_1px,_transparent_1px)] opacity-40 [background-size:24px_24px]"
        />
        <div className="relative mx-auto max-w-4xl">
          <h1 className="text-balance text-center font-heading text-3xl font-black tracking-tight text-[#134E4A] sm:text-4xl">
            Trouvez votre médecin
          </h1>
          <p className="mt-2 text-center text-sm text-[#5E7574] sm:text-base">
            Parcourez nos 65+ médecins dans le Grand Tunis
          </p>

          {/* Search input */}
          <div className="mx-auto mt-8 flex h-14 max-w-2xl items-center rounded-2xl border-2 border-[#E6F4F1] bg-white p-1.5 shadow-lg shadow-[#0891B2]/5 transition-all focus-within:border-[#0891B2] focus-within:shadow-xl focus-within:shadow-[#0891B2]/10">
            <div className="flex h-full w-12 shrink-0 items-center justify-center text-[#5E7574]">
              <Search className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Ex: dermato ariana, cardio la marsa, tbib tunis..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full flex-1 border-0 bg-transparent px-2 text-base text-[#134E4A] placeholder:text-[#5E7574]/60 outline-none"
            />
            {loading && (
              <div className="flex h-full w-12 shrink-0 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#0891B2]" />
              </div>
            )}
          </div>

          {/* Parsed filter chips */}
          {hasParsedFilters && (
            <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-[#5E7574]">Détecté :</span>
              {parsedSpecialtyLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-3 py-1 font-semibold text-[#0E7490] ring-1 ring-[#0891B2]/20">
                  <Stethoscope className="h-3 w-3" strokeWidth={2.5} />
                  {parsedSpecialtyLabel}
                </span>
              )}
              {parsedCityLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-3 py-1 font-semibold text-[#0E7490] ring-1 ring-[#0891B2]/20">
                  <MapPin className="h-3 w-3" strokeWidth={2.5} />
                  {parsedCityLabel}
                </span>
              )}
            </div>
          )}

          {/* ══════════════════════ DATE PICKER (like Doctolib) ══════════════════════ */}
          <div className="mx-auto mt-6 max-w-2xl">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5E7574]">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>Disponible le</span>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1.5">
              <button
                onClick={() => setDate("")}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  !date
                    ? "bg-[#0891B2] text-white shadow-sm"
                    : "bg-white text-[#5E7574] ring-1 ring-[#E6F4F1] hover:text-[#0891B2]"
                }`}
              >
                Toutes les dates
              </button>
              {dates.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDate(d.value === date ? "" : d.value)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    date === d.value
                      ? "bg-[#0891B2] text-white shadow-sm"
                      : "bg-white text-[#5E7574] ring-1 ring-[#E6F4F1] hover:text-[#0891B2]"
                  }`}
                >
                  {d.isToday ? (
                    <span className="flex flex-col leading-tight">
                      <span className="text-[10px] opacity-80">Aujourd&apos;hui</span>
                      <span>{formatDateFR(new Date()).split(" ").slice(1).join(" ")}</span>
                    </span>
                  ) : d.isTomorrow ? (
                    <span className="flex flex-col leading-tight">
                      <span className="text-[10px] opacity-80">Demain</span>
                      <span>
                        {formatDateFR(new Date(Date.now() + 86400000)).split(" ").slice(1).join(" ")}
                      </span>
                    </span>
                  ) : (
                    <span className="capitalize">{d.label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Geolocation button */}
          <div className="mx-auto mt-4 max-w-2xl">
            {!userLocation ? (
              <button
                onClick={requestGeolocation}
                disabled={geoLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-[#0891B2] bg-white px-4 text-xs font-bold text-[#0891B2] shadow-sm transition-all hover:bg-[#F0FDFA] disabled:opacity-60"
              >
                {geoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" strokeWidth={2.5} />
                )}
                {geoLoading ? "Localisation..." : "Médecins près de moi"}
              </button>
            ) : (
              <div className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#22C55E]/10 px-4 text-xs font-bold text-[#16A34A] ring-1 ring-[#22C55E]/30">
                <Navigation className="h-4 w-4" strokeWidth={2.5} />
                <span>Position activée · triés par distance</span>
                <button
                  onClick={clearGeolocation}
                  className="ml-1 rounded-full p-0.5 hover:bg-[#22C55E]/20"
                  aria-label="Désactiver la géolocalisation"
                >
                  <X className="h-3 w-3" strokeWidth={3} />
                </button>
              </div>
            )}
            {geoError && (
              <p className="mt-2 text-xs text-red-600">{geoError}</p>
            )}
          </div>

          {/* Filters */}
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5E7574]">
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.5} />
              Filtres
            </div>

            <div className="flex flex-1 flex-wrap gap-2">
              <Select
                value={specialty}
                onValueChange={(value) => setSpecialty(value as string)}
              >
                <SelectTrigger className="h-9 w-auto gap-2 rounded-full border-[#E6F4F1] bg-white px-4 text-xs font-medium">
                  <Stethoscope className="h-3.5 w-3.5 text-[#5E7574]" strokeWidth={2.5} />
                  <SelectValue placeholder="Toutes les spécialités" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les spécialités</SelectItem>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={city}
                onValueChange={(value) => setCity(value as string)}
              >
                <SelectTrigger className="h-9 w-auto gap-2 rounded-full border-[#E6F4F1] bg-white px-4 text-xs font-medium">
                  <MapPin className="h-3.5 w-3.5 text-[#5E7574]" strokeWidth={2.5} />
                  <SelectValue placeholder="Toutes les villes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les villes</SelectItem>
                  {CITIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setSpecialty("");
                    setCity("");
                    setDate("");
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-[#E6F4F1] bg-white px-3 text-xs font-medium text-[#5E7574] transition-colors hover:bg-gray-50"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════ RESULTS ══════════════════════ */}
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        {/* Expanded banner */}
        {expanded && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-900 ring-1 ring-blue-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
            <p>
              <strong>Résultats élargis aux zones proches.</strong> Peu de médecins
              correspondent exactement — nous affichons aussi les médecins{" "}
              {parsedSpecialtyLabel ? parsedSpecialtyLabel.toLowerCase() : "correspondants"}{" "}
              dans les quartiers voisins, triés par distance.
            </p>
          </div>
        )}

        {/* Results header */}
        {searched && !loading && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#5E7574]">
              <span className="font-semibold text-[#134E4A]">{results.length}</span>{" "}
              médecin{results.length !== 1 ? "s" : ""} trouvé
              {results.length !== 1 ? "s" : ""}
              {date && (
                <>
                  {" "}
                  disponibles{" "}
                  <span className="font-semibold text-[#134E4A]">
                    le {formatDateFR(new Date(date))}
                  </span>
                </>
              )}
            </p>
            {results.length > 0 && (
              <p className="hidden text-xs text-[#5E7574] sm:block">
                {parsed.city ? "Triés par proximité" : "Triés par pertinence"}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && searched && results.length === 0 && (
          <div className="rounded-2xl border border-[#E6F4F1] bg-white py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0FDFA] text-[#5E7574]">
              <SearchX className="h-8 w-8" strokeWidth={2} />
            </div>
            <h3 className="mt-4 font-heading text-lg font-bold text-[#134E4A]">
              Aucun médecin trouvé
            </h3>
            <p className="mt-2 text-sm text-[#5E7574]">
              Essayez d&apos;élargir votre recherche ou de modifier les filtres.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setSpecialty("");
                setCity("");
                setDate("");
              }}
              className="mt-6 inline-flex h-10 items-center rounded-lg border border-[#E6F4F1] bg-white px-4 text-sm font-medium text-[#134E4A] transition-colors hover:bg-[#F0FDFA]"
            >
              Réinitialiser la recherche
            </button>
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <div className="grid gap-3 sm:gap-4">
            {results.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}

        {/* Loading initial */}
        {loading && !searched && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-sm text-[#5E7574]">
              <Loader2 className="h-5 w-5 animate-spin text-[#0891B2]" />
              Recherche en cours...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense>
      <RechercheInner />
    </Suspense>
  );
}
