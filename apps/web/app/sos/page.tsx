"use client";

import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Step = "intro" | "form" | "locating" | "waiting" | "accepted" | "expired";

interface SessionData {
  id: string;
  status: string;
  expires_at: string;
  doctor_name: string | null;
  doctor_phone: string | null;
  doctor_address: string | null;
}

export default function SOSPage() {
  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [symptom, setSymptom] = useState("fievre");
  const [description, setDescription] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState("");

  // Real-time session updates via Socket.io with 10s HTTP fallback
  useEffect(() => {
    if (step !== "waiting" || !sessionId) return;

    const SOCKETIO_URL =
      process.env.NEXT_PUBLIC_SOCKETIO_URL || "http://localhost:3010";
    const socket: Socket = io(SOCKETIO_URL, { path: "/sos-socket" });

    socket.on("connect", () => {
      socket.emit("join-session", sessionId);
    });

    socket.on("session-update", (data: { status: string; doctorName: string; doctorPhone: string; doctorAddress: string }) => {
      if (data.status === "accepted") {
        setSessionData({
          id: sessionId,
          status: "accepted",
          expires_at: "",
          doctor_name: data.doctorName,
          doctor_phone: data.doctorPhone,
          doctor_address: data.doctorAddress,
        });
        setStep("accepted");
      }
    });

    // Fallback: poll every 10s in case Socket.io is unreachable
    const fallbackInterval = setInterval(async () => {
      const res = await fetch(`/api/sos/session/${sessionId}`);
      if (res.ok) {
        const data: SessionData = await res.json();
        setSessionData(data);
        if (data.status === "accepted") setStep("accepted");
        else if (new Date(data.expires_at) < new Date()) setStep("expired");
      }
    }, 10000);

    return () => {
      socket.disconnect();
      clearInterval(fallbackInterval);
    };
  }, [step, sessionId]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("locating");

    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée");
      setStep("form");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch("/api/sos/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientName: name,
            patientPhone: phone,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            symptomCategory: symptom,
            description,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSessionId(data.sessionId);
          setStep("waiting");
        } else {
          setError("Erreur lors de l'envoi de la demande");
          setStep("form");
        }
      },
      () => {
        setError("Impossible d'obtenir votre position");
        setStep("form");
      },
    );
  }

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl" aria-hidden="true">🚨</div>
          <div>
            <h1 className="text-xl font-bold">SOS Docteur</h1>
            <p className="text-xs text-gray-500">Consultation urgente non-vitale</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-xs text-yellow-800">
          <strong>Urgence vitale&nbsp;?</strong> Composez le{" "}
          <strong>190 (SAMU)</strong>. Doktori SOS est destiné aux consultations
          urgentes non-vitales uniquement (fièvre, douleur aiguë, etc.).
        </div>

        {step === "intro" && (
          <div>
            <p className="text-sm text-gray-700 mb-4">
              Trouvez un médecin disponible près de vous en quelques minutes. Nous
              cherchons automatiquement les médecins en mode SOS dans votre quartier.
            </p>
            <Button
              onClick={() => setStep("form")}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Demander un médecin maintenant
            </Button>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={submitRequest} className="space-y-4">
            <div>
              <Label htmlFor="name">Votre nom</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+216 XX XXX XXX"
                required
              />
            </div>
            <div>
              <Label htmlFor="symptom">Type de symptôme</Label>
              <select
                id="symptom"
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="fievre">Fièvre</option>
                <option value="douleur">Douleur aiguë</option>
                <option value="enfant">Enfant malade</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <Label htmlFor="desc">Description (optionnel)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez vos symptômes..."
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
              Envoyer la demande
            </Button>
          </form>
        )}

        {step === "locating" && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3" aria-hidden="true">📍</div>
            <p className="text-sm text-gray-600">Obtention de votre position...</p>
          </div>
        )}

        {step === "waiting" && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3 animate-pulse" aria-hidden="true">⏳</div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Recherche d&apos;un médecin...
            </p>
            <p className="text-xs text-gray-500">
              Nous contactons les médecins disponibles dans votre zone.
            </p>
          </div>
        )}

        {step === "accepted" && sessionData && (
          <div className="text-center py-4">
            <div className="text-5xl mb-3" aria-hidden="true">✓</div>
            <h2 className="text-lg font-bold mb-2">Médecin trouvé !</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left text-sm space-y-1 mb-4">
              <p>
                <strong>{sessionData.doctor_name}</strong>
              </p>
              <p className="text-gray-600">
                Tel&nbsp;: {sessionData.doctor_phone}
              </p>
              <p className="text-gray-600">
                Adresse&nbsp;: {sessionData.doctor_address}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Vous recevrez un SMS avec ces informations. Appelez directement le
              médecin pour convenir de la modalité (cabinet, domicile,
              téléconsultation).
            </p>
          </div>
        )}

        {step === "expired" && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-600 mb-4">
              Aucun médecin n&apos;est disponible dans votre zone pour le moment.
            </p>
            <Button
              onClick={() => {
                setStep("intro");
                setSessionId(null);
                setSessionData(null);
              }}
              variant="outline"
            >
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
