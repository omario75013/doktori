"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Save, Type } from "lucide-react";

// Generates a signature by rendering the doctor's name in a curated
// list of handwriting fonts. The doctor types their name, picks a
// style, and we rasterize it to a transparent PNG that goes through
// the same /api/doctor/signature upload path as the other two modes.

type FontChoice = {
  id: string;
  family: string;
  // Loaded via Google Fonts; the link tag below covers all of them.
  size: number;
};

const FONTS: FontChoice[] = [
  { id: "caveat", family: "Caveat", size: 64 },
  { id: "sacramento", family: "Sacramento", size: 64 },
  { id: "great-vibes", family: "Great Vibes", size: 62 },
  { id: "dancing", family: "Dancing Script", size: 60 },
  { id: "allura", family: "Allura", size: 64 },
  { id: "homemade", family: "Homemade Apple", size: 44 },
  { id: "kalam", family: "Kalam", size: 50 },
  { id: "pacifico", family: "Pacifico", size: 54 },
];

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Caveat:wght@500;700",
    "family=Sacramento",
    "family=Great+Vibes",
    "family=Dancing+Script:wght@600;700",
    "family=Allura",
    "family=Homemade+Apple",
    "family=Kalam:wght@500;700",
    "family=Pacifico",
  ].join("&") +
  "&display=swap";

const FONTS_LINK_ID = "doktori-signature-fonts";

function ensureFontsLoaded() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONTS_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONTS_LINK_ID;
  link.rel = "stylesheet";
  link.href = GOOGLE_FONTS_HREF;
  document.head.appendChild(link);
}

export function SignatureGallery({
  defaultName,
  onSaved,
  onCancel,
  saveLabel,
  cancelLabel,
  namePlaceholder,
  helperText,
  emptyHint,
  inkColor = "#0F172A",
}: {
  defaultName: string;
  onSaved: (signatureUrl: string) => void;
  onCancel: () => void;
  saveLabel: string;
  cancelLabel: string;
  namePlaceholder: string;
  helperText: string;
  emptyHint: string;
  inkColor?: string;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [pickedId, setPickedId] = useState<string>(FONTS[0].id);
  const [saving, setSaving] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    ensureFontsLoaded();
    // Wait for the FontFaceSet to report ready so the preview tiles
    // don't flash in fallback typeface. document.fonts.ready resolves
    // once *all* faces currently being loaded are done.
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => setFontsReady(true)).catch(() => setFontsReady(true));
    } else {
      setFontsReady(true);
    }
  }, []);

  const picked = useMemo(() => FONTS.find((f) => f.id === pickedId) ?? FONTS[0], [pickedId]);

  async function save() {
    const value = name.trim();
    if (!value) return;
    setSaving(true);
    try {
      // Rasterize to PNG at 2× for crisp print output.
      const scale = 2;
      const width = 520;
      const height = 160;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas non disponible");
      ctx.scale(scale, scale);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = inkColor;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      // Auto-shrink font if the rendered string is wider than the box.
      let fontSize = picked.size;
      const family = `"${picked.family}", cursive`;
      ctx.font = `${fontSize}px ${family}`;
      while (ctx.measureText(value).width > width - 40 && fontSize > 24) {
        fontSize -= 2;
        ctx.font = `${fontSize}px ${family}`;
      }
      ctx.fillText(value, width / 2, height / 2);

      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/png"),
      );
      if (!blob) throw new Error("Export PNG impossible");
      const fd = new FormData();
      fd.append("file", new File([blob], "signature.png", { type: "image/png" }));
      const r = await fetch("/api/doctor/signature", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.signatureUrl) {
        throw new Error(data.error ?? "Erreur d'envoi");
      }
      onSaved(data.signatureUrl);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{helperText}</p>

      <div className="relative">
        <Type className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={namePlaceholder}
          className="w-full rounded-xl border border-border bg-white py-2.5 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {!name.trim() ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-8 text-center text-xs text-gray-500">
          {emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FONTS.map((f) => {
            const active = f.id === pickedId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setPickedId(f.id)}
                className={`group relative rounded-xl border bg-white px-4 py-5 text-center transition-colors ${
                  active
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
                style={{ minHeight: 84 }}
              >
                <span
                  style={{
                    fontFamily: `"${f.family}", cursive`,
                    fontSize: Math.min(f.size, 40),
                    color: inkColor,
                    lineHeight: 1.1,
                    display: "inline-block",
                    visibility: fontsReady ? "visible" : "hidden",
                  }}
                >
                  {name.trim()}
                </span>
                <span className="absolute bottom-1 inline-end-2 text-[10px] uppercase tracking-wide text-gray-300">
                  {f.family}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white hover:bg-secondary text-gray-700 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!name.trim() || saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
