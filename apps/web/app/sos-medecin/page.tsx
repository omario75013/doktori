"use client";

import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SOSRequest {
  id: string;
  symptom_category: string | null;
  description: string | null;
  requested_at: string;
  expires_at: string;
  patient_name: string;
  distance_m: number;
}

export default function SOSPage() {
  const [sosAvailable, setSosAvailable] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [fee, setFee] = useState(100);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<SOSRequest[]>([]);
  const [error, setError] = useState("");

  // Load current settings
  useEffect(() => {
    fetch("/api/sos/doctor/settings")
      .then((r) => r.json())
      .then((data) => {
        setSosAvailable(data.sos_available || false);
        setRadiusKm(data.sos_radius_km || 10);
        setFee(data.sos_fee ? data.sos_fee / 1000 : 100);
        setLoading(false);
      });
  }, []);

  // Real-time feed updates via Socket.io with 10s HTTP fallback
  useEffect(() => {
    if (!sosAvailable) {
      setFeed([]);
      return;
    }

    // Initial load
    fetch("/api/sos/doctor/feed")
      .then((r) => r.json())
      .then((data) => setFeed(Array.isArray(data) ? data : []))
      .catch(() => {});

    const SOCKETIO_URL =
      process.env.NEXT_PUBLIC_SOCKETIO_URL || "http://localhost:3010";
    const socket: Socket = io(SOCKETIO_URL, { path: "/sos-socket" });

    socket.on("connect", () => {
      socket.emit("join-doctor-feed", "all");
    });

    socket.on("new-request", () => {
      // A new SOS request arrived — refresh the feed
      fetch("/api/sos/doctor/feed")
        .then((r) => r.json())
        .then((data) => setFeed(Array.isArray(data) ? data : []))
        .catch(() => {});
    });

    // Fallback polling every 10s in case Socket.io is unreachable
    const fallback = setInterval(() => {
      fetch("/api/sos/doctor/feed")
        .then((r) => r.json())
        .then((data) => setFeed(Array.isArray(data) ? data : []))
        .catch(() => {});
    }, 10000);

    return () => {
      socket.disconnect();
      clearInterval(fallback);
    };
  }, [sosAvailable]);

  async function toggleSOS() {
    setError("");
    if (sosAvailable) {
      await fetch("/api/sos/doctor/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sosAvailable: false }),
      });
      setSosAvailable(false);
      return;
    }

    // Request geolocation before enabling
    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée par votre navigateur");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch("/api/sos/doctor/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sosAvailable: true,
            sosRadiusKm: radiusKm,
            sosFee: fee,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        });
        if (res.ok) {
          setSosAvailable(true);
        } else {
          const err = await res.json();
          setError(err.error || "Erreur");
        }
      },
      () => setError("Impossible d'obtenir votre position. Autorisez la géolocalisation."),
    );
  }

  async function accept(id: string) {
    const res = await fetch("/api/sos/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    if (res.ok) {
      setFeed((prev) => prev.filter((r) => r.id !== id));
    } else {
      const err = await res.json();
      alert(err.error || "Erreur");
    }
  }

  if (loading) return <p className="text-gray-400">Chargement...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">SOS Docteur</h1>
      <p className="text-sm text-gray-500 mb-6">
        Activez le mode urgence pour recevoir des demandes de consultation rapide dans votre zone.
        <strong className="block mt-1 text-orange-600">
          Ce n&apos;est PAS un service d&apos;urgence vitale (composez le 190 pour le SAMU).
        </strong>
      </p>

      <div className="bg-white rounded-xl border p-6 max-w-xl mb-6">
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            sosAvailable
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {sosAvailable
            ? "Vous êtes disponible — les patients peuvent vous solliciter"
            : "Mode SOS désactivé"}
        </div>

        {!sosAvailable && (
          <div className="space-y-4 mb-4">
            <div>
              <Label htmlFor="radius">Rayon (km)</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={30}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="fee">Tarif consultation urgence (DT)</Label>
              <Input
                id="fee"
                type="number"
                min={20}
                max={500}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <Button onClick={toggleSOS}>
          {sosAvailable ? "Désactiver" : "Activer le mode SOS"}
        </Button>
      </div>

      {sosAvailable && (
        <div className="bg-white rounded-xl border max-w-xl">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Demandes en cours ({feed.length})</h2>
            <p className="text-xs text-gray-400 mt-1">
              Mise à jour en temps réel
            </p>
          </div>
          {feed.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">
              Aucune demande pour le moment
            </p>
          ) : (
            <div className="divide-y">
              {feed.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{r.patient_name}</div>
                      <div className="text-xs text-gray-500">
                        {(r.distance_m / 1000).toFixed(1)} km &middot;{" "}
                        {r.symptom_category || "Non spécifié"}
                      </div>
                      {r.description && (
                        <div className="text-sm text-gray-700 mt-2">
                          {r.description}
                        </div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => accept(r.id)}>
                      Accepter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
