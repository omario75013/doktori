"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Wifi, Clock, Check, X, AlertTriangle } from "lucide-react";

type Props = {
  scheduledAt: string | Date | null;
  onReady: () => void;
};

type CamStatus = "idle" | "checking" | "ok" | "error";
type NetStatus = "idle" | "checking" | "ok" | "slow" | "error";

const TIPS = [
  "Bon éclairage (face à une fenêtre)",
  "Endroit calme, sans bruit de fond",
  "Carte CNAM à portée",
  "Connexion Wi-Fi stable",
];

export default function PreCallCheck({ scheduledAt, onReady }: Props) {
  const [camStatus, setCamStatus] = useState<CamStatus>("idle");
  const [micStatus, setMicStatus] = useState<CamStatus>("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [netStatus, setNetStatus] = useState<NetStatus>("idle");
  const [netLatencyMs, setNetLatencyMs] = useState<number | null>(null);
  const [tipsChecked, setTipsChecked] = useState<boolean[]>(TIPS.map(() => false));
  const [now, setNow] = useState(Date.now());

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animRef = useRef<number | null>(null);

  // Tick clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (animRef.current) cancelAnimationFrame(animRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  async function testCameraAndMic() {
    setCamStatus("checking");
    setMicStatus("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamStatus("ok");
      setMicStatus("ok");

      // Audio level meter
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.error("[precall] camera/mic error", e);
      setCamStatus("error");
      setMicStatus("error");
    }
  }

  async function testNetwork() {
    setNetStatus("checking");
    try {
      const start = performance.now();
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error("status " + res.status);
      const latency = Math.round(performance.now() - start);
      setNetLatencyMs(latency);
      setNetStatus(latency < 500 ? "ok" : "slow");
    } catch {
      setNetStatus("error");
    }
  }

  // Countdown
  const targetMs = scheduledAt ? new Date(scheduledAt).getTime() : null;
  const diffSec = targetMs ? Math.floor((targetMs - now) / 1000) : null;
  const absSec = diffSec != null ? Math.abs(diffSec) : 0;
  const cdH = Math.floor(absSec / 3600);
  const cdM = Math.floor((absSec % 3600) / 60);
  const cdS = absSec % 60;
  const inWindow = diffSec != null && Math.abs(diffSec) <= 120;

  const allTestsOk = camStatus === "ok" && micStatus === "ok" && (netStatus === "ok" || netStatus === "slow");
  const canJoin = allTestsOk && (inWindow || diffSec == null);

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-gray-800 p-6 text-white shadow-2xl sm:p-8">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
            <Clock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Salle d&apos;attente virtuelle</h1>
          <p className="mt-1 text-sm text-gray-300">
            Vérifions ensemble que tout fonctionne avant la consultation.
          </p>
        </header>

        {/* Countdown */}
        {diffSec != null && (
          <div className="mb-6 rounded-xl bg-gray-900/50 px-5 py-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {diffSec > 0 ? "Consultation dans" : "Consultation prévue il y a"}
            </div>
            <div className="mt-1 font-mono text-3xl font-black text-primary">
              {cdH > 0 && `${String(cdH).padStart(2, "0")}:`}
              {String(cdM).padStart(2, "0")}:{String(cdS).padStart(2, "0")}
            </div>
            {!inWindow && diffSec > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Le bouton sera activé 2 minutes avant l&apos;heure prévue.
              </p>
            )}
          </div>
        )}

        {/* Camera preview + test */}
        <section className="mb-5 rounded-xl bg-gray-900/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <span className="font-bold">Caméra</span>
              <StatusPill status={camStatus} />
            </div>
            <button
              type="button"
              onClick={testCameraAndMic}
              disabled={camStatus === "checking"}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold hover:bg-doktori-teal-dark disabled:opacity-50"
            >
              {camStatus === "ok" ? "Refaire le test" : "Tester"}
            </button>
          </div>
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          </div>
        </section>

        {/* Mic level */}
        <section className="mb-5 rounded-xl bg-gray-900/40 p-4">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <span className="font-bold">Microphone</span>
            <StatusPill status={micStatus} />
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full bg-gradient-to-r from-doktori-green-dark via-yellow-400 to-red-500 transition-all"
              style={{ width: `${micStatus === "ok" ? micLevel : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {micStatus === "ok"
              ? "Parlez pour voir le niveau du micro réagir."
              : "Lancez le test pour activer le micro."}
          </p>
        </section>

        {/* Network */}
        <section className="mb-5 rounded-xl bg-gray-900/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              <span className="font-bold">Connexion réseau</span>
              <StatusPill status={netStatus} />
            </div>
            <button
              type="button"
              onClick={testNetwork}
              disabled={netStatus === "checking"}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold hover:bg-doktori-teal-dark disabled:opacity-50"
            >
              Tester
            </button>
          </div>
          {netLatencyMs != null && (
            <p className="mt-2 text-xs text-gray-400">Latence : {netLatencyMs} ms</p>
          )}
        </section>

        {/* Tips checklist */}
        <section className="mb-6 rounded-xl bg-gray-900/40 p-4">
          <p className="mb-3 font-bold">Avant de rejoindre</p>
          <ul className="space-y-2">
            {TIPS.map((tip, i) => (
              <li key={tip} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`tip-${i}`}
                  checked={tipsChecked[i]}
                  onChange={(e) => {
                    const next = [...tipsChecked];
                    next[i] = e.target.checked;
                    setTipsChecked(next);
                  }}
                  className="h-4 w-4 accent-primary"
                />
                <label htmlFor={`tip-${i}`} className="text-sm text-gray-200">
                  {tip}
                </label>
              </li>
            ))}
          </ul>
        </section>

        {/* Network warning */}
        {netStatus === "slow" && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <p className="text-xs text-yellow-200">
              Connexion lente détectée — la qualité vidéo peut être réduite.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onReady}
          disabled={!canJoin}
          className="w-full rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:bg-doktori-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canJoin
            ? "Rejoindre la consultation"
            : !allTestsOk
            ? "Effectuez d'abord les tests"
            : "Disponible 2 min avant le RDV"}
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: CamStatus | NetStatus }) {
  if (status === "ok")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-doktori-green-dark/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
        <Check className="h-3 w-3" /> OK
      </span>
    );
  if (status === "slow")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
        Lente
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
        <X className="h-3 w-3" /> Erreur
      </span>
    );
  if (status === "checking")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
        Test...
      </span>
    );
  return null;
}
