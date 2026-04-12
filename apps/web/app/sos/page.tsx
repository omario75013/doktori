"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone } from "lucide-react";

type Step =
  | "intro"
  | "form"
  | "locating"
  | "waiting"
  | "accepted"
  | "expired"
  | "cancelled";

interface SessionData {
  id: string;
  status: string;
  expires_at: string;
  doctor_name: string | null;
  doctor_phone: string | null;
  doctor_address: string | null;
  doctor_lat: number | null;
  doctor_lng: number | null;
}

// Total SOS window in seconds (30 minutes)
const TOTAL_SECONDS = 1800;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ringColor(seconds: number): string {
  if (seconds < 60) return "#EF4444"; // red
  if (seconds < 300) return "#F97316"; // orange
  return "#0891B2"; // teal
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
  const [cancelToken, setCancelToken] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(TOTAL_SECONDS);
  const [patientLat, setPatientLat] = useState<number | null>(null);
  const [patientLng, setPatientLng] = useState<number | null>(null);
  const [doctorLat, setDoctorLat] = useState<number | null>(null);
  const [doctorLng, setDoctorLng] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingCancelByDoctor, setPendingCancelByDoctor] = useState(false);

  const geoRef = useRef<{ lat: number; lng: number } | null>(null);

  // Countdown effect when in "waiting" step
  useEffect(() => {
    if (step !== "waiting" || !expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000)
      );
      setCountdown(remaining);
      if (remaining === 0) {
        setStep("expired");
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, expiresAt]);

  // Real-time session updates via Socket.io with 10s HTTP fallback
  useEffect(() => {
    if (step !== "waiting" || !sessionId) return;

    const SOCKETIO_URL =
      process.env.NEXT_PUBLIC_SOCKETIO_URL || "http://localhost:3010";
    const socket: Socket = io(SOCKETIO_URL, { path: "/sos-socket" });

    socket.on("connect", () => {
      socket.emit("join-session", sessionId);
    });

    socket.on(
      "session-update",
      (data: {
        status: string;
        doctorName: string;
        doctorPhone: string;
        doctorAddress: string;
        doctorLatitude?: number;
        doctorLongitude?: number;
      }) => {
        if (data.doctorLatitude != null) setDoctorLat(data.doctorLatitude);
        if (data.doctorLongitude != null) setDoctorLng(data.doctorLongitude);

        if (data.status === "accepted") {
          setSessionData({
            id: sessionId,
            status: "accepted",
            expires_at: "",
            doctor_name: data.doctorName,
            doctor_phone: data.doctorPhone,
            doctor_address: data.doctorAddress,
            doctor_lat: data.doctorLatitude ?? null,
            doctor_lng: data.doctorLongitude ?? null,
          });
          setStep("accepted");
        } else if (data.status === "cancelled") {
          setStep("cancelled");
        } else if (data.status === "expired") {
          setStep("expired");
        }
      }
    );

    // Fallback: poll every 10s in case Socket.io is unreachable
    const fallbackInterval = setInterval(async () => {
      const res = await fetch(`/api/sos/session/${sessionId}`);
      if (res.ok) {
        const data: SessionData = await res.json();
        setSessionData(data);
        if (data.doctor_lat != null) setDoctorLat(data.doctor_lat);
        if (data.doctor_lng != null) setDoctorLng(data.doctor_lng);
        if (data.status === "accepted") setStep("accepted");
        else if (data.status === "cancelled") setStep("cancelled");
        else if (new Date(data.expires_at) < new Date()) setStep("expired");
      }
    }, 10000);

    return () => {
      socket.disconnect();
      clearInterval(fallbackInterval);
    };
  }, [step, sessionId]);

  function getGeolocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Géolocalisation non supportée"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  async function sendRequest() {
    setError("");
    setStep("locating");

    let pos: GeolocationPosition;
    try {
      pos = await getGeolocation();
    } catch {
      setError("Impossible d'obtenir votre position");
      setStep("form");
      return;
    }

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    setPatientLat(lat);
    setPatientLng(lng);
    geoRef.current = { lat, lng };

    const res = await fetch("/api/sos/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientName: name,
        patientPhone: phone,
        latitude: lat,
        longitude: lng,
        symptomCategory: symptom,
        description,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setSessionId(data.sessionId);
      if (data.token) setCancelToken(data.token);
      const exp = new Date(Date.now() + 30 * 60 * 1000);
      setExpiresAt(exp);
      setCountdown(TOTAL_SECONDS);
      setStep("waiting");
    } else {
      setError("Erreur lors de l'envoi de la demande");
      setStep("form");
    }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    await sendRequest();
  }

  function cancelRequest(confirmedByDoctor = false) {
    if (!sessionId) return;
    setPendingCancelByDoctor(confirmedByDoctor);
    setShowCancelConfirm(true);
  }

  async function confirmCancelRequest() {
    setShowCancelConfirm(false);
    setCancelling(true);
    try {
      await fetch("/api/sos/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          cancelledBy: "patient",
          token: cancelToken,
        }),
      });
      setStep("cancelled");
    } catch {
      // silently fail — server-sent event will handle it
    } finally {
      setCancelling(false);
    }
  }

  function resetAll() {
    setStep("intro");
    setName("");
    setPhone("");
    setSymptom("fievre");
    setDescription("");
    setSessionId(null);
    setSessionData(null);
    setCancelToken("");
    setExpiresAt(null);
    setCountdown(TOTAL_SECONDS);
    setPatientLat(null);
    setPatientLng(null);
    setDoctorLat(null);
    setDoctorLng(null);
    setError("");
  }

  async function retryRequest() {
    await sendRequest();
  }

  // SVG ring dimensions
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = countdown / TOTAL_SECONDS;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const color = ringColor(countdown);

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl" aria-hidden="true">
            🚨
          </div>
          <div>
            <h1 className="text-xl font-bold">SOS Docteur</h1>
            <p className="text-xs text-gray-500">
              Consultation urgente non-vitale
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-xs text-yellow-800">
          <strong>Urgence vitale&nbsp;?</strong> Composez le{" "}
          <strong>190 (SAMU)</strong>. Doktori SOS est destiné aux consultations
          urgentes non-vitales uniquement (fièvre, douleur aiguë, etc.).
        </div>

        {/* ── Cancel confirmation modal ── */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
              <h3 className="font-semibold text-gray-800">Êtes-vous sûr ?</h3>
              <p className="text-sm text-gray-600">
                {pendingCancelByDoctor
                  ? `${sessionData?.doctor_name ?? "Le médecin"} a déjà accepté. Annuler quand même ?`
                  : "Voulez-vous vraiment annuler votre demande ?"}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Non
                </button>
                <button
                  onClick={confirmCancelRequest}
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Oui
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── INTRO ── */}
        {step === "intro" && (
          <div>
            <p className="text-sm text-gray-700 mb-4">
              Trouvez un médecin disponible près de vous en quelques minutes.
              Nous cherchons automatiquement les médecins en mode SOS dans votre
              quartier.
            </p>
            <Button
              onClick={() => setStep("form")}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Demander un médecin maintenant
            </Button>
          </div>
        )}

        {/* ── FORM ── */}
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

        {/* ── LOCATING ── */}
        {step === "locating" && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3" aria-hidden="true">
              📍
            </div>
            <p className="text-sm text-gray-600">
              Obtention de votre position...
            </p>
          </div>
        )}

        {/* ── WAITING ── */}
        {step === "waiting" && (
          <div className="text-center py-6 space-y-4">
            {/* Circular countdown ring */}
            <div className="flex justify-center">
              <svg width="140" height="140" viewBox="0 0 120 120">
                {/* Track */}
                <circle
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="10"
                />
                {/* Progress */}
                <circle
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  stroke={color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s" }}
                />
                {/* Countdown text */}
                <text
                  x="60"
                  y="60"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-base font-mono font-bold"
                  fill="#134E4A"
                  fontSize="18"
                  fontFamily="monospace"
                >
                  {formatCountdown(countdown)}
                </text>
              </svg>
            </div>

            <p className="text-sm font-medium text-gray-700">
              Nous cherchons un médecin dans votre zone...
            </p>
            <p className="text-xs text-gray-500">
              Nous contactons les médecins disponibles dans votre quartier.
            </p>

            <Button
              variant="outline"
              className="w-full border-gray-300 text-gray-600 hover:bg-gray-50"
              onClick={() => cancelRequest(false)}
              disabled={cancelling}
            >
              {cancelling ? "Annulation..." : "Annuler ma demande"}
            </Button>
          </div>
        )}

        {/* ── ACCEPTED ── */}
        {step === "accepted" && sessionData && (
          <div className="py-4 space-y-4">
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2"
                aria-hidden="true"
              >
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-[#134E4A]">
                Médecin trouvé !
              </h2>
            </div>

            {/* Doctor info card */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
              <p className="font-semibold text-[#134E4A]">
                {sessionData.doctor_name}
              </p>
              <p className="text-gray-600">
                Tél&nbsp;: {sessionData.doctor_phone}
              </p>
              <p className="text-gray-600">
                Adresse&nbsp;: {sessionData.doctor_address}
              </p>
            </div>

            {/* Map: graceful degradation — react-leaflet not installed */}
            {doctorLat != null && doctorLng != null ? (
              <div className="rounded-lg overflow-hidden border border-gray-200 h-40 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                {/* Map would render here with react-leaflet (not installed) */}
                <div className="text-center px-4">
                  <p className="font-medium text-gray-700 mb-1">
                    Position du médecin
                  </p>
                  <p>
                    Lat&nbsp;{doctorLat.toFixed(4)}, Lng&nbsp;
                    {doctorLng.toFixed(4)}
                  </p>
                  {patientLat != null && patientLng != null && (
                    <p className="mt-1 text-gray-400">
                      Votre position&nbsp;: {patientLat.toFixed(4)},{" "}
                      {patientLng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {/* Call button */}
            {sessionData.doctor_phone && (
              <a
                href={`tel:${sessionData.doctor_phone}`}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#0891B2] hover:bg-[#0e7490] text-white font-semibold py-3 text-sm transition-colors"
              >
                <Phone className="w-4 h-4" />
                Appeler le Dr.{" "}
                {sessionData.doctor_name?.split(" ").slice(-1)[0] ??
                  sessionData.doctor_name}
              </a>
            )}

            <p className="text-xs text-gray-500 text-center">
              Vous recevrez un SMS avec ces informations. Appelez directement le
              médecin pour convenir de la modalité (cabinet, domicile,
              téléconsultation).
            </p>

            {/* Cancel with confirmation */}
            <Button
              variant="outline"
              className="w-full border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
              onClick={() => cancelRequest(true)}
              disabled={cancelling}
            >
              {cancelling ? "Annulation..." : "Annuler"}
            </Button>
          </div>
        )}

        {/* ── EXPIRED ── */}
        {step === "expired" && (
          <div className="text-center py-6 space-y-4">
            <div
              className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto"
              aria-hidden="true"
            >
              <span className="text-2xl">⏰</span>
            </div>
            <p className="text-sm font-medium text-gray-700">
              Aucun médecin disponible dans votre zone
            </p>
            <p className="text-xs text-gray-500">
              Aucun médecin n&apos;a pu répondre à votre demande dans le délai
              imparti.
            </p>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button
              onClick={retryRequest}
              className="w-full bg-[#0891B2] hover:bg-[#0e7490]"
            >
              Réessayer
            </Button>
          </div>
        )}

        {/* ── CANCELLED ── */}
        {step === "cancelled" && (
          <div className="text-center py-6 space-y-4">
            <div
              className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto"
              aria-hidden="true"
            >
              <span className="text-2xl">✕</span>
            </div>
            <p className="text-sm font-medium text-gray-700">
              Votre demande a été annulée
            </p>
            <Button
              onClick={resetAll}
              className="w-full bg-[#0891B2] hover:bg-[#0e7490]"
            >
              Nouvelle demande
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
