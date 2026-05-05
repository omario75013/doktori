"use client";

import { useState, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  MapPin,
  Clock,
  Shield,
  Siren,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Timer,
  Stethoscope,
  Navigation,
  MessageSquare,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Heart,
  UserCheck,
  PhoneCall,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const TOTAL_SECONDS = 1800;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ringColor(seconds: number): string {
  if (seconds < 60) return "#EF4444";
  if (seconds < 300) return "#F97316";
  return "#0891B2";
}

// ── Animated Process Step ──
function ProcessStep({
  number,
  icon: Icon,
  title,
  description,
  delay,
}: {
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative flex flex-col items-center text-center group"
    >
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-7 w-7" strokeWidth={2} />
        </div>
        <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white ring-2 ring-white">
          {number}
        </div>
      </div>
      <h3 className="mb-1.5 text-base font-bold text-foreground">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[200px]">
        {description}
      </p>
    </motion.div>
  );
}

// ── Trust Badge ──
function TrustBadge({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-100 dark:border-gray-700 px-4 py-3 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary dark:bg-gray-700 text-primary">
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

// ── Pulsing SOS Button ──
function PulsingSosButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative inline-flex">
      {/* Pulse rings */}
      <span className="absolute inset-0 rounded-2xl animate-ping bg-red-500/20" />
      <span
        className="absolute inset-0 rounded-2xl bg-red-500/10"
        style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s" }}
      />
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="relative z-10 flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-10 py-5 text-lg font-bold text-white shadow-xl shadow-red-500/30 transition-all hover:shadow-2xl hover:shadow-red-500/40"
      >
        <Siren className="h-6 w-6" strokeWidth={2.5} />
        Demander un médecin maintenant
        <ArrowRight className="h-5 w-5" />
      </motion.button>
    </div>
  );
}

// ── Symptom Option ──
function SymptomOption({
  value,
  label,
  emoji,
  selected,
  onSelect,
}: {
  value: string;
  label: string;
  emoji: string;
  selected: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(value)}
      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
        selected
          ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
      }`}
    >
      <span className="text-xl">{emoji}</span>
      <span>{label}</span>
      {selected && <CheckCircle2 className="ml-auto h-4 w-4 text-red-500" />}
    </motion.button>
  );
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
  const formRef = useRef<HTMLDivElement>(null);

  // Countdown effect
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

  // Socket.IO + polling — socket.io-client (~40KB) is dynamically imported only
  // when the user enters the waiting step, keeping it out of the initial bundle.
  useEffect(() => {
    if (step !== "waiting" || !sessionId) return;
    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      const { io } = await import("socket.io-client");
      if (cancelled) return;
      const SOCKETIO_URL =
        process.env.NEXT_PUBLIC_SOCKETIO_URL || "http://localhost:3010";
      socket = io(SOCKETIO_URL, { path: "/sos-socket" });

      socket.on("connect", () => {
        socket?.emit("join-session", sessionId);
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
    })();

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
      cancelled = true;
      socket?.disconnect();
      clearInterval(fallbackInterval);
    };
  }, [step, sessionId]);

  function getGeolocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Géolocalisation non supportée par votre navigateur"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error("Veuillez autoriser l'accès à votre position dans les paramètres de votre navigateur"));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error("Position indisponible. Vérifiez que le GPS est activé sur votre appareil"));
            break;
          case err.TIMEOUT:
            reject(new Error("La localisation a pris trop de temps. Réessayez"));
            break;
          default:
            reject(new Error("Impossible d'obtenir votre position"));
        }
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    });
  }

  async function sendRequest() {
    setError("");
    setStep("locating");
    let pos: GeolocationPosition;
    try {
      pos = await getGeolocation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'obtenir votre position");
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
      // silently fail
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

  function scrollToForm() {
    setStep("form");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  // SVG ring
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = countdown / TOTAL_SECONDS;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const color = ringColor(countdown);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 dark:from-gray-900 via-white dark:via-gray-900 to-secondary dark:to-gray-900">
      {/* ── Cancel confirmation modal ── */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white">Confirmer l&apos;annulation</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {pendingCancelByDoctor
                  ? `${sessionData?.doctor_name ?? "Le médecin"} a déjà accepté votre demande. Êtes-vous sûr de vouloir annuler ?`
                  : "Voulez-vous vraiment annuler votre demande SOS ?"}
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(false)}
                  className="rounded-xl"
                >
                  Non, garder
                </Button>
                <Button
                  onClick={confirmCancelRequest}
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
                >
                  Oui, annuler
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          INTRO — Hero + Process + Trust
         ══════════════════════════════════════════════════════════════════ */}
      {step === "intro" && (
        <>
          {/* ── Hero ── */}
          <section className="relative overflow-hidden">
            {/* Background decorations */}
            <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-red-100/50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl" />

            <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-12 sm:pt-20 sm:pb-20">
              <div className="flex flex-col items-center text-center">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-6 inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  Service d&apos;urgence non-vitale
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="mb-4 text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl"
                >
                  Un médecin chez vous
                  <br />
                  <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                    en quelques minutes
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-400"
                >
                  Fièvre, douleur aiguë, enfant malade... Doktori localise et contacte automatiquement le médecin le plus proche disponible pour une visite à domicile.
                </motion.p>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <PulsingSosButton onClick={scrollToForm} />
                </motion.div>

                {/* SAMU disclaimer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3.5 text-sm text-amber-800 max-w-lg"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={2.5} />
                  <div>
                    <strong>Urgence vitale ?</strong> Composez le <strong>190 (SAMU)</strong> ou le <strong>198 (Protection civile)</strong>. Doktori SOS est destiné aux consultations urgentes non-vitales uniquement.
                  </div>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-10"
                >
                  <ChevronDown className="mx-auto h-6 w-6 text-gray-300 animate-bounce" />
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── How it works ── */}
          <section className="mx-auto max-w-5xl px-4 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="mb-2 inline-block text-sm font-semibold uppercase tracking-widest text-red-500">
                Comment ça marche
              </span>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                4 étapes simples
              </h2>
            </motion.div>

            {/* Connecting line (desktop) */}
            <div className="relative">
              <div className="absolute top-8 left-[12.5%] right-[12.5%] hidden h-0.5 bg-gradient-to-r from-red-200 via-red-300 to-primary/30 sm:block" />
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                <ProcessStep
                  number={1}
                  icon={MessageSquare}
                  title="Décrivez"
                  description="Indiquez vos symptômes et vos coordonnées"
                  delay={0}
                />
                <ProcessStep
                  number={2}
                  icon={Navigation}
                  title="Localisation"
                  description="Nous détectons automatiquement votre position GPS"
                  delay={0.1}
                />
                <ProcessStep
                  number={3}
                  icon={UserCheck}
                  title="Matching"
                  description="Nous contactons les médecins SOS dans votre zone"
                  delay={0.2}
                />
                <ProcessStep
                  number={4}
                  icon={PhoneCall}
                  title="Prise en charge"
                  description="Un médecin accepte et vous contacte directement"
                  delay={0.3}
                />
              </div>
            </div>
          </section>

          {/* ── Trust Signals ── */}
          <section className="mx-auto max-w-4xl px-4 pb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              <TrustBadge icon={Clock} label="Temps de réponse moyen" value="< 15 minutes" />
              <TrustBadge icon={MapPin} label="Zone de couverture" value="Grand Tunis" />
              <TrustBadge icon={Shield} label="Médecins vérifiés" value="100% inscrits" />
            </motion.div>

            {/* FAQ mini */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-foreground mb-4">Questions fréquentes</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">Combien coûte une consultation SOS ?</p>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Le tarif est fixé par le médecin (généralement entre 50 et 100 DT). Vous serez informé du montant avant de confirmer.</p>
                </div>
                <div className="border-t dark:border-gray-700 pt-4">
                  <p className="font-semibold text-gray-800 dark:text-white">Et si aucun médecin n&apos;est disponible ?</p>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Vous pouvez relancer une recherche ou contacter le SAMU (190) pour les urgences vitales. Notre réseau de médecins s&apos;agrandit chaque jour.</p>
                </div>
                <div className="border-t dark:border-gray-700 pt-4">
                  <p className="font-semibold text-gray-800 dark:text-white">Le médecin vient à domicile ?</p>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Selon la disponibilité, le médecin peut vous recevoir à son cabinet, se déplacer chez vous, ou proposer une téléconsultation.</p>
                </div>
              </div>
            </motion.div>
          </section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          FORM — Enriched with symptom cards + better layout
         ══════════════════════════════════════════════════════════════════ */}
      {step === "form" && (
        <div className="mx-auto max-w-lg px-4 py-12" ref={formRef}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl p-6 sm:p-8"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                <Siren className="h-6 w-6 text-red-600" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Demande SOS</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Consultation urgente non-vitale</p>
              </div>
            </div>

            <form onSubmit={submitRequest} className="space-y-5">
              {/* Name + Phone row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Votre nom
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Prénom et nom"
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                    required
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>

              {/* Symptom cards */}
              <div>
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Type de symptôme
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <SymptomOption
                    value="fievre"
                    label="Fièvre"
                    emoji="🌡️"
                    selected={symptom === "fievre"}
                    onSelect={setSymptom}
                  />
                  <SymptomOption
                    value="douleur"
                    label="Douleur aiguë"
                    emoji="⚡"
                    selected={symptom === "douleur"}
                    onSelect={setSymptom}
                  />
                  <SymptomOption
                    value="enfant"
                    label="Enfant malade"
                    emoji="👶"
                    selected={symptom === "enfant"}
                    onSelect={setSymptom}
                  />
                  <SymptomOption
                    value="autre"
                    label="Autre"
                    emoji="🩺"
                    selected={symptom === "autre"}
                    onSelect={setSymptom}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="desc" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Description <span className="font-normal text-gray-400">(optionnel)</span>
                </Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez vos symptômes pour aider le médecin..."
                  className="mt-1.5 rounded-xl"
                  rows={3}
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
                  >
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-6 text-base font-bold shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30"
                >
                  <Siren className="mr-2 h-5 w-5" />
                  Localiser et envoyer la demande
                </Button>
              </motion.div>

              {/* Back */}
              <button
                type="button"
                onClick={() => setStep("intro")}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Retour
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LOCATING — Animated GPS acquisition
         ══════════════════════════════════════════════════════════════════ */}
      {step === "locating" && (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-primary/20 animate-pulse" />
              <MapPin className="relative h-10 w-10 text-primary" strokeWidth={2} />
            </div>
            <p className="text-lg font-semibold text-foreground">Obtention de votre position...</p>
            <p className="mt-2 text-sm text-gray-500">
              Veuillez autoriser l&apos;accès à votre localisation
            </p>
          </motion.div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          WAITING — Countdown ring + status
         ══════════════════════════════════════════════════════════════════ */}
      {step === "waiting" && (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl p-8 text-center"
          >
            {/* Countdown ring */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <svg width="160" height="160" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#F3F4F6" strokeWidth="8" />
                  <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s" }}
                  />
                  <text
                    x="60"
                    y="55"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#134E4A"
                    fontSize="22"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {formatCountdown(countdown)}
                  </text>
                  <text
                    x="60"
                    y="72"
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize="9"
                  >
                    restantes
                  </text>
                </svg>
                {/* Rotating dot */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <div
                    className="absolute left-1/2 -top-1 h-3 w-3 -translate-x-1/2 rounded-full shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                </motion.div>
              </div>
            </div>

            {/* Status */}
            <div className="mb-2 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-base font-semibold text-foreground">
                Recherche en cours...
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Nous contactons les médecins disponibles dans votre quartier. Vous serez notifié dès qu&apos;un médecin accepte.
            </p>

            {/* Progress indicators */}
            <div className="flex justify-center gap-1 mb-8">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  className="h-1.5 w-8 rounded-full bg-primary"
                />
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
              onClick={() => cancelRequest(false)}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Annulation...
                </>
              ) : (
                "Annuler ma demande"
              )}
            </Button>
          </motion.div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ACCEPTED — Doctor found!
         ══════════════════════════════════════════════════════════════════ */}
      {step === "accepted" && sessionData && (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl p-8"
          >
            {/* Success header */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
            >
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </motion.div>
            <h2 className="text-center text-xl font-bold text-foreground mb-1">
              Médecin trouvé !
            </h2>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
              Un médecin a accepté votre demande
            </p>

            {/* Doctor info card */}
            <div className="rounded-xl bg-gradient-to-br from-secondary to-green-50 border border-green-200 p-5 mb-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">{sessionData.doctor_name}</p>
                  <p className="text-sm text-gray-500">Médecin généraliste</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{sessionData.doctor_phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{sessionData.doctor_address}</span>
                </div>
              </div>
            </div>

            {/* Call button */}
            {sessionData.doctor_phone && (
              <motion.a
                href={`tel:${sessionData.doctor_phone}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-primary to-doktori-teal-dark text-white font-bold py-4 text-base shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
              >
                <Phone className="w-5 h-5" />
                Appeler Dr. {sessionData.doctor_name?.split(" ").slice(-1)[0]}
              </motion.a>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4 mb-4">
              Vous recevrez un SMS de confirmation. Convenez de la modalité (cabinet, domicile ou téléconsultation) directement avec le médecin.
            </p>

            <Button
              variant="outline"
              className="w-full rounded-xl border-gray-200 text-gray-500 hover:bg-gray-50 text-sm"
              onClick={() => cancelRequest(true)}
              disabled={cancelling}
            >
              Annuler
            </Button>
          </motion.div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          EXPIRED
         ══════════════════════════════════════════════════════════════════ */}
      {step === "expired" && (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl p-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Timer className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Aucun médecin disponible
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Aucun médecin n&apos;a pu répondre à votre demande dans le délai imparti. Vous pouvez réessayer ou contacter le SAMU (190).
            </p>
            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}
            <div className="space-y-3">
              <Button
                onClick={retryRequest}
                className="w-full rounded-xl bg-primary hover:bg-doktori-teal-dark py-5 text-base font-bold"
              >
                Réessayer
              </Button>
              <a
                href="tel:190"
                className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Appeler le SAMU (190)
              </a>
            </div>
          </motion.div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CANCELLED
         ══════════════════════════════════════════════════════════════════ */}
      {step === "cancelled" && (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl p-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Demande annulée</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Votre demande SOS a été annulée. Vous pouvez en créer une nouvelle à tout moment.
            </p>
            <Button
              onClick={resetAll}
              className="w-full rounded-xl bg-primary hover:bg-doktori-teal-dark py-5 text-base font-bold"
            >
              Nouvelle demande
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
