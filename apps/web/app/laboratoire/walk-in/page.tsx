"use client";

import { useState } from "react";
import { Search, Upload, UserPlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface PatientResult {
  id: string;
  name: string;
  phone: string;
}

const CATEGORIES = [
  { value: "analyse", label: "Analyse biologique" },
  { value: "imagerie", label: "Imagerie / Radio" },
  { value: "echographie", label: "Échographie" },
  { value: "autre", label: "Autre" },
];

export default function LaboratoireWalkInPage() {
  const t = useTranslations("laboratoire.walkIn");

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("analyse");
  const [doctorIds, setDoctorIds] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setPatients([]);
    setSelectedPatient(null);

    try {
      // TODO: POST /api/patients/search — endpoint may not exist yet
      const res = await fetch("/api/patients/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query.trim() }),
      });
      if (!res.ok) {
        setSearchError("Erreur lors de la recherche.");
        return;
      }
      const data = await res.json() as { patients: PatientResult[] };
      setPatients(data.patients ?? []);
    } catch {
      setSearchError("Erreur réseau. Réessayez.");
    } finally {
      setSearching(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !file) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", selectedPatient.id);
      formData.append("category", category);
      formData.append("note", note);
      // Convert comma-separated IDs to JSON array
      const ids = doctorIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      formData.append("sharedWithDoctorIds", JSON.stringify(ids));

      // TODO: /api/laboratoire/walk-in/results — endpoint will be created by another agent
      const res = await fetch("/api/laboratoire/walk-in/results", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setUploadError(data.error ?? "Erreur lors de l'envoi.");
        return;
      }

      setUploadSuccess(true);
      setFile(null);
      setNote("");
      setDoctorIds("");
      setSelectedPatient(null);
      setPatients([]);
      setQuery("");
    } catch {
      setUploadError("Erreur réseau. Réessayez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <UserPlus className="h-6 w-6" style={{ color: "#16A34A" }} strokeWidth={2.5} />
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recherchez un patient existant, puis téléversez ses résultats.
        </p>
      </div>

      {/* Step 1 — search */}
      <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-green-800">
          1 · Rechercher le patient
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 flex h-11 items-center rounded-xl border-2 border-border px-3 focus-within:border-green-500 bg-white">
            <Search className="mr-2 h-4 w-4 text-muted-foreground shrink-0" strokeWidth={2} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-full flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-all"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </form>

        {searchError && (
          <p className="text-sm text-red-600">{searchError}</p>
        )}

        {patients.length > 0 && (
          <ul className="space-y-1.5">
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(p)}
                  className={[
                    "w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm",
                    selectedPatient?.id === p.id
                      ? "border-green-500 bg-green-50"
                      : "border-border hover:border-green-300",
                  ].join(" ")}
                >
                  <span className="font-semibold text-foreground">{p.name}</span>
                  <span className="text-muted-foreground ml-2" dir="ltr">{p.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedPatient && (
          <div className="flex items-center gap-2 text-sm text-green-700 font-semibold">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Sélectionné : {selectedPatient.name}
          </div>
        )}
      </div>

      {/* Step 2 — upload */}
      {selectedPatient && (
        <form onSubmit={handleUpload} className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-green-800">
            2 · {t("uploadCta")}
          </p>

          {/* File */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Fichier résultat
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Catégorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-border bg-white px-3 text-sm text-foreground outline-none focus:border-green-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Share with doctors */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Partager avec (IDs médecins, séparés par virgule)
            </label>
            <input
              type="text"
              value={doctorIds}
              onChange={(e) => setDoctorIds(e.target.value)}
              placeholder="uuid1, uuid2, …"
              className="h-11 w-full rounded-xl border-2 border-border bg-white px-3 text-sm text-foreground outline-none focus:border-green-500 placeholder:text-muted-foreground/60"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Laissez vide pour ne pas partager immédiatement.
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Note (optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Commentaire…"
              className="w-full rounded-xl border-2 border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-green-500 resize-none"
            />
          </div>

          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          {uploadSuccess && (
            <p className="text-sm text-green-700 font-semibold">
              Résultats envoyés avec succès.
            </p>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
            ) : (
              <Upload className="h-4 w-4" strokeWidth={2.5} />
            )}
            {t("uploadCta")}
          </button>
        </form>
      )}
    </div>
  );
}
