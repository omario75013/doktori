"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Save, Type } from "lucide-react";

// Generates a signature by rendering the doctor's name in a curated
// list of handwriting fonts. The doctor types their name, picks a
// style, and we rasterize the chosen tile to a transparent PNG that
// goes through the same /api/doctor/signature upload path as the
// other two modes.
//
// To reach 200+ visual choices without loading 200 separate font
// families (each Google Font costs an HTTP request + paint), we list
// ~90 real handwriting/script Google Fonts and multiply each by three
// style variants — regular, italic, bold. The browser synthesizes
// italic/bold for faces that don't ship those weights, which is more
// than good enough for a signature preview.

type BaseFont = { id: string; family: string; size: number };
type Variant = { id: string; label: string; fontStyle: string; fontWeight: number };
type FontChoice = BaseFont & {
  variantId: string;
  variantLabel: string;
  fontStyle: string;
  fontWeight: number;
  key: string;
};

// 90+ handwriting / script Google Fonts. All are confirmed present
// on fonts.google.com under the Handwriting category.
const BASE_FONTS: BaseFont[] = [
  { id: "caveat", family: "Caveat", size: 56 },
  { id: "sacramento", family: "Sacramento", size: 56 },
  { id: "great-vibes", family: "Great Vibes", size: 54 },
  { id: "dancing-script", family: "Dancing Script", size: 52 },
  { id: "allura", family: "Allura", size: 56 },
  { id: "homemade-apple", family: "Homemade Apple", size: 38 },
  { id: "kalam", family: "Kalam", size: 42 },
  { id: "pacifico", family: "Pacifico", size: 46 },
  { id: "satisfy", family: "Satisfy", size: 50 },
  { id: "parisienne", family: "Parisienne", size: 54 },
  { id: "alex-brush", family: "Alex Brush", size: 56 },
  { id: "tangerine", family: "Tangerine", size: 68 },
  { id: "yellowtail", family: "Yellowtail", size: 48 },
  { id: "kaushan-script", family: "Kaushan Script", size: 46 },
  { id: "cookie", family: "Cookie", size: 52 },
  { id: "mr-dafoe", family: "Mr Dafoe", size: 56 },
  { id: "marck-script", family: "Marck Script", size: 50 },
  { id: "rouge-script", family: "Rouge Script", size: 54 },
  { id: "pinyon-script", family: "Pinyon Script", size: 56 },
  { id: "italianno", family: "Italianno", size: 62 },
  { id: "herr-von-muellerhoff", family: "Herr Von Muellerhoff", size: 60 },
  { id: "league-script", family: "League Script", size: 52 },
  { id: "meddon", family: "Meddon", size: 38 },
  { id: "monsieur-la-doulaise", family: "Monsieur La Doulaise", size: 56 },
  { id: "bad-script", family: "Bad Script", size: 44 },
  { id: "berkshire-swash", family: "Berkshire Swash", size: 46 },
  { id: "cedarville-cursive", family: "Cedarville Cursive", size: 40 },
  { id: "clicker-script", family: "Clicker Script", size: 50 },
  { id: "courgette", family: "Courgette", size: 46 },
  { id: "damion", family: "Damion", size: 46 },
  { id: "dawning-of-a-new-day", family: "Dawning of a New Day", size: 44 },
  { id: "devonshire", family: "Devonshire", size: 56 },
  { id: "engagement", family: "Engagement", size: 50 },
  { id: "ephesis", family: "Ephesis", size: 52 },
  { id: "euphoria-script", family: "Euphoria Script", size: 52 },
  { id: "felipa", family: "Felipa", size: 48 },
  { id: "fondamento", family: "Fondamento", size: 44 },
  { id: "give-you-glory", family: "Give You Glory", size: 38 },
  { id: "gochi-hand", family: "Gochi Hand", size: 42 },
  { id: "grand-hotel", family: "Grand Hotel", size: 48 },
  { id: "handlee", family: "Handlee", size: 42 },
  { id: "hurricane", family: "Hurricane", size: 54 },
  { id: "imperial-script", family: "Imperial Script", size: 54 },
  { id: "indie-flower", family: "Indie Flower", size: 42 },
  { id: "inspiration", family: "Inspiration", size: 54 },
  { id: "just-another-hand", family: "Just Another Hand", size: 50 },
  { id: "just-me-again-down-here", family: "Just Me Again Down Here", size: 44 },
  { id: "kavivanar", family: "Kavivanar", size: 42 },
  { id: "kristi", family: "Kristi", size: 50 },
  { id: "la-belle-aurore", family: "La Belle Aurore", size: 42 },
  { id: "lavishly-yours", family: "Lavishly Yours", size: 56 },
  { id: "loved-by-the-king", family: "Loved by the King", size: 44 },
  { id: "lovers-quarrel", family: "Lovers Quarrel", size: 52 },
  { id: "mea-culpa", family: "Mea Culpa", size: 54 },
  { id: "miniver", family: "Miniver", size: 46 },
  { id: "miss-fajardose", family: "Miss Fajardose", size: 58 },
  { id: "mr-bedfort", family: "Mr Bedfort", size: 54 },
  { id: "mr-de-haviland", family: "Mr De Haviland", size: 56 },
  { id: "mrs-saint-delafield", family: "Mrs Saint Delafield", size: 54 },
  { id: "mrs-sheppards", family: "Mrs Sheppards", size: 50 },
  { id: "ms-madi", family: "Ms Madi", size: 54 },
  { id: "nanum-pen-script", family: "Nanum Pen Script", size: 42 },
  { id: "niconne", family: "Niconne", size: 48 },
  { id: "norican", family: "Norican", size: 46 },
  { id: "nothing-you-could-do", family: "Nothing You Could Do", size: 40 },
  { id: "over-the-rainbow", family: "Over the Rainbow", size: 42 },
  { id: "oooh-baby", family: "Oooh Baby", size: 56 },
  { id: "pangolin", family: "Pangolin", size: 42 },
  { id: "patrick-hand", family: "Patrick Hand", size: 42 },
  { id: "petit-formal-script", family: "Petit Formal Script", size: 46 },
  { id: "playball", family: "Playball", size: 46 },
  { id: "princess-sofia", family: "Princess Sofia", size: 52 },
  { id: "qwigley", family: "Qwigley", size: 56 },
  { id: "reenie-beanie", family: "Reenie Beanie", size: 44 },
  { id: "rochester", family: "Rochester", size: 50 },
  { id: "ruge-boogie", family: "Ruge Boogie", size: 54 },
  { id: "sail", family: "Sail", size: 46 },
  { id: "sansita-swashed", family: "Sansita Swashed", size: 42 },
  { id: "sedgwick-ave", family: "Sedgwick Ave", size: 42 },
  { id: "shadows-into-light", family: "Shadows Into Light", size: 42 },
  { id: "smooch", family: "Smooch", size: 54 },
  { id: "sofia", family: "Sofia", size: 46 },
  { id: "square-peg", family: "Square Peg", size: 50 },
  { id: "stalemate", family: "Stalemate", size: 48 },
  { id: "style-script", family: "Style Script", size: 54 },
  { id: "sunshiney", family: "Sunshiney", size: 42 },
  { id: "swanky-and-moo-moo", family: "Swanky and Moo Moo", size: 46 },
  { id: "the-nautigal", family: "The Nautigal", size: 54 },
  { id: "twinkle-star", family: "Twinkle Star", size: 42 },
  { id: "updock", family: "Updock", size: 50 },
  { id: "waterfall", family: "Waterfall", size: 54 },
  { id: "whisper", family: "Whisper", size: 54 },
  { id: "yesteryear", family: "Yesteryear", size: 46 },
  { id: "zeyada", family: "Zeyada", size: 42 },
  { id: "architects-daughter", family: "Architects Daughter", size: 42 },
  { id: "beau-rivage", family: "Beau Rivage", size: 50 },
  { id: "birthstone", family: "Birthstone", size: 56 },
  { id: "birthstone-bounce", family: "Birthstone Bounce", size: 54 },
  { id: "bonheur-royale", family: "Bonheur Royale", size: 50 },
  { id: "caveat-brush", family: "Caveat Brush", size: 48 },
  { id: "comforter", family: "Comforter", size: 50 },
  { id: "comforter-brush", family: "Comforter Brush", size: 48 },
  { id: "estonia", family: "Estonia", size: 50 },
  { id: "eyesome-script", family: "Eyesome Script", size: 52 },
  { id: "fuzzy-bubbles", family: "Fuzzy Bubbles", size: 44 },
  { id: "gwendolyn", family: "Gwendolyn", size: 56 },
  { id: "kolker-brush", family: "Kolker Brush", size: 50 },
  { id: "mansalva", family: "Mansalva", size: 44 },
  { id: "moon-dance", family: "Moon Dance", size: 50 },
  { id: "montecarlo", family: "MonteCarlo", size: 50 },
  { id: "permanent-marker", family: "Permanent Marker", size: 44 },
  { id: "petemoss", family: "Petemoss", size: 50 },
  { id: "shalimar", family: "Shalimar", size: 56 },
  { id: "splash", family: "Splash", size: 50 },
  { id: "water-brush", family: "Water Brush", size: 50 },
  { id: "send-flowers", family: "Send Flowers", size: 50 },
];

