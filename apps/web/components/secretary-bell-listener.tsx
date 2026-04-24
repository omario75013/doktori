"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell as BellIcon, Check, Send } from "lucide-react";
import { osNotify } from "@/lib/os-notify";

type Bell = {
  id: string;
  label: string;
  message: string | null;
  icon: string | null;
  sound: string | null;
  createdAt: string;
};

// Short beep via Web Audio API — avoids needing an audio asset
function playBeep() {
  try {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* ignore */
  }
}

export function SecretaryBellListener() {
  const [bell, setBell] = useState<Bell | null>(null);
  const [ack, setAck] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/secretary/bells/pending", { cache: "no-store" });
      if (!res.ok) return;
      const rows: Bell[] = await res.json();
      if (rows.length === 0) return;
      // Show the newest bell we haven't already displayed
      const next = rows.find((b) => !seenRef.current.has(b.id));
      if (next) {
        seenRef.current.add(next.id);
        setBell(next);
        setAck(false);
        playBeep();
        setTimeout(playBeep, 600);
        if ("vibrate" in navigator) navigator.vibrate?.(200);
        osNotify({
          title: `🔔 ${next.label}`,
          body: next.message ?? "Le médecin vous sollicite",
        });
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [poll]);

  async function acknowledge(message: string | null) {
    if (!bell) return;
    setAck(true);
    try {
      await fetch(`/api/secretary/bells/${bell.id}/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
    } catch {
      /* ignore */
    }
    setBell(null);
  }

  if (!bell) return null;
  return <BellModal bell={bell} ack={ack} onAcknowledge={acknowledge} />;
}

const QUICK_REPLIES = [
  "J'arrive tout de suite",
  "J'arrive dans 2 minutes",
  "Je suis avec un patient, j'arrive",
  "Noté, merci",
  "Vu — j'arrive",
];

function BellModal({
  bell,
  ack,
  onAcknowledge,
}: {
  bell: Bell;
  ack: boolean;
  onAcknowledge: (message: string | null) => void;
}) {
  const [custom, setCustom] = useState("");
  const [customMode, setCustomMode] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-6 space-y-4 border-4 border-primary animate-in zoom-in-95">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center animate-pulse">
            <BellIcon className="h-8 w-8" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">{bell.label}</h2>
          {bell.message && (
            <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{bell.message}</p>
          )}
          <p className="mt-2 text-[10px] text-gray-400">
            Du médecin · {new Date(bell.createdAt).toLocaleTimeString("fr-FR")}
          </p>
        </div>

        {customMode ? (
          <div className="space-y-2">
            <textarea
              rows={2}
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Tapez votre réponse…"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                disabled={ack}
                className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => onAcknowledge(custom.trim() || null)}
                disabled={ack}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Envoyer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_REPLIES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onAcknowledge(r)}
                  disabled={ack}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
                >
                  <Check className="h-4 w-4 text-primary" />
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              disabled={ack}
              className="w-full text-xs text-primary hover:underline pt-1"
            >
              Écrire une réponse personnalisée…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
