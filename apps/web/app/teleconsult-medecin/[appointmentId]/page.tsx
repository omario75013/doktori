"use client";

import { use, useEffect, useState, useRef } from "react";
import { Video, PhoneOff, Clock, ExternalLink } from "lucide-react";

type TeleconsultData = {
  roomName: string;
  roomUrl: string;
  startedAt: string | null;
  endedAt: string | null;
};

export default function MedecinTeleconsultPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = use(params);
  const [data, setData] = useState<TeleconsultData | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const startRef = useRef(Date.now());

  // Fetch room data
  useEffect(() => {
    fetch(`/api/teleconsult/${appointmentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setData(d))
      .catch(() =>
        setError(
          "Téléconsultation introuvable. Vérifiez que la salle a bien été créée."
        )
      );
  }, [appointmentId]);

  // Running timer
  useEffect(() => {
    if (!data || ended) return;
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [data, ended]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  async function handleEnd() {
    setCompleting(true);
    try {
      await fetch(`/api/teleconsult/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
    } catch {
      // Non-blocking — just mark locally
    } finally {
      setCompleting(false);
      setEnded(true);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Video className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="font-medium text-red-400 mb-2">Erreur</p>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold">Consultation terminée</h1>
          <p className="text-gray-400">
            Durée : {String(mins).padStart(2, "0")}min{" "}
            {String(secs).padStart(2, "0")}s
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Retour au tableau de bord
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-pulse">
            <Video className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          </div>
          <p className="text-gray-300">Chargement de la salle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <Video className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-white font-medium text-sm">
              Téléconsultation
            </span>
            <span className="ml-2 text-gray-400 text-xs hidden sm:inline">
              — {data.roomName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="w-4 h-4" strokeWidth={2.5} />
          <span className="font-mono text-sm">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={data.roomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-gray-300 hover:text-white text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" strokeWidth={2.5} />
            Nouvel onglet
          </a>
          <button
            onClick={handleEnd}
            disabled={completing}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PhoneOff className="w-4 h-4" strokeWidth={2.5} />
            {completing ? "Fermeture..." : "Terminer la consultation"}
          </button>
        </div>
      </div>

      {/* Jitsi iframe */}
      <iframe
        src={data.roomUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="flex-1 border-0 w-full"
      />
    </div>
  );
}