const VARIANTS: Variant[] = [
  { id: "regular", label: "Regular", fontStyle: "normal", fontWeight: 400 },
  { id: "italic", label: "Italique", fontStyle: "italic", fontWeight: 400 },
  { id: "bold", label: "Gras", fontStyle: "normal", fontWeight: 700 },
];

const FONTS: FontChoice[] = BASE_FONTS.flatMap((f) =>
  VARIANTS.map((v) => ({
    ...f,
    variantId: v.id,
    variantLabel: v.label,
    fontStyle: v.fontStyle,
    fontWeight: v.fontWeight,
    key: `${f.id}--${v.id}`,
  })),
);

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  BASE_FONTS.map((f) => "family=" + f.family.replace(/ /g, "+")).join("&") +
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
  const [pickedKey, setPickedKey] = useState<string>(FONTS[0].key);
  const [saving, setSaving] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureFontsLoaded();
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready
        .then(() => setFontsReady(true))
        .catch(() => setFontsReady(true));
    } else {
      setFontsReady(true);
    }
  }, []);

  const picked = useMemo(
    () => FONTS.find((f) => f.key === pickedKey) ?? FONTS[0],
    [pickedKey],
  );

  async function save() {
    const value = name.trim();
    if (!value) return;
    setSaving(true);
    try {
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

      let fontSize = picked.size;
      const family = `"${picked.family}", cursive`;
      const buildFont = (px: number) =>
        `${picked.fontStyle} ${picked.fontWeight} ${px}px ${family}`;
      ctx.font = buildFont(fontSize);
      while (ctx.measureText(value).width > width - 40 && fontSize > 22) {
        fontSize -= 2;
        ctx.font = buildFont(fontSize);
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

  const hasName = name.trim().length > 0;

  return (
    <div className="space-y-3 min-w-0">
      <p className="text-xs text-gray-500">{helperText}</p>

      <div className="relative">
        <Type className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={namePlaceholder}
          className="w-full rounded-xl border border-border bg-white py-2.5 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {!hasName ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-8 text-center text-xs text-gray-500">
          {emptyHint}
        </div>
      ) : (
        <>
          <p className="text-[11px] text-gray-400">
            {FONTS.length} styles disponibles
          </p>
          <div
            ref={scrollRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[460px] overflow-y-auto overflow-x-hidden pe-1 -me-1"
          >
            {FONTS.map((f) => {
              const active = f.key === pickedKey;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setPickedKey(f.key)}
                  className={`group relative flex items-center justify-center rounded-xl border bg-white px-3 py-4 text-center transition-colors overflow-hidden min-w-0 ${
                    active
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{ minHeight: 88 }}
                  title={`${f.family} — ${f.variantLabel}`}
                >
                  <span
                    className="block max-w-full truncate"
                    style={{
                      fontFamily: `"${f.family}", cursive`,
                      fontStyle: f.fontStyle,
                      fontWeight: f.fontWeight,
                      fontSize: Math.min(f.size * 0.6, 32),
                      color: inkColor,
                      lineHeight: 1.1,
                      visibility: fontsReady ? "visible" : "hidden",
                    }}
                  >
                    {name.trim()}
                  </span>
                  <span className="absolute bottom-1 end-2 text-[9px] uppercase tracking-wide text-gray-300 truncate max-w-[80%]">
                    {f.family}
                    {f.variantId !== "regular" ? " · " + f.variantLabel : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </>
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
          disabled={!hasName || saving}
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
