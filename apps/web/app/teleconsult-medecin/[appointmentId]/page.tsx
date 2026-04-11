"use client";

import { use, useEffect, useState } from "react";

type TeleconsultData = {
  roomName: string;
  roomUrl: string;
  startedAt: string | null;
  endedAt: string | null;
};

export default function MedecinTeleconsultPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = use(params);
  const [data, setData] = useState<TeleconsultData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/teleconsult/${appointmentId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d) => setData(d))
      .catch(() => setError("Téléconsultation introuvable. Vérifiez que la salle a bien été créée."));
  }, [appointmentId]);

  if (error) {
    return (
      <div className="max-w-md mx-auto p-8 text-center text-gray-600">
        <p className="font-medium text-red-600 mb-2">Erreur</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-gray-400">Chargement de la salle...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between shrink-0">
        <span className="font-semibold text-sm">Téléconsultation — salle : {data.roomName}</span>
        <a
          href={data.roomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline opacity-80 hover:opacity-100"
        >
          Ouvrir dans un nouvel onglet
        </a>
      </div>
      <iframe
        src={data.roomUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="flex-1 w-full border-0"
      />
    </div>
  );
}
