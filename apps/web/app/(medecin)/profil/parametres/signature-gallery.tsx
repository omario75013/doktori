"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Save, Type } from "lucide-react";

// Builds a gallery of signature-style renderings of the doctor's name.
// Each tile is a script font + a hand-drawn flourish (underline, paraph
// loop, swoosh, wave, double-stroke …) + optional slant. The point is
// that every tile feels like a *signature*, not just a name typed in a
// fancy font — so each combination produces visibly different ink.
//
// We render previews in SVG (cheap, vectorial, scales fine for 200+
// tiles) and only spin up a canvas on save to rasterize the chosen
// combination at 2× for the PNG upload.

type BaseFont = {
  id: string;
  family: string;
  // Approximate cap height as a fraction of the SVG box height. Used so
  // each font sits on roughly the same baseline regardless of metrics.
  baselineRatio?: number;
};

type FlourishId =
  | "plain"
  | "underline"
  | "paraph"
  | "double"
  | "wave"
  | "swoosh"
  | "loop";

type Flourish = {
  id: FlourishId;
  label: string;
  /** When true, the text is drawn with an italic slant (signature feel). */
  slant?: boolean;
  /** Draw the decorator on a 2D canvas context. */
  draw: (ctx: CanvasRenderingContext2D, box: Box) => void;
};

type Box = {
  // The bounding box of the actual rendered text on the canvas.
  textLeft: number;
  textRight: number;
  baselineY: number;
  capTop: number;
  width: number;
  height: number;
  ink: string;
};

type Model = {
  key: string;
  font: BaseFont;
  flourish: Flourish;
};

// 32 distinct script / handwriting Google Fonts. Enough variety in
// slant, weight, and style that combined with 7 flourishes we end up
// with 224 visually different signature renderings.
const BASE_FONTS: BaseFont[] = [
  { id: "great-vibes", family: "Great Vibes" },
  { id: "allura", family: "Allura" },
  { id: "alex-brush", family: "Alex Brush" },
  { id: "italianno", family: "Italianno" },
  { id: "mr-dafoe", family: "Mr Dafoe" },
  { id: "pinyon-script", family: "Pinyon Script" },
  { id: "mr-de-haviland", family: "Mr De Haviland" },
  { id: "mrs-saint-delafield", family: "Mrs Saint Delafield" },
  { id: "monsieur-la-doulaise", family: "Monsieur La Doulaise" },
  { id: "herr-von-muellerhoff", family: "Herr Von Muellerhoff" },
  { id: "miss-fajardose", family: "Miss Fajardose" },
  { id: "mea-culpa", family: "Mea Culpa" },
  { id: "ms-madi", family: "Ms Madi" },
  { id: "sacramento", family: "Sacramento" },
  { id: "parisienne", family: "Parisienne" },
  { id: "tangerine", family: "Tangerine" },
  { id: "satisfy", family: "Satisfy" },
  { id: "kaushan-script", family: "Kaushan Script" },
  { id: "dancing-script", family: "Dancing Script" },
  { id: "yellowtail", family: "Yellowtail" },
  { id: "pacifico", family: "Pacifico" },
  { id: "homemade-apple", family: "Homemade Apple" },
  { id: "caveat", family: "Caveat" },
  { id: "kalam", family: "Kalam" },
  { id: "rouge-script", family: "Rouge Script" },
  { id: "league-script", family: "League Script" },
  { id: "petit-formal-script", family: "Petit Formal Script" },
  { id: "rochester", family: "Rochester" },
  { id: "norican", family: "Norican" },
  { id: "qwigley", family: "Qwigley" },
  { id: "marck-script", family: "Marck Script" },
  { id: "permanent-marker", family: "Permanent Marker" },
];

