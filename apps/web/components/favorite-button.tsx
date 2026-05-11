"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

interface Props {
  doctorId: string;
  initialFavorited?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FavoriteButton({ doctorId, initialFavorited = false, className = "", size = "md" }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem("doktori_patient_session") : null;
    setToken(stored);
    setMounted(true);
  }, []);

  // If we couldn't be passed initial state from the server (e.g. anonymous SSR),
  // fetch the current state once we know we have a token.
  useEffect(() => {
    if (!token) return;
    if (initialFavorited) return;
    void fetch(`/api/me/favorites/${doctorId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.favorited === "boolean") setFavorited(d.favorited);
      })
      .catch(() => {});
  }, [token, doctorId, initialFavorited]);

  if (!mounted || !token) return null;

  async function toggle() {
    if (pending || !token) return;
    setPending(true);
    const next = !favorited;
    setFavorited(next);
    try {
      if (next) {
        const res = await fetch("/api/me/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ doctorId }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success("Médecin ajouté à vos favoris");
      } else {
        const res = await fetch(`/api/me/favorites/${doctorId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("fail");
        toast.success("Retiré de vos favoris");
      }
    } catch {
      setFavorited(!next);
      toast.error("Erreur, réessayez");
    } finally {
      setPending(false);
    }
  }

  const sizes = {
    sm: { btn: "h-8 w-8", icon: "h-3.5 w-3.5" },
    md: { btn: "h-10 w-10", icon: "h-5 w-5" },
    lg: { btn: "h-12 w-12", icon: "h-6 w-6" },
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`inline-flex items-center justify-center ${sizes[size].btn} rounded-full border transition-all ${
        favorited
          ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100"
          : "bg-white border-border text-foreground/40 hover:text-rose-500 hover:border-rose-200"
      } ${pending ? "opacity-60" : ""} ${className}`}
    >
      <Heart className={`${sizes[size].icon} ${favorited ? "fill-rose-500" : ""}`} />
    </button>
  );
}
