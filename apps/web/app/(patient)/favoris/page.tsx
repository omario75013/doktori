"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Heart,
  Stethoscope,
  MapPin,
  X,
  Calendar,
  Search as SearchIcon,
} from "lucide-react";
import { SPECIALTIES } from "@doktori/shared";
import { toast } from "sonner";

interface Favorite {
  id: string;
  createdAt: string;
  doctorId: string;
  doctorName: string;
  doctorSlug: string;
  doctorSpecialty: string;
  doctorAddress: string | null;
  doctorPhotoUrl: string | null;
}

export default function FavorisPage() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/favorites", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(doctorId: string) {
    setItems((prev) => prev.filter((i) => i.doctorId !== doctorId));
    const res = await fetch(`/api/me/favorites/${doctorId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) toast.success("Retiré de vos favoris");
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((f) => {
        const spec = SPECIALTIES.find((s) => s.id === f.doctorSpecialty);
        return (
          f.doctorName.toLowerCase().includes(q) ||
          (spec?.label ?? "").toLowerCase().includes(q) ||
          (f.doctorAddress ?? "").toLowerCase().includes(q)
        );
      })
    : items;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="ds-eyebrow">FAVORIS</div>
          <h1 className="ds-page-title">Médecins favoris</h1>
          <p className="ds-page-sub">
            {items.length} médecin{items.length > 1 ? "s" : ""} sauvegardé
            {items.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/recherche" className="ds-btn ds-btn-primary">
          <SearchIcon className="w-4 h-4" /> Trouver un médecin
        </Link>
      </div>

      {/* Search bar (only when there are favorites) */}
      {items.length > 0 && (
        <div className="ds-card-patient mb-4" style={{ padding: 10 }}>
          <div className="flex items-center gap-2">
            <SearchIcon className="w-4 h-4 ms-1" style={{ color: "var(--ink-500)" }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans vos favoris…"
              className="flex-1 bg-transparent outline-none text-[14px]"
              style={{ color: "var(--ink-900)" }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer"
                className="p-1 rounded hover:bg-[color:var(--surface-2)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="ds-card-patient p-10 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, var(--primary-50), var(--surface-2))",
              color: "var(--primary-600)",
            }}
          >
            <Heart className="h-8 w-8" />
          </div>
          <p className="font-bold text-[16px] mb-1" style={{ color: "var(--ink-900)" }}>
            Aucun favori pour l&apos;instant
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--ink-500)" }}>
            Touchez le cœur sur la fiche d&apos;un médecin pour le retrouver ici.
          </p>
          <Link href="/recherche" className="ds-btn ds-btn-primary">
            <SearchIcon className="w-4 h-4" /> Trouver un médecin
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ds-card-patient p-8 text-center">
          <p className="text-sm" style={{ color: "var(--ink-500)" }}>
            Aucun favori ne correspond à « {query} ».
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((f) => {
            const spec = SPECIALTIES.find((s) => s.id === f.doctorSpecialty);
            const initials = f.doctorName
              .replace(/^Dr\.?\s*/i, "")
              .split(/\s+/)
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <div key={f.id} className="ds-card-patient p-4 relative">
                <button
                  onClick={() => remove(f.doctorId)}
                  aria-label="Retirer des favoris"
                  className="absolute top-3 end-3 inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-rose-50 transition-colors"
                  style={{ color: "#E11D48" }}
                >
                  <X className="h-4 w-4" />
                </button>

                <Link href={`/medecin/${f.doctorSlug}`} className="flex items-center gap-3 pe-6">
                  <div
                    className="w-14 h-14 rounded-2xl overflow-hidden grid place-items-center shrink-0 font-extrabold text-white text-[15px]"
                    style={{
                      background: "linear-gradient(135deg, var(--primary-400), var(--primary-600))",
                    }}
                  >
                    {f.doctorPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.doctorPhotoUrl}
                        alt={f.doctorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials || <Stethoscope className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-extrabold text-[14.5px] truncate"
                      style={{ color: "var(--ink-900)" }}
                    >
                      {f.doctorName}
                    </p>
                    {spec?.label && (
                      <span className="ds-chip ds-chip-primary mt-1" style={{ fontSize: 11 }}>
                        {spec.label}
                      </span>
                    )}
                  </div>
                </Link>

                {f.doctorAddress && (
                  <p
                    className="text-[12px] flex items-center gap-1 mt-2 truncate"
                    style={{ color: "var(--ink-500)" }}
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    {f.doctorAddress}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  <Link
                    href={`/medecin/${f.doctorSlug}`}
                    className="ds-btn ds-btn-ghost ds-btn-sm flex-1 justify-center"
                  >
                    Voir profil
                  </Link>
                  <Link
                    href={`/rdv/${f.doctorSlug}`}
                    className="ds-btn ds-btn-primary ds-btn-sm flex-1 justify-center"
                  >
                    <Calendar className="w-3.5 h-3.5" /> RDV
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