// Each flourish receives the bounding box of the just-drawn text and
// adds an "ink" stroke on top — the kind of mark a real person makes
// when finalizing a signature.
const FLOURISHES: Flourish[] = [
  {
    id: "plain",
    label: "Sobre",
    slant: true,
    draw: () => {},
  },
  {
    id: "underline",
    label: "Soulignée",
    slant: true,
    draw: (ctx, b) => {
      const y = b.baselineY + Math.max(6, b.height * 0.06);
      ctx.beginPath();
      ctx.lineWidth = Math.max(2, b.height * 0.025);
      ctx.lineCap = "round";
      ctx.strokeStyle = b.ink;
      ctx.moveTo(b.textLeft - 4, y);
      // Slight rise at the end so it doesn't look mechanical.
      ctx.quadraticCurveTo(
        (b.textLeft + b.textRight) / 2,
        y + 2,
        b.textRight + 4,
        y - 2,
      );
      ctx.stroke();
    },
  },
  {
    id: "paraph",
    label: "Avec paraphe",
    slant: true,
    draw: (ctx, b) => {
      // Classic "paraph" — long horizontal stroke that curls into a
      // loop at the end. Very common on French signatures.
      const y = b.baselineY + Math.max(8, b.height * 0.08);
      ctx.beginPath();
      ctx.lineWidth = Math.max(2, b.height * 0.022);
      ctx.lineCap = "round";
      ctx.strokeStyle = b.ink;
      ctx.moveTo(b.textLeft - 10, y - 4);
      ctx.bezierCurveTo(
        b.textLeft + b.width * 0.2,
        y + 6,
        b.textRight - b.width * 0.2,
        y - 6,
        b.textRight + 8,
        y,
      );
      // The loop.
      ctx.bezierCurveTo(
        b.textRight + 28,
        y + 12,
        b.textRight + 12,
        y - 18,
        b.textRight + 2,
        y - 6,
      );
      ctx.stroke();
    },
  },
  {
    id: "double",
    label: "Double trait",
    slant: true,
    draw: (ctx, b) => {
      const y1 = b.baselineY + Math.max(6, b.height * 0.06);
      const y2 = y1 + Math.max(3, b.height * 0.03);
      ctx.lineWidth = Math.max(1.4, b.height * 0.016);
      ctx.lineCap = "round";
      ctx.strokeStyle = b.ink;
      for (const yy of [y1, y2]) {
        ctx.beginPath();
        ctx.moveTo(b.textLeft - 6, yy);
        ctx.quadraticCurveTo(
          (b.textLeft + b.textRight) / 2,
          yy + 1.5,
          b.textRight + 6,
          yy - 1,
        );
        ctx.stroke();
      }
    },
  },
  {
    id: "wave",
    label: "Vague",
    slant: true,
    draw: (ctx, b) => {
      const y = b.baselineY + Math.max(8, b.height * 0.08);
      const amp = Math.max(3, b.height * 0.03);
      ctx.lineWidth = Math.max(2, b.height * 0.022);
      ctx.lineCap = "round";
      ctx.strokeStyle = b.ink;
      ctx.beginPath();
      ctx.moveTo(b.textLeft - 4, y);
      const segments = 6;
      const step = (b.textRight - b.textLeft + 8) / segments;
      for (let i = 0; i < segments; i++) {
        const x1 = b.textLeft - 4 + step * (i + 0.5);
        const x2 = b.textLeft - 4 + step * (i + 1);
        const dir = i % 2 === 0 ? -1 : 1;
        ctx.quadraticCurveTo(x1, y + amp * dir, x2, y);
      }
      ctx.stroke();
    },
  },
  {
    id: "swoosh",
    label: "Trait courbe",
    slant: true,
    draw: (ctx, b) => {
      // A single long bezier sweeping from under the start of the name
      // up past the end — the kind of stroke that finishes a signature
      // with a flick of the wrist.
      ctx.lineWidth = Math.max(2, b.height * 0.024);
      ctx.lineCap = "round";
      ctx.strokeStyle = b.ink;
      const yStart = b.baselineY + b.height * 0.1;
      const yEnd = b.baselineY - b.height * 0.05;
      ctx.beginPath();
      ctx.moveTo(b.textLeft - 14, yStart);
      ctx.bezierCurveTo(
        b.textLeft + b.width * 0.3,
        b.baselineY + b.height * 0.18,
        b.textRight - b.width * 0.1,
        b.baselineY - b.height * 0.12,
        b.textRight + 24,
        yEnd,
      );
      ctx.stroke();
    },
  },
  {
    id: "loop",
    label: "Boucle finale",
    slant: true,
    draw: (ctx, b) => {
      // Looped flourish at the end of the name, like crossing a T but
      // wrapping back around itself.
      ctx.lineWidth = Math.max(2, b.height * 0.024);
      ctx.lineCap = "round";
      ctx.strokeStyle = b.ink;
      const cx = b.textRight + 18;
      const cy = b.baselineY - b.height * 0.05;
      const r = Math.max(10, b.height * 0.12);
      ctx.beginPath();
      ctx.moveTo(b.textRight, b.baselineY);
      ctx.bezierCurveTo(
        b.textRight + 6,
        b.baselineY,
        cx - r,
        cy + r,
        cx,
        cy,
      );
      ctx.bezierCurveTo(cx + r, cy - r, cx - r, cy - r, cx - r * 0.4, cy + r * 0.4);
      ctx.stroke();
    },
  },
];

