"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SPECIALTIES } from "@doktori/shared";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  Stethoscope,
  Video,
  MapPin,
  Clock,
  User,
  MessageCircle,
  X,
  Home,
  FileText,
  Star,
  RefreshCw,
  CalendarClock,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Step = "phone" | "code" | "loggedIn";
type CancelState = { id: string; doctorName: string; startsAt: string } | null;
type RescheduleState = { id: string; doctorName: string; startsAt: string } | null;
type ActiveTab = "upcoming" | "past" | "cancelled";

const RELATION_LABELS: Record<string, string> = {
  child: "enfant",
  parent: "parent",
  spouse: "conjoint(e)",
  other: "proche",
};

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  doctorName: string;
  doctorSpecialty: string;
  doctorAddress: string;
  doctorId: string;
  doctorSlug: string;
  beneficiaryName: string | null;
  beneficiaryRelation: string | null;
  hasReview?: boolean;
}

function TypeBadge({ type }: { type: string }) {
  if (type === "teleconsult") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
        <Video className="h-3 w-3" />
        Vidéo
      </span>
    );
  }
  if (type === "domicile") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        <Home className="h-3 w-3" />
        Domicile
      </span>
    );
  }
  if (type === "sos") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        SOS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
      Cabinet
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "reschedule_requested") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <CalendarClock className="h-3 w-3" />
        Report demandé
      </span>
    );
  }
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        Confirmé
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
        En attente
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
        Annulé
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
        Terminé
      </span>
    );
  }
  return null;
}

function cardBorderColor(status: string, type: string) {
  if (type === "teleconsult") return "border-l-purple-500";
  if (type === "domicile") return "border-l-green-500";
  if (type === "sos") return "border-l-red-500";
  if (status === "confirmed") return "border-l-teal-500";
  if (status === "pending") return "border-l-orange-400";
  if (status === "cancelled") return "border-l-gray-300";
  if (status === "completed") return "border-l-blue-400";
  return "border-l-teal-400";
}

function isUpcoming(a: Appointment) {
  return (a.status === "confirmed" || a.status === "pending" || a.status === "reschedule_requested") && !isPast(new Date(a.startsAt));
}

function isPastAppointment(a: Appointment) {
  return (a.status === "completed" || (a.status !== "cancelled" && isPast(new Date(a.startsAt))));
}

// Returns true if appointment ended within the last 48 hours
function isRecentlyCompleted(a: Appointment) {
  if (a.status !== "completed" && !(a.status !== "cancelled" && isPast(new Date(a.startsAt)))) {
    return false;
  }
  const endsAt = new Date(a.endsAt);
  const hoursAgo = (Date.now() - endsAt.getTime()) / (1000 * 60 * 60);
  return hoursAgo >= 0 && hoursAgo <= 48;
}

