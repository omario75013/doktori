"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

type Step = "phone" | "code" | "loggedIn";
type CancelState = { id: string } | null;
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
  return (a.status === "confirmed" || a.status === "pending") && !isPast(new Date(a.startsAt));
}

function isPastAppointment(a: Appointment) {
  return (a.status === "completed" || (a.status !== "cancelled" && isPast(new Date(a.startsAt))));
}

export default function MesRdvPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState<CancelState>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("upcoming");

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

  async function cancelAppointment(id: string) {
    if (!token) return;
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
      toast.success("Rendez-vous annulé avec succès");
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

  if (step === "phone") {
    return (
      <div className="min-h-screen bg-[#F0FDFA]/40 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0891B2]/10 mb-4">
              <Calendar className="h-7 w-7 text-[#0891B2]" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-black text-[#134E4A]">Mes rendez-vous</h1>
            <p className="text-sm text-[#134E4A]/60 mt-1">Entrez votre numéro de téléphone pour accéder à vos RDV</p>
          </div>

          {sessionExpiredMsg && (
            <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              {sessionExpiredMsg}
            </p>
          )}

          <div className="bg-white rounded-2xl border border-[#E6F4F1] shadow-sm p-6">
            <form onSubmit={requestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[#134E4A] font-semibold text-sm">
                  Numéro de téléphone
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  required
                  className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2]"
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] font-bold text-white"
                disabled={loading}
              >
                {loading ? "Envoi..." : "Recevoir le code par SMS"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="min-h-screen bg-[#F0FDFA]/40 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0891B2]/10 mb-4">
              <Calendar className="h-7 w-7 text-[#0891B2]" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-black text-[#134E4A]">Code de vérification</h1>
            <p className="text-sm text-[#134E4A]/60 mt-1">
              Entrez le code à 6 chiffres reçu par SMS au <span className="font-semibold">{phone}</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6F4F1] shadow-sm p-6">
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-[#134E4A] font-semibold text-sm">
                  Code SMS
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2] text-center text-xl tracking-widest font-bold"
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] font-bold text-white"
                disabled={loading}
              >
                {loading ? "Vérification..." : "Valider"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full text-sm text-[#134E4A]/60 hover:text-[#0891B2] transition-colors"
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
    <div className="min-h-screen bg-[#F0FDFA]/40">
      {/* Teal gradient banner */}
      <div className="bg-gradient-to-br from-[#0891B2] to-[#134E4A] px-4 py-8">
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
              <div className="w-10 h-10 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[#134E4A]/60 text-sm">Chargement de vos rendez-vous...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-2xl border border-[#E6F4F1] p-1 mb-6 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 justify-center ${
                    activeTab === tab.id
                      ? "bg-[#0891B2] text-white shadow-sm"
                      : "text-[#134E4A]/60 hover:text-[#134E4A] hover:bg-[#F0FDFA]"
                  }`}
                >
                  {tab.label}
                  {tabCounts[tab.id] > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-xs font-bold px-1 ${
                        activeTab === tab.id
                          ? "bg-white/30 text-white"
                          : "bg-[#0891B2]/10 text-[#0891B2]"
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
              <div className="bg-white rounded-2xl border border-[#E6F4F1] shadow-sm p-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F0FDFA] mb-4">
                  <Stethoscope className="h-7 w-7 text-[#0891B2]/50" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-[#134E4A] mb-1">
                  {activeTab === "upcoming"
                    ? "Vous n'avez aucun rendez-vous à venir"
                    : activeTab === "past"
                    ? "Aucun rendez-vous passé"
                    : "Aucun rendez-vous annulé"}
                </p>
                {activeTab === "upcoming" && (
                  <>
                    <p className="text-sm text-[#134E4A]/50 mb-4">Prenez rendez-vous avec un médecin dès maintenant</p>
                    <a
                      href="/"
                      className="inline-flex items-center gap-2 bg-[#0891B2] hover:bg-[#0E7490] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
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
                      className={`bg-white rounded-2xl border border-[#E6F4F1] border-l-4 ${cardBorderColor(a.status, a.type)} shadow-sm hover:shadow-md hover:border-[#0891B2]/30 transition-all duration-200 p-4 ${
                        !isUpcomingAppt ? "opacity-85" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-[#0891B2] truncate">{a.doctorName}</span>
                            <TypeBadge type={a.type} />
                            <StatusBadge status={a.status} />
                          </div>
                          <p className="text-sm text-[#134E4A]/70 mb-2">{spec?.label}</p>
                          <div className="flex items-center gap-1.5 text-sm text-[#134E4A]/60 mb-1">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="capitalize">
                              {format(new Date(a.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                            </span>
                          </div>
                          {a.type !== "teleconsult" && a.doctorAddress && (
                            <div className="flex items-center gap-1.5 text-xs text-[#134E4A]/50">
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
                            <p className="mt-2 text-xs text-gray-400 italic">Rendez-vous annulé</p>
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
                              <button
                                onClick={() => setCancelConfirm({ id: a.id })}
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
                              <a
                                href={`/avis?doctorId=${a.doctorId}&appointmentId=${a.id}`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-1.5 transition-colors"
                              >
                                <Star className="h-3 w-3" />
                                Laisser un avis
                              </a>
                              <a
                                href={`/mes-documents`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#0891B2] bg-[#0891B2]/5 hover:bg-[#0891B2]/10 border border-[#0891B2]/20 rounded-lg px-3 py-1.5 transition-colors"
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

      {/* Cancel confirmation modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[#E6F4F1]">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 mx-auto mb-4">
              <X className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-[#134E4A] text-center">Annuler ce rendez-vous ?</h3>
            <p className="mt-2 text-sm text-[#134E4A]/60 text-center">
              Cette action est irréversible. Vous devrez reprendre un nouveau rendez-vous.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 rounded-xl border border-[#E6F4F1] px-4 py-2.5 text-sm font-semibold text-[#134E4A] hover:bg-[#F0FDFA] transition-colors"
              >
                Conserver
              </button>
              <button
                onClick={() => cancelAppointment(cancelConfirm.id)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors"
              >
                Oui, annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