const MODELS: Model[] = BASE_FONTS.flatMap((font) =>
  FLOURISHES.map((flourish) => ({
    key: `${font.id}__${flourish.id}`,
    font,
    flourish,
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

// Render one model onto a canvas. Used for save (high-res) and could
// also drive thumbnails — we use SVG for thumbnails instead because
// rendering 200+ canvases simultaneously kills the page.
function renderToCanvas(
  model: Model,
  name: string,
  inkColor: string,
  width: number,
  height: number,
): HTMLCanvasElement {
  const scale = Math.min(window.devicePixelRatio || 1, 2.5);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = inkColor;

  // Fit the text inside (width - margin) by shrinking the font size.
  let fontSize = Math.floor(height * 0.55);
  const family = `"${model.font.family}", cursive`;
  const slant = model.flourish.slant ? "italic" : "normal";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let textWidth = 0;
  while (fontSize > 16) {
    ctx.font = `${slant} 400 ${fontSize}px ${family}`;
    textWidth = ctx.measureText(name).width;
    if (textWidth <= width - 60) break;
    fontSize -= 2;
  }
  const textLeft = (width - textWidth) / 2;
  const textRight = textLeft + textWidth;
  const baselineY = height * 0.62;
  const capTop = baselineY - fontSize * 0.72;
  ctx.fillText(name, textLeft, baselineY);

  model.flourish.draw(ctx, {
    textLeft,
    textRight,
    baselineY,
    capTop,
    width: textWidth,
    height,
    ink: inkColor,
  });

  return canvas;
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
  const [pickedKey, setPickedKey] = useState<string>(MODELS[0].key);
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
    () => MODELS.find((m) => m.key === pickedKey) ?? MODELS[0],
    [pickedKey],
  );

  async function save() {
    const value = name.trim();
    if (!value) return;
    setSaving(true);
    try {
      const canvas = renderToCanvas(picked, value, inkColor, 520, 160);
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
            {MODELS.length} modèles de signature
          </p>
          <div
            ref={scrollRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[520px] overflow-y-auto overflow-x-hidden pe-1 -me-1"
          >
            {MODELS.map((m) => (
              <SignatureTile
                key={m.key}
                model={m}
                name={name.trim()}
                inkColor={inkColor}
                fontsReady={fontsReady}
                active={m.key === pickedKey}
                onPick={() => setPickedKey(m.key)}
              />
            ))}
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

// Thumbnail. We render the text + flourish in SVG so the browser
// composites 200+ tiles cheaply (one paint, no canvas-per-tile cost).
function SignatureTile({
  model,
  name,
  inkColor,
  fontsReady,
  active,
  onPick,
}: {
  model: Model;
  name: string;
  inkColor: string;
  fontsReady: boolean;
  active: boolean;
  onPick: () => void;
}) {
  // SVG box: w=240, h=88 (preview).
  const W = 240;
  const H = 88;
  const family = `"${model.font.family}", cursive`;
  const slant = model.flourish.slant ? "italic" : "normal";
  // We don't have measureText in SVG, so approximate the text bbox
  // using the actual <text> element via a ref + getBBox after mount.
  const textRef = useRef<SVGTextElement | null>(null);
  const flourishRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    if (!textRef.current || !flourishRef.current || !fontsReady) return;
    const bbox = textRef.current.getBBox();
    const textLeft = bbox.x;
    const textRight = bbox.x + bbox.width;
    const baselineY = parseFloat(textRef.current.getAttribute("y") || "0");
    // Project the canvas-flourish draw onto an offscreen canvas, then
    // convert each subpath into an SVG <path> by tracing the same math.
    // Simpler: just rerun the flourish via a tiny canvas-to-svg shim
    // built per-tile. Cheap because each tile only fires once.
    const paths = traceFlourish(model.flourish, {
      textLeft,
      textRight,
      baselineY,
      capTop: bbox.y,
      width: bbox.width,
      height: H,
      ink: inkColor,
    });
    flourishRef.current.innerHTML = paths;
  }, [model, name, inkColor, fontsReady]);

  return (
    <button
      type="button"
      onClick={onPick}
      className={`group relative flex items-center justify-center rounded-xl border bg-white px-2 py-3 text-center transition-colors overflow-hidden min-w-0 ${
        active
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      }`}
      style={{ minHeight: 100 }}
      title={`${model.font.family} — ${model.flourish.label}`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ visibility: fontsReady ? "visible" : "hidden", maxWidth: "100%" }}
      >
        <text
          ref={textRef}
          x={W / 2}
          y={H * 0.6}
          textAnchor="middle"
          fontFamily={family}
          fontStyle={slant}
          fontSize={Math.min(H * 0.55, 38)}
          fill={inkColor}
        >
          {name}
        </text>
        <g ref={flourishRef} stroke={inkColor} fill="none" />
      </svg>
      <span className="absolute bottom-1 end-2 text-[9px] uppercase tracking-wide text-gray-300 truncate max-w-[80%]">
        {model.font.family} · {model.flourish.label}
      </span>
    </button>
  );
}

// Translates a canvas-based flourish into SVG path markup. We can't
// just reuse `draw()` directly because it talks to Canvas2D — so we
// build a tiny recorder that captures path commands and re-emits them
// as SVG.
function traceFlourish(flourish: Flourish, box: Box): string {
  const out: string[] = [];
  const state: {
    path: string;
    lineWidth: number;
    lineCap: CanvasLineCap;
    strokeStyle: string;
  } = { path: "", lineWidth: 2, lineCap: "round", strokeStyle: box.ink };
  const recorder = {
    get lineWidth() {
      return state.lineWidth;
    },
    set lineWidth(v: number) {
      state.lineWidth = v;
    },
    get lineCap() {
      return state.lineCap;
    },
    set lineCap(v: CanvasLineCap) {
      state.lineCap = v;
    },
    get strokeStyle() {
      return state.strokeStyle;
    },
    set strokeStyle(v: string) {
      state.strokeStyle = v;
    },
    beginPath() {
      state.path = "";
    },
    moveTo(x: number, y: number) {
      state.path += `M${x.toFixed(2)} ${y.toFixed(2)} `;
    },
    lineTo(x: number, y: number) {
      state.path += `L${x.toFixed(2)} ${y.toFixed(2)} `;
    },
    quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
      state.path += `Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} `;
    },
    bezierCurveTo(
      c1x: number,
      c1y: number,
      c2x: number,
      c2y: number,
      x: number,
      y: number,
    ) {
      state.path += `C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} `;
    },
    stroke() {
      if (!state.path) return;
      out.push(
        `<path d="${state.path.trim()}" stroke-width="${state.lineWidth.toFixed(2)}" stroke-linecap="round" />`,
      );
    },
  } as unknown as CanvasRenderingContext2D;
  flourish.draw(recorder, box);
  return out.join("");
}
