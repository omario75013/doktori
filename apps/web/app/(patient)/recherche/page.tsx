"use client";

import { useState, useEffect, useCallback } from "react";
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

interface SearchResults {
  hits: Doctor[];
}

export default function RecherchePage() {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchResults = useCallback(
    async (q: string, spec: string, ct: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (spec) params.set("specialty", spec);
        if (ct) params.set("city", ct);

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error("Erreur de recherche");
        const data: SearchResults = await res.json();
        setResults(data.hits);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    },
    []
  );

  // Debounced search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query, specialty, city);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, specialty, city, fetchResults]);

  const activeFilterCount = [specialty, city].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 px-4 pb-6 pt-12 sm:px-6 sm:pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_theme(colors.gray.200)_1px,_transparent_1px)] opacity-40 [background-size:24px_24px]"
        />
        <div className="relative mx-auto max-w-4xl">
          <h1 className="text-balance text-center text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Trouvez votre médecin
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500 sm:text-base">
            Parcourez nos 65+ médecins dans le Grand Tunis
          </p>

          {/* Search input */}
          <div className="mx-auto mt-8 flex h-14 max-w-2xl items-center rounded-2xl border border-gray-200 bg-white p-1.5 shadow-[0_4px_32px_-4px_rgba(0,0,0,0.08)] ring-1 ring-gray-100 transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20">
            <div className="flex h-full w-11 shrink-0 items-center justify-center text-gray-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Nom du médecin, spécialité, ville..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full flex-1 border-0 bg-transparent px-1 text-base text-gray-900 placeholder:text-gray-400 outline-none"
            />
            {loading && (
              <div className="flex h-full w-11 shrink-0 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtres
            </div>

            <div className="flex flex-1 flex-wrap gap-2">
              <Select
                value={specialty}
                onValueChange={(value) => setSpecialty(value as string)}
              >
                <SelectTrigger className="h-9 w-auto gap-2 rounded-full border-gray-200 bg-white px-4 text-xs font-medium">
                  <Stethoscope className="h-3.5 w-3.5 text-gray-400" />
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
                <SelectTrigger className="h-9 w-auto gap-2 rounded-full border-gray-200 bg-white px-4 text-xs font-medium">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
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
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        {/* Results header */}
        {searched && !loading && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{results.length}</span>{" "}
              médecin{results.length !== 1 ? "s" : ""} trouvé
              {results.length !== 1 ? "s" : ""}
            </p>
            {results.length > 0 && (
              <p className="hidden text-xs text-gray-400 sm:block">
                Triés par pertinence
              </p>
            )}
          </div>
        )}

        {/* Initial loading */}
        {loading && !searched && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Recherche en cours...
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && searched && results.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <SearchX className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">
              Aucun médecin trouvé
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Essayez d'élargir votre recherche ou de modifier les filtres.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setSpecialty("");
                setCity("");
              }}
              className="mt-6 inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
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
      </div>
    </div>
  );
}
