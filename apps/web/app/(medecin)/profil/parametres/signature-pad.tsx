"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Pencil, Save, Loader2 } from "lucide-react";

// Free-hand signature pad. Renders a canvas that captures mouse +
// touch input, smooths strokes with quadratic curves, and exports a
// PNG blob on save. The blob is POSTed to /api/doctor/signature via a
// multipart form so it reuses the same R2 upload + persistence path
// as the file-upload flow.
export function SignaturePad({
  onSaved,
  onCancel,
  saveLabel,
  clearLabel,
  cancelLabel,
  helperText,
  lineStyleLabel,
  lineStyleSolid,
  lineStyleDashed,
  lineStyleDotted,
  inkColor = "#0F172A",
}: {
  onSaved: (signatureUrl: string) => void;
  onCancel: () => void;
  saveLabel: string;
  clearLabel: string;
  cancelLabel: string;
  helperText: string;
  lineStyleLabel: string;
  lineStyleSolid: string;
  lineStyleDashed: string;
  lineStyleDotted: string;
  inkColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  // Line style applied to each new stroke. Continuous = solid; the
  // others use canvas setLineDash so existing strokes don't shift.
  const [lineStyle, setLineStyle] = useState<"solid" | "dashed" | "dotted">("solid");
  const lineStyleRef = useRef<"solid" | "dashed" | "dotted">("solid");
  useEffect(() => {
    lineStyleRef.current = lineStyle;
  }, [lineStyle]);

  // Size the canvas to its CSS box × devicePixelRatio so strokes stay
  // crisp on hi-DPI screens. Re-size on viewport resize too.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    function resize() {
      if (!canvas || !wrap) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(180 * dpr);
      canvas.style.width = rect.width + "px";
      canvas.style.height = "180px";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = 2.2;
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [inkColor]);

  function getPoint(e: PointerEvent | React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const pt = getPoint(e);
    lastPt.current = pt;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    // Single tap → small dot so dotting an "i" registers.
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = inkColor;
    ctx.fill();
    setEmpty(false);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastPt.current) return;
    const pt = getPoint(e);
    // Quadratic-curve smoothing between samples — gives a more natural
    // pen feel than straight lineTo segments.
    const mid = { x: (lastPt.current.x + pt.x) / 2, y: (lastPt.current.y + pt.y) / 2 };
    const style = lineStyleRef.current;
    if (style === "dashed") ctx.setLineDash([8, 5]);
    else if (style === "dotted") ctx.setLineDash([1, 4]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.quadraticCurveTo(lastPt.current.x, lastPt.current.y, mid.x, mid.y);
    ctx.stroke();
    lastPt.current = pt;
  }

  function onPointerUp() {
    drawing.current = false;
    lastPt.current = null;
  }

  function clear() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    // Reset the transform-aware clear (we scaled by DPR in resize).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.restore();
    setEmpty(true);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || empty) return;
    setSaving(true);
    try {
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 me-1">{lineStyleLabel}</span>
        {([
          { id: "solid", label: lineStyleSolid, preview: "border-t-[2px] border-solid" },
          { id: "dashed", label: lineStyleDashed, preview: "border-t-[2px] border-dashed" },
          { id: "dotted", label: lineStyleDotted, preview: "border-t-[2px] border-dotted" },
        ] as const).map((opt) => {
          const active = lineStyle === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLineStyle(opt.id)}
              className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                active
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-border hover:bg-secondary"
              }`}
            >
              <span
                className={`inline-block w-6 ${opt.preview}`}
                style={{ borderColor: active ? "#fff" : inkColor }}
              />
              {opt.label}
            </button>
          );
        })}
      </div>
      <div
        ref={wrapRef}
        className="rounded-2xl border border-border bg-white relative overflow-hidden"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
          className="block w-full cursor-crosshair"
        />
        {/* Centered guideline so the doctor knows where to write */}
        <div
          aria-hidden
          className="absolute inset-x-6 pointer-events-none"
          style={{ bottom: 36, height: 1, borderTop: "1px dashed #E5E7EB" }}
        />
        <div
          aria-hidden
          className="absolute pointer-events-none text-[10px] uppercase tracking-wider text-gray-300"
          style={{ left: 10, bottom: 8 }}
        >
          <Pencil className="w-3 h-3 inline me-1" />
          Signature
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={clear}
          disabled={empty || saving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white hover:bg-secondary text-gray-700 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Eraser className="h-4 w-4" />
          {clearLabel}
        </button>
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
          disabled={empty || saving}
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
