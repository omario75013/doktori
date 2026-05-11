"use client";

/**
 * Cabinet gallery uploader (doctor self-service).
 *
 * Drag&drop or click to upload up to 6 photos. Each upload is one POST to
 * /api/doctor/cabinet-gallery (multipart). Delete via DELETE ?index=N.
 *
 * Surfaces server-side errors verbatim (size, type, count limits) so the
 * doctor sees actionable feedback.
 */
import { useCallback, useRef, useState } from "react";
import { Building2, Loader2, Plus, Trash2, Upload } from "lucide-react";

const MAX_PHOTOS = 6;
const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function CabinetGalleryUploader({
  initialUrls,
}: {
  initialUrls: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_PHOTOS - urls.length;

  const uploadOne = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        setError(`« ${file.name} » dépasse 5 Mo.`);
        return null;
      }
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/doctor/cabinet-gallery", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.error === "string" ? data.error : `HTTP ${res.status}`;
        setError(msg);
        return null;
      }
      return data.urls as string[];
    },
    []
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const list = Array.from(files);
      if (list.length === 0) return;
      const slots = MAX_PHOTOS - urls.length;
      if (slots <= 0) {
        setError(`Limite de ${MAX_PHOTOS} photos atteinte.`);
        return;
      }
      const accepted = list.slice(0, slots);
      setBusy(true);
      try {
        let lastUrls: string[] | null = null;
        for (const file of accepted) {
          const next = await uploadOne(file);
          if (next) lastUrls = next;
          else break; // first error stops the batch
        }
        if (lastUrls) setUrls(lastUrls);
      } finally {
        setBusy(false);
      }
    },
    [urls.length, uploadOne]
  );

  async function handleDelete(index: number) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/doctor/cabinet-gallery?index=${index}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.error === "string" ? data.error : `HTTP ${res.status}`;
        setError(msg);
        return;
      }
      setUrls(data.urls ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ds-card p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Photos du cabinet
            </h2>
            <p className="text-xs text-gray-500">
              Jusqu&apos;à {MAX_PHOTOS} photos affichées sur votre fiche publique
              (jpeg, png, webp ; 5 Mo max chacune).
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-doktori-teal-dark">
          {urls.length} / {MAX_PHOTOS}
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {urls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-secondary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Photo cabinet ${i + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => handleDelete(i)}
              disabled={busy}
              aria-label={`Supprimer la photo ${i + 1}`}
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-red-600 opacity-0 shadow-sm ring-1 ring-red-200 transition-opacity hover:bg-red-50 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
            }}
            className={`flex aspect-video flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-xs font-semibold transition-colors ${
              dragOver
                ? "border-primary bg-secondary/60 text-primary"
                : "border-border bg-secondary/30 text-gray-500 hover:border-primary hover:text-primary"
            } disabled:opacity-50`}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="px-3 text-center leading-tight">
                  Glisser-déposer ou cliquer
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />

      {urls.length === 0 && remaining > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500">
          <Upload className="h-3 w-3" /> Aucune photo encore — ajoutez-en pour
          rassurer vos patients.
        </p>
      )}
    </section>
  );
}
