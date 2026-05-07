/**
 * Admin UI — homepage visual content.
 *
 * Lets a super_admin swap the 4 homepage images (hero + 3 how-it-works steps)
 * via R2 upload and edit the testimonials JSON via a textarea with a live
 * structure example. Mutations go through:
 *   - POST /api/admin/visuals/upload   (multipart, image keys only)
 *   - POST /api/admin/visuals          (JSON body, used for testimonials)
 *
 * Both endpoints audit-log every mutation and invalidate the settings cache
 * so the homepage picks up changes within ~60s.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ImageIcon, Loader2, Save, Upload } from "lucide-react";

interface VisualSetting {
  key: string;
  label: string;
  description: string | null;
  value: string;
  defaultValue: string;
  updatedAt: string | null;
}

interface VisualsResponse {
  settings: VisualSetting[];
}

const TESTIMONIALS_KEY = "homepage.testimonials";

const TESTIMONIALS_EXAMPLE = JSON.stringify(
  [
    {
      name: "Asma B.",
      city: "Tunis",
      specialty: "Dermatologue",
      photoUrl: "/images/defaults/testimonial-placeholder.webp",
      quote: "RDV pris en 2 minutes. Service sérieux.",
      rating: 5,
    },
  ],
  null,
  2
);

export default function AdminVisualsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<VisualSetting[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/visuals");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: VisualsResponse = await res.json();
      setSettings(data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function flashSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  }

  if (loading) {
    return (
      <div className="p-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  const imageSettings = settings.filter((s) => s.key !== TESTIMONIALS_KEY);
  const testimonialsSetting = settings.find((s) => s.key === TESTIMONIALS_KEY);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Visuels homepage
          </h1>
          <p className="mt-1 text-slate-500">
            Image hero, illustrations « Comment ça marche », et témoignages
            patients. Modifications appliquées sous 60 secondes.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Image slots */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Images</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {imageSettings.map((s) => (
            <ImageSlot
              key={s.key}
              setting={s}
              onUploaded={(updated) => {
                setSettings((curr) =>
                  curr.map((c) => (c.key === updated.key ? updated : c))
                );
                flashSuccess(`Image « ${s.label} » mise à jour.`);
              }}
              onError={(msg) => setError(msg)}
            />
          ))}
        </div>
      </section>

      {/* Testimonials JSON */}
      {testimonialsSetting && (
        <TestimonialsEditor
          setting={testimonialsSetting}
          onSaved={(updated) => {
            setSettings((curr) =>
              curr.map((c) => (c.key === updated.key ? updated : c))
            );
            flashSuccess("Témoignages mis à jour.");
          }}
          onError={(msg) => setError(msg)}
          example={TESTIMONIALS_EXAMPLE}
        />
      )}
    </div>
  );
}

function ImageSlot({
  setting,
  onUploaded,
  onError,
}: {
  setting: VisualSetting;
  onUploaded: (updated: VisualSetting) => void;
  onError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Optimistic preview — flips to the uploaded URL on success.
  const [previewUrl, setPreviewUrl] = useState(setting.value);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      onError("Fichier trop volumineux (max 5 Mo).");
      return;
    }
    setUploading(true);
    const tempPreview = URL.createObjectURL(file);
    setPreviewUrl(tempPreview);
    try {
      const fd = new FormData();
      fd.set("key", setting.key);
      fd.set("file", file);
      const res = await fetch("/api/admin/visuals/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.error === "string" ? data.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setPreviewUrl(data.url);
      onUploaded({
        ...setting,
        value: data.url,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      // Roll back preview on error
      setPreviewUrl(setting.value);
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      URL.revokeObjectURL(tempPreview);
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2">
        <p className="text-sm font-semibold text-slate-900">{setting.label}</p>
        {setting.description && (
          <p className="mt-0.5 text-xs text-slate-500">{setting.description}</p>
        )}
      </div>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={setting.label}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-slate-400" title={setting.value}>
          {setting.value}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Téléverser
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = ""; // allow re-uploading the same file
          }}
        />
      </div>
    </div>
  );
}

function TestimonialsEditor({
  setting,
  onSaved,
  onError,
  example,
}: {
  setting: VisualSetting;
  onSaved: (updated: VisualSetting) => void;
  onError: (msg: string) => void;
  example: string;
}) {
  const [value, setValue] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [showExample, setShowExample] = useState(false);

  const dirty = useMemo(() => value !== setting.value, [value, setting.value]);

  // Client-side JSON validity check for the badge — server re-validates shape.
  const jsonState = useMemo(() => {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return { ok: false, msg: "Doit être un tableau JSON." };
      }
      return { ok: true, msg: `${parsed.length} témoignage(s) détecté(s)` };
    } catch (e) {
      return {
        ok: false,
        msg: e instanceof Error ? e.message : "JSON invalide",
      };
    }
  }, [value]);

  async function save() {
    if (!jsonState.ok) {
      onError(`JSON invalide : ${jsonState.msg}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/visuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setting.key, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.error === "object"
              ? JSON.stringify(data.error)
              : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      onSaved({
        ...setting,
        value,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{setting.label}</h2>
        {setting.description && (
          <p className="mt-0.5 text-sm text-slate-500">{setting.description}</p>
        )}
      </div>
      <details
        open={showExample}
        onToggle={(e) => setShowExample((e.target as HTMLDetailsElement).open)}
        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
      >
        <summary className="cursor-pointer font-medium text-slate-700">
          Voir un exemple de structure
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-slate-600">
          {example}
        </pre>
        <p className="mt-2 text-slate-500">
          Champs : <code>name</code>, <code>city</code>, <code>specialty</code>
          , <code>photoUrl</code>, <code>quote</code>, <code>rating</code>{" "}
          (entier 1-5). Seuls les 3 premiers témoignages sont affichés sur la
          homepage.
        </p>
      </details>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={20}
        spellCheck={false}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="flex items-center justify-between gap-3 text-xs">
        <span
          className={`rounded-full px-2 py-1 font-medium ${
            jsonState.ok
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {jsonState.ok ? "JSON valide" : "JSON invalide"} — {jsonState.msg}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty || !jsonState.ok}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Enregistrer
        </button>
      </div>
    </section>
  );
}