export default function MesRdvPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState<CancelState>(null);
  const [rescheduleConfirm, setRescheduleConfirm] = useState<RescheduleState>(null);
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("upcoming");
  const [dismissedSatisfaction, setDismissedSatisfaction] = useState<Set<string>>(new Set());

  // Check if already logged in
  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (stored) {
      setToken(stored);
      setStep("loggedIn");
    }
  }, []);

  // Fetch appointments when logged in
  useEffect(() => {
    if (step === "loggedIn" && token) {
      setLoading(true);
      fetch("/api/appointments/patient", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => {
          if (r.status === 401) {
            localStorage.removeItem("doktori_patient_token");
            setToken(null);
            setStep("phone");
            setSessionExpiredMsg("Votre session a expiré, veuillez vous reconnecter.");
            return [];
          }
          return r.json();
        })
        .then((data) => { setAppointments(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [step, token]);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Erreur");
      return;
    }
    setStep("code");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Code invalide");
      return;
    }
    const data = await res.json();
    localStorage.setItem("doktori_patient_token", data.token);
    setToken(data.token);
    setStep("loggedIn");
  }

  async function requestReschedule(id: string, note: string) {
    if (!token) return;
    const res = await fetch(`/api/appointments/${id}/change-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "reschedule", ...(note.trim() ? { note: note.trim() } : {}) }),
    });
    if (res.ok) {
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "reschedule_requested" } : a));
      toast.success("Demande de report envoyée — le cabinet vous contactera pour confirmer le nouveau créneau");
    } else {
      toast.error("Erreur lors de la demande de report");
    }
    setRescheduleConfirm(null);
    setRescheduleNote("");
  }

  async function cancelAppointment(id: string) {
    if (!token) return;
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
      toast.success("Rendez-vous annulé");
    } else {
      toast.error("Erreur lors de l'annulation du rendez-vous");
    }
    setCancelConfirm(null);
  }

  function logout() {
    localStorage.removeItem("doktori_patient_token");
    setToken(null);
    setStep("phone");
    setPhone("");
    setCode("");
  }

  function handleSatisfaction(apptId: string) {
    setDismissedSatisfaction((prev) => new Set([...prev, apptId]));
    router.push(`/avis/${apptId}`);
  }

  function dismissSatisfaction(apptId: string) {
    setDismissedSatisfaction((prev) => new Set([...prev, apptId]));
  }

  if (step === "phone") {
    return (
      <div className="min-h-screen bg-secondary/40 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Calendar className="h-7 w-7 text-primary" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-black text-foreground">Mes rendez-vous</h1>
            <p className="text-sm text-foreground/60 mt-1">Entrez votre numéro de téléphone pour accéder à vos RDV</p>
          </div>

          {sessionExpiredMsg && (
            <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              {sessionExpiredMsg}
            </p>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm p-6">
            <form onSubmit={requestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-foreground font-semibold text-sm">
                  Numéro de téléphone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  required
                  className="h-12 rounded-xl border-border focus-visible:ring-primary"
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark font-bold text-white"
                disabled={loading}
              >
                {loading ? "Envoi..." : "Recevoir le code par SMS"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-foreground/60 mt-4">
            Vous avez un compte email ?{" "}
            <a href="/connexion-patient" className="font-bold text-primary hover:underline">
              Se connecter par email
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="min-h-screen bg-secondary/40 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Calendar className="h-7 w-7 text-primary" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-black text-foreground">Code de vérification</h1>
            <p className="text-sm text-foreground/60 mt-1">
              Entrez le code à 6 chiffres reçu par SMS au <span className="font-semibold">{phone}</span>
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm p-6">
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-foreground font-semibold text-sm">
                  Code SMS
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  className="h-12 rounded-xl border-border focus-visible:ring-primary text-center text-xl tracking-widest font-bold"
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark font-bold text-white"
                disabled={loading}
              >
                {loading ? "Vérification..." : "Valider"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full text-sm text-foreground/60 hover:text-primary transition-colors"
              >
                Changer de numéro
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // step === "loggedIn"
  const upcoming = appointments.filter(isUpcoming);
  const past = appointments.filter(isPastAppointment);
  const cancelled = appointments.filter((a) => a.status === "cancelled");

  const tabCounts = { upcoming: upcoming.length, past: past.length, cancelled: cancelled.length };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "upcoming", label: "À venir" },
    { id: "past", label: "Passés" },
    { id: "cancelled", label: "Annulés" },
  ];

  const displayedAppointments =
    activeTab === "upcoming" ? upcoming : activeTab === "past" ? past : cancelled;

  return (
    <div className="min-h-screen bg-secondary/40 dark:bg-gray-900">
      {/* Teal gradient banner */}
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
                <Calendar className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-xl font-black text-white">Mes rendez-vous</h1>
                <p className="text-white/70 text-xs mt-0.5">
                  {appointments.length} rendez-vous au total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/mes-documents"
                className="text-xs font-semibold text-white/90 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 transition-colors"
              >
                Mes documents
              </a>
              <a
                href="/dossier-medical"
                className="text-xs font-semibold text-white/90 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 transition-colors"
              >
                Dossier médical
              </a>
              <button
                onClick={logout}
                className="text-xs text-white/70 hover:text-white transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-foreground/60 text-sm">Chargement de vos rendez-vous...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 p-1 mb-6 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 justify-center ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-foreground/60 hover:text-foreground hover:bg-secondary dark:hover:bg-gray-700"
                  }`}
                >
                  {tab.label}
                  {tabCounts[tab.id] > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-xs font-bold px-1 ${
                        activeTab === tab.id
                          ? "bg-white/30 text-white"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {tabCounts[tab.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Appointment list */}
            {displayedAppointments.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm p-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary mb-4">
                  <Stethoscope className="h-7 w-7 text-primary/50" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-foreground mb-1">
                  {activeTab === "upcoming"
                    ? "Vous n'avez aucun rendez-vous à venir"
                    : activeTab === "past"
                    ? "Aucun rendez-vous passé"
                    : "Aucun rendez-vous annulé"}
                </p>
                {activeTab === "upcoming" && (
                  <>
                    <p className="text-sm text-foreground/50 mb-4">Prenez rendez-vous avec un médecin dès maintenant</p>
                    <a
                      href="/"
                      className="inline-flex items-center gap-2 bg-primary hover:bg-doktori-teal-dark text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                    >
                      Trouver un médecin
                    </a>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedAppointments.map((a) => {
                  const spec = SPECIALTIES.find((s) => s.id === a.doctorSpecialty);
                  const isTeleconsult = a.type === "teleconsult";
                  const isUpcomingAppt = isUpcoming(a);
                  const isPastAppt = isPastAppointment(a);

                  return (
                    <div
                      key={a.id}
                      className={`bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 border-l-4 ${cardBorderColor(a.status, a.type)} shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 p-4 ${
                        !isUpcomingAppt ? "opacity-85" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-primary truncate">{a.doctorName}</span>
                            <TypeBadge type={a.type} />
                            <StatusBadge status={a.status} />
                          </div>
                          <p className="text-sm text-foreground/70 mb-2">{spec?.label}</p>
                          <div className="flex items-center gap-1.5 text-sm text-foreground/60 mb-1">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="capitalize">
                              {format(new Date(a.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                            </span>
                          </div>
                          {a.type !== "teleconsult" && a.doctorAddress && (
                            <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span>{a.doctorAddress}</span>
                            </div>
                          )}
                          {a.beneficiaryName && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                              <User className="h-3 w-3" />
                              Pour {a.beneficiaryName}
                              {a.beneficiaryRelation && a.beneficiaryRelation !== "other" && (
                                <span className="text-blue-500/70">· {RELATION_LABELS[a.beneficiaryRelation] ?? a.beneficiaryRelation}</span>
                              )}
                            </div>
                          )}
                          {/* Cancelled reason placeholder */}
                          {a.status === "cancelled" && (
                            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">Rendez-vous annulé</p>
                          )}

                          {/* Post-visit satisfaction prompt — shown for recently completed appointments */}
                          {isPastAppt && isRecentlyCompleted(a) && !dismissedSatisfaction.has(a.id) && (
                            <div className="mt-3 bg-secondary rounded-xl p-3 border border-border">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-foreground">
                                  Comment s&apos;est passée votre consultation ?
                                </p>
                                <button
                                  onClick={() => dismissSatisfaction(a.id)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                  aria-label="Fermer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSatisfaction(a.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-border text-xs font-medium text-foreground hover:bg-green-50 hover:border-green-200 transition-colors"
                                >
                                  😊 Bien
                                </button>
                                <button
                                  onClick={() => handleSatisfaction(a.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-border text-xs font-medium text-foreground hover:bg-amber-50 hover:border-amber-200 transition-colors"
                                >
                                  😐 Correct
                                </button>
                                <button
                                  onClick={() => handleSatisfaction(a.id)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-border text-xs font-medium text-foreground hover:bg-red-50 hover:border-red-200 transition-colors"
                                >
                                  😞 Décevant
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 items-end flex-shrink-0">
                          {/* Upcoming actions */}
                          {isUpcomingAppt && isTeleconsult && (
                            <button className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg px-3 py-1.5 transition-colors">
                              <Video className="h-3.5 w-3.5" />
                              Rejoindre
                            </button>
                          )}
                          {isUpcomingAppt && (
                            <>
                              <a
                                href={`/messages?doctorId=${a.doctorId}`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg px-3 py-1.5 transition-colors"
                              >
                                <MessageCircle className="h-3 w-3" />
                                Message
                              </a>
                              {a.status !== "reschedule_requested" && (
                                <button
                                  onClick={() => setRescheduleConfirm({ id: a.id, doctorName: a.doctorName, startsAt: a.startsAt })}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5 transition-colors"
                                >
                                  <CalendarClock className="h-3 w-3" />
                                  Décaler
                                </button>
                              )}
                              <button
                                onClick={() => setCancelConfirm({ id: a.id, doctorName: a.doctorName, startsAt: a.startsAt })}
                                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors"
                              >
                                <X className="h-3 w-3" />
                                Annuler
                              </button>
                            </>
                          )}

                          {/* Past appointment actions */}
                          {isPastAppt && (
                            <>
                              {a.hasReview ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                                  <Star className="h-3 w-3 fill-green-500 text-green-500" />
                                  Avis déposé
                                </span>
                              ) : (
                                <a
                                  href={`/avis/${a.id}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0891B2] hover:bg-[#0e7490] rounded-xl px-3 py-1.5 transition-colors shadow-sm"
                                >
                                  <Star className="h-3.5 w-3.5" />
                                  Laisser un avis
                                </a>
                              )}
                              <a
                                href={`/mes-documents`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5 transition-colors"
                              >
                                <FileText className="h-3 w-3" />
                                Ordonnance
                              </a>
                            </>
                          )}

                          {/* Cancelled appointment actions */}
                          {a.status === "cancelled" && (
                            <a
                              href={`/medecin/${a.doctorSlug}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg px-3 py-1.5 transition-colors"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Reprendre RDV
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reschedule request modal */}
      <AnimatePresence>
        {rescheduleConfirm && (
          <motion.div
            key="reschedule-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={() => { setRescheduleConfirm(null); setRescheduleNote(""); }}
          >
            <motion.div
              key="reschedule-card"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl border border-border dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 mx-auto mb-4">
                <CalendarClock className="h-6 w-6 text-amber-500" />
              </div>
              <h3 dir="ltr" className="text-lg font-bold text-foreground text-center">Demander un report ?</h3>
              <p className="mt-2 text-sm text-foreground/60 text-center">
                Votre rendez-vous avec{" "}
                <span className="font-semibold text-foreground">{rescheduleConfirm.doctorName}</span>{" "}
                le{" "}
                <span className="font-semibold text-foreground">
                  {format(new Date(rescheduleConfirm.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                </span>{" "}
                sera marqué comme « report demandé ». Le cabinet vous contactera pour fixer un nouveau créneau.
              </p>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Message au cabinet <span className="text-foreground/40 font-normal">(facultatif)</span>
                </label>
                <textarea
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  placeholder="Ex : disponible en soirée à partir du 5 mai..."
                  rows={3}
                  className="w-full rounded-xl border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => { setRescheduleConfirm(null); setRescheduleNote(""); }}
                  className="flex-1 rounded-xl border border-border dark:border-gray-600 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => requestReschedule(rescheduleConfirm.id, rescheduleNote)}
                  className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
                >
                  Envoyer la demande
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {cancelConfirm && (
          <motion.div
            key="cancel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={() => setCancelConfirm(null)}
          >
            <motion.div
              key="cancel-card"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl border border-border dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 mx-auto mb-4">
                <X className="h-6 w-6 text-red-500" />
              </div>
              <h3 dir="ltr" className="text-lg font-bold text-foreground text-center">Annuler ce rendez-vous ?</h3>
              <p className="mt-2 text-sm text-foreground/60 text-center">
                Êtes-vous sûr de vouloir annuler ce rendez-vous avec{" "}
                <span className="font-semibold text-foreground">{cancelConfirm.doctorName}</span>{" "}
                le{" "}
                <span className="font-semibold text-foreground">
                  {format(new Date(cancelConfirm.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                </span>{" "}
                ?
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setCancelConfirm(null)}
                  className="flex-1 rounded-xl border border-border dark:border-gray-600 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary dark:hover:bg-gray-700 transition-colors"
                >
                  Non, garder
                </button>
                <button
                  onClick={() => cancelAppointment(cancelConfirm.id)}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors"
                >
                  Oui, annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
