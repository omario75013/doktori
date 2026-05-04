"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Trash2, FileImage, Upload, Check } from "lucide-react";
import { toast } from "sonner";

interface MeProfile {
  photoUrl?: string | null;
  cnamCardUrl?: string | null;
  insuranceCardUrl?: string | null;
}

export function PatientMediaSection({ token }: { token: string }) {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const photoInput = useRef<HTMLInputElement>(null);
  const cnamInput = useRef<HTMLInputElement>(null);
  const insuranceInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/patients/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const d = await res.json();
        setMe({
          photoUrl: d.photoUrl,
          cnamCardUrl: d.cnamCardUrl,
          insuranceCardUrl: d.insuranceCardUrl,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function uploadPhoto(file: File) {
    setBusy("photo");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/me/photo", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    setBusy(null);
    if (res.ok) {
      const d = await res.json();
      setMe((p) => ({ ...p, photoUrl: d.photoUrl }));
      toast.success("Photo mise à jour");
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Erreur");
    }
  }

  async function deletePhoto() {
    setBusy("photo");
    const res = await fetch("/api/me/photo", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusy(null);
    if (res.ok) {
      setMe((p) => ({ ...p, photoUrl: null }));
      toast.success("Photo supprimée");
    }
  }

  async function uploadCard(file: File, type: "cnam" | "mutuelle") {
    setBusy(type);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/me/insurance-card?type=${type}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    setBusy(null);
    if (res.ok) {
      const d = await res.json();
      setMe((p) => ({
        ...p,
        ...(type === "cnam" ? { cnamCardUrl: d.url } : { insuranceCardUrl: d.url }),
      }));
      toast.success("Carte enregistrée");
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.error ?? "Erreur");
    }
  }

  async function deleteCard(type: "cnam" | "mutuelle") {
    setBusy(type);
    const res = await fetch(`/api/me/insurance-card?type=${type}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusy(null);
    if (res.ok) {
      setMe((p) => ({
        ...p,
        ...(type === "cnam" ? { cnamCardUrl: null } : { insuranceCardUrl: null }),
      }));
      toast.success("Carte supprimée");
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-5 animate-pulse h-32" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Photo de profil */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Photo de profil</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
            {me?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.photoUrl} alt="Photo de profil" className="w-full h-full object-cover" />
            ) : (
              <Camera className="h-7 w-7 text-primary/40" />
            )}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={photoInput}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPhoto(f);
                e.target.value = "";
              }}
              className="hidden"
            />
            <button
              onClick={() => photoInput.current?.click()}
              disabled={busy === "photo"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-semibold px-4 py-2 hover:bg-doktori-teal-dark disabled:opacity-50 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              {me?.photoUrl ? "Changer la photo" : "Téléverser"}
            </button>
            {me?.photoUrl && (
              <button
                onClick={deletePhoto}
                disabled={busy === "photo"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-red-200 text-red-600 text-sm font-medium px-4 py-2 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-foreground/50 mt-3">JPG, PNG ou WebP · 5 Mo max</p>
      </section>

      {/* Cartes d'assurance */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileImage className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Cartes d&apos;assurance</h2>
        </div>
        <p className="text-xs text-foreground/60 mb-4">
          Téléversez vos cartes pour faciliter la prise en charge. Stockage chiffré, accès limité.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CardSlot
            label="Carte CNAM"
            url={me?.cnamCardUrl ?? null}
            busy={busy === "cnam"}
            inputRef={cnamInput}
            onUpload={(f) => uploadCard(f, "cnam")}
            onDelete={() => deleteCard("cnam")}
          />
          <CardSlot
            label="Carte mutuelle"
            url={me?.insuranceCardUrl ?? null}
            busy={busy === "mutuelle"}
            inputRef={insuranceInput}
            onUpload={(f) => uploadCard(f, "mutuelle")}
            onDelete={() => deleteCard("mutuelle")}
          />
        </div>
      </section>
    </div>
  );
}

function CardSlot({
  label,
  url,
  busy,
  inputRef,
  onUpload,
  onDelete,
}: {
  label: string;
  url: string | null;
  busy: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (f: File) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {url && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            <Check className="h-3 w-3" /> ENREGISTRÉE
          </span>
        )}
      </div>
      {url ? (
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg px-3 py-1.5 transition-colors"
          >
            Voir
          </a>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center justify-center text-xs font-medium text-foreground border border-border bg-white hover:bg-secondary rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            Remplacer
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            aria-label="Supprimer"
            className="inline-flex items-center justify-center w-8 h-8 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold px-3 py-2 transition-colors disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          Téléverser
        </button>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        ref={inputRef}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
