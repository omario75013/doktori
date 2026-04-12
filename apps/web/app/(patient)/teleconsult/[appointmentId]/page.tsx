"use client";

import { use, useEffect, useState, useRef } from "react";
import { Video, PhoneOff, Clock } from "lucide-react";

export default function TeleconsultPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = use(params);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const startRef = useRef(Date.now());

  // Fetch room URL
  useEffect(() => {
    fetch(`/api/teleconsult/${appointmentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setRoomUrl(data.roomUrl))
      .catch(() => setError("Téléconsultation introuvable ou non activée."));
  }, [appointmentId]);

  // Running timer
  useEffect(() => {
    if (!roomUrl || ended) return;
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [roomUrl, ended]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Video className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="text-lg">{error}</p>
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
            Durée : {String(mins).padStart(2, "0")}min {String(secs).padStart(2, "0")}s
          </p>
          <a
            href={`/avis/${appointmentId}`}
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Laisser un avis
          </a>
        </div>
      </div>
    );
  }

  if (!roomUrl) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-pulse">
            <Video className="w-12 h-12 mx-auto mb-4 text-purple-400" />
          </div>
          <p className="text-gray-300">Connexion à la salle...</p>
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
          <span className="text-white font-medium">Téléconsultation</span>
        </div>

        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="w-4 h-4" strokeWidth={2.5} />
          <span className="font-mono text-sm">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>

        <button
          onClick={() => setEnded(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PhoneOff className="w-4 h-4" strokeWidth={2.5} />
          Quitter
        </button>
      </div>

      {/* Jitsi iframe */}
      <iframe
        src={roomUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="flex-1 border-0 w-full"
      />
    </div>
  );
}
