"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DoctorCard } from "@/components/doctor-card";
import { SPECIALTIES, CITIES } from "@doktori/shared";

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

  const fetchResults = useCallback(async (q: string, spec: string, ct: string) => {
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
  }, []);

  // Debounced search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query, specialty, city);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, specialty, city, fetchResults]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Trouver un médecin</h1>
          <p className="text-sm text-muted-foreground">
            Recherchez parmi nos médecins par nom, spécialité ou ville
          </p>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="Rechercher un médecin, une spécialité..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 text-base"
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <Select
                value={specialty}
                onValueChange={(value) => setSpecialty(value as string)}
              >
                <SelectTrigger className="w-full">
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
            </div>

            <div className="flex-1">
              <Select
                value={city}
                onValueChange={(value) => setCity(value as string)}
              >
                <SelectTrigger className="w-full">
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
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {loading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Recherche en cours...
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun médecin trouvé
            </div>
          )}

          {!loading && results.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      </div>
    </div>
  );
}
