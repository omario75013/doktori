"use client";

import { use, useEffect, useState } from "react";

export default function TeleconsultPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = use(params);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/teleconsult/${appointmentId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => setRoomUrl(data.roomUrl))
      .catch(() => setError("Téléconsultation introuvable ou non activée."));
  }, [appointmentId]);

  if (error) return <div className="max-w-md mx-auto p-8 text-center text-gray-600">{error}</div>;
  if (!roomUrl) return <div className="p-8 text-center text-gray-400">Chargement de la salle...</div>;

  return (
    <div className="w-full h-screen">
      <iframe
        src={roomUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="w-full h-full border-0"
      />
    </div>
  );
}
