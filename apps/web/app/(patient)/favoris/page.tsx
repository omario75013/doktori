"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Stethoscope, MapPin, X } from "lucide-react";
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
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.replace("/mes-rdv");
      return;
    }
    setToken(stored);
  }, [router]);

  const load = useCallback(
    async (t: string) => {
      setLoading(true);
      try {
        const res = await fetch("/api/me/favorites", {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });
        if (res.status === 401) {
          localStorage.removeItem("doktori_patient_token");
          router.replace("/mes-rdv");
          return;
        }
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  async function remove(doctorId: string) {
    if (!token) return;
    setItems((prev) => prev.filter((i) => i.doctorId !== doctorId));
    const res = await fetch(`/api/me/favorites/${doctorId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) toast.success("Retiré de vos favoris");
  }

  return (
    <div className="min-h-screen bg-secondary/40 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Médecins favoris</h1>
            <p className="text-white/70 text-xs mt-0.5">
              {items.length} médecin{items.length > 1 ? "s" : ""} sauvegardé
              {items.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 mb-4">
              <Heart className="h-7 w-7 text-rose-300" />
            </div>
            <p className="font-semibold text-foreground mb-1">Aucun favori pour l&apos;instant</p>
            <p className="text-sm text-foreground/50 mb-4">
              Cliquez sur le cœur depuis le profil d&apos;un médecin pour le sauvegarder.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary hover:bg-doktori-teal-dark text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              Trouver un médecin
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((f) => {
              const spec = SPECIALTIES.find((s) => s.id === f.doctorSpecialty);
              return (
                <div
                  key={f.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {f.doctorPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.doctorPhotoUrl}
                        alt={f.doctorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Stethoscope className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <Link
                    href={`/medecin/${f.doctorSlug}`}
                    className="flex-1 min-w-0"
                  >
                    <p className="font-bold text-primary truncate">{f.doctorName}</p>
                    <p className="text-sm text-foreground/70 truncate">{spec?.label}</p>
                    {f.doctorAddress && (
                      <p className="text-xs text-foreground/50 flex items-center gap-1 truncate mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {f.doctorAddress}
                      </p>
                    )}
                  </Link>
                  <button
                    onClick={() => remove(f.doctorId)}
                    aria-label="Retirer des favoris"
                    className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
