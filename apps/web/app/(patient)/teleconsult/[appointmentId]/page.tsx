"use client";

import { use, useEffect, useState, useRef } from "react";
import { Video, PhoneOff, Clock } from "lucide-react";

type WaitingStatus = "waiting" | "ready" | "joined";

export default function TeleconsultPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = use(params);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const [waitingStatus, setWaitingStatus] = useState<WaitingStatus>("waiting");
  const [waitMinutes, setWaitMinutes] = useState(0);
  const startRef = useRef(Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch room data and start waiting room poll
  useEffect(() => {
    async function checkRoom() {
      const res = await fetch(`/api/teleconsult/${appointmentId}`);
      if (!res.ok) {
        setError("Téléconsultation introuvable ou non activée.");
        return;
      }
      const data = await res.json();
      setRoomUrl(data.roomUrl);
      if (data.doctorName) setDoctorName(data.doctorName);
      if (data.startedAt) {
        setWaitingStatus("ready");
      }
    }

    checkRoom();

    // Poll every 10 seconds to detect when doctor joins
    pollRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setWaitMinutes(Math.floor(elapsed / 60));

      try {
        const res = await fetch(`/api/teleconsult/${appointmentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.startedAt) {
            setWaitingStatus("ready");
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch {
        // Ignore poll errors
      }
    }, 10_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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
          <div className="w-16 h-16 bg-[#0891B2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-lg text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <div className="w-16 h-16 bg-[#0891B2] rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold">Consultation terminée</h1>
          <p className="text-gray-400">
            Durée : {String(mins).padStart(2, "0")}min {String(secs).padStart(2, "0")}s
          </p>
          <a
            href={`/avis/${appointmentId}`}
            className="inline-block bg-[#0891B2] hover:bg-[#0E7490] text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Laisser un avis
          </a>
        </div>
      </div>
    );
  }

  // Waiting room: room data loaded but doctor hasn't started yet
  if (roomUrl && waitingStatus === "waiting") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center text-white max-w-sm">
          {/* Pulsing ring animation */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-[#0891B2]/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-[#0891B2]/30 animate-ping [animation-delay:150ms]" />
            <div className="relative w-24 h-24 bg-[#0891B2]/20 rounded-full flex items-center justify-center">
              <Video className="w-10 h-10 text-[#0891B2]" />
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2">Salle d&apos;attente</h2>
          <p className="text-gray-300 mb-1">Votre médecin va vous recevoir...</p>
          {doctorName && (
            <p className="text-[#0891B2] font-medium mb-4">Dr. {doctorName}</p>
          )}

          {waitMinutes >= 5 && (
            <div className="mt-4 bg-amber-900/40 border border-amber-600/30 rounded-xl px-4 py-3 text-sm text-amber-300">
              Le médecin tarde à rejoindre. Veuillez patienter encore quelques instants ou le contacter directement.
            </div>
          )}

          <p className="text-gray-500 text-xs mt-6">
            Cette page se met à jour automatiquement
          </p>
        </div>
      </div>
    );
  }

  // Doctor is ready — invite patient to join
  if (roomUrl && waitingStatus === "ready") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center text-white max-w-sm">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-xl font-bold mb-1">
            {doctorName ? `Dr. ${doctorName} est prêt` : "Le médecin est prêt"}
          </h2>
          <p className="text-gray-400 mb-6 text-sm">Vous pouvez rejoindre la consultation</p>
          <button
            onClick={() => setWaitingStatus("joined")}
            className="w-full bg-[#0891B2] hover:bg-[#0E7490] text-white font-bold px-8 py-3 rounded-xl transition-colors text-lg"
          >
            Rejoindre la consultation
          </button>
        </div>
      </div>
    );
  }

  // Initial loading (no room URL yet)
  if (!roomUrl) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-[#0891B2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-[#0891B2]" />
            </div>
          </div>
          <p className="text-gray-300">Connexion à la salle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header bar — teal accent */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-[#0891B2]/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0891B2] rounded-full flex items-center justify-center">
            <Video className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-medium">Téléconsultation</span>
        </div>

        <div className="flex items-center gap-2 text-[#0891B2]">
          <Clock className="w-4 h-4" strokeWidth={2.5} />
          <span className="font-mono text-sm text-gray-200">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>

        <button
          onClick={() => setEnded(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
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
