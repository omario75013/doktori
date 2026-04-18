"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { SPECIALTIES } from "@doktori/shared";
import {
  Search,
  FileText,
  AlertTriangle,
  Calendar,
  User,
  LogOut,
  ChevronRight,
  CheckCircle,
  XCircle,
  ClipboardList,
  Star,
  Clock,
} from "lucide-react";

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
  doctorSlug: string;
  beneficiaryName: string | null;
  beneficiaryRelation: string | null;
}

interface PatientInfo {
  id: string;
  phone: string;
  name?: string;
}

interface TimelineItem {
  id: string;
  kind: "booking" | "cancelled" | "completed" | "prescription" | "review";
  doctorName: string;
  date: Date;
  label: string;
}

function parsePatientFromToken(token: string): PatientInfo | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: payload.id, phone: payload.phone, name: payload.name };
  } catch {
    return null;
  }
}

const TYPE_LABELS: Record<string, string> = {
  cabinet: "Cabinet",
  domicile: "Domicile",
  teleconsultation: "Téléconsultation",
};

const TYPE_COLORS: Record<string, string> = {
  cabinet: "bg-blue-50 text-blue-700",
  domicile: "bg-amber-50 text-amber-700",
  teleconsultation: "bg-purple-50 text-purple-700",
};

const TIMELINE_ICONS: Record<TimelineItem["kind"], React.ReactNode> = {
  booking: <Calendar className="w-3.5 h-3.5 text-[#0891B2]" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  completed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  prescription: <FileText className="w-3.5 h-3.5 text-purple-500" />,
  review: <Star className="w-3.5 h-3.5 text-amber-500" />,
};

const TIMELINE_BG: Record<TimelineItem["kind"], string> = {
  booking: "bg-[#0891B2]/10",
  cancelled: "bg-red-50",
  completed: "bg-green-50",
  prescription: "bg-purple-50",
  review: "bg-amber-50",
};

function buildTimeline(appointments: Appointment[]): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const a of appointments) {
    const startsAt = new Date(a.startsAt);

    if (a.status === "cancelled") {
      items.push({
        id: `cancelled-${a.id}`,
        kind: "cancelled",
        doctorName: a.doctorName,
        date: startsAt,
        label: `Rendez-vous annulé avec ${a.doctorName}`,
      });
    } else if (a.status === "completed" || (a.status !== "cancelled" && isPast(startsAt))) {
      items.push({
        id: `completed-${a.id}`,
        kind: "completed",
        doctorName: a.doctorName,
        date: startsAt,
        label: `Consultation terminée avec ${a.doctorName}`,
      });
    } else {
      items.push({
        id: `booking-${a.id}`,
        kind: "booking",
        doctorName: a.doctorName,
        date: startsAt,
        label: `Rendez-vous confirmé avec ${a.doctorName}`,
      });
    }
  }

  // Sort chronologically descending, take top 10
  return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
}

export default function PatientDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.replace("/mes-rdv");
      return;
    }
    setToken(stored);
    const info = parsePatientFromToken(stored);
    setPatient(info);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/appointments/patient", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("doktori_patient_token");
          router.replace("/mes-rdv");
          return [];
        }
        return r.json();
      })
      .then((data) => {
        setAppointments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, router]);

  async function cancelAppointment(id: string) {
    if (!token) return;
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)),
      );
    }
    setCancelConfirm(null);
  }

  function logout() {
    localStorage.removeItem("doktori_patient_token");
    router.replace("/mes-rdv");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0FDFA]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#134E4A]/60 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  const upcoming = appointments
    .filter((a) => a.status !== "cancelled" && !isPast(new Date(a.startsAt)))
    .slice(0, 3);

  // Last 3 unique doctors from past completed appointments
  const pastCompleted = appointments.filter(
    (a) => a.status !== "cancelled" && isPast(new Date(a.startsAt)),
  );
  const seenDoctorSlugs = new Set<string>();
  const recentDoctors: Appointment[] = [];
  for (const a of pastCompleted) {
    if (!seenDoctorSlugs.has(a.doctorSlug)) {
      seenDoctorSlugs.add(a.doctorSlug);
      recentDoctors.push(a);
    }
    if (recentDoctors.length === 3) break;
  }

  const nextAppointment = upcoming[0] ?? null;
  const patientName = patient?.name ?? patient?.phone ?? "Patient";
  const timeline = buildTimeline(appointments);

  return (
    <div className="min-h-screen bg-[#F0FDFA]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0891B2]/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-[#0891B2]" />
            </div>
            <span className="text-sm font-medium text-[#134E4A]">Mon espace</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>

        {/* Teal gradient welcome banner */}
        <div
          className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0891B2 0%, #134E4A 100%)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-6 -left-4 w-24 h-24 rounded-full bg-white/5"
          />
          <p className="text-cyan-100 text-sm mb-1">Bonjour,</p>
          <h2 className="text-xl font-bold mb-4">{patientName}</h2>
          {nextAppointment ? (
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-cyan-200 text-xs mb-1">Prochain rendez-vous</p>
              <p className="font-semibold">{nextAppointment.doctorName}</p>
              <p className="text-cyan-100 text-sm">
                {format(new Date(nextAppointment.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          ) : (
            <p className="text-cyan-100 text-sm">Aucun rendez-vous à venir</p>
          )}
        </div>

        {/* Quick actions */}
        <section className="mb-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Actions rapides
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <a
              href="/recherche"
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#E6F4F1] bg-white p-4 text-center hover:border-[#0891B2]/40 hover:shadow-md transition-all duration-200"
            >
              <div className="w-10 h-10 bg-[#0891B2]/10 rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-[#0891B2]" />
              </div>
              <span className="text-xs font-medium text-[#134E4A]">Trouver un médecin</span>
            </a>
            <a
              href="/dossier-medical"
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#E6F4F1] bg-white p-4 text-center hover:border-[#0891B2]/40 hover:shadow-md transition-all duration-200"
            >
              <div className="w-10 h-10 bg-[#0891B2]/10 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#0891B2]" />
              </div>
              <span className="text-xs font-medium text-[#134E4A]">Mon dossier médical</span>
            </a>
            <a
              href="/mes-documents"
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#E6F4F1] bg-white p-4 text-center hover:border-[#0891B2]/40 hover:shadow-md transition-all duration-200"
            >
              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-[#134E4A]">Mes documents</span>
            </a>
            <a
              href="/sos"
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#E6F4F1] bg-white p-4 text-center hover:border-red-200 hover:shadow-md transition-all duration-200"
            >
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-xs font-medium text-[#134E4A]">SOS Docteur</span>
            </a>
          </div>
        </section>

        {/* Upcoming appointments */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Rendez-vous à venir
            </h3>
            <a href="/mes-rdv" className="text-xs font-semibold text-[#0891B2] hover:underline">
              Voir tout
            </a>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              Aucun rendez-vous à venir
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => {
                const spec = SPECIALTIES.find((s) => s.id === a.doctorSpecialty);
                const typeLabel = TYPE_LABELS[a.type] ?? a.type;
                const typeColor = TYPE_COLORS[a.type] ?? "bg-gray-100 text-gray-600";
                return (
                  <div
                    key={a.id}
                    className="rounded-2xl border-l-4 border-l-[#0891B2] border border-[#E6F4F1] bg-white p-4 shadow-sm flex items-start justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#134E4A]">{a.doctorName}</p>
                      <p className="text-sm text-[#0891B2]">{spec?.label}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(a.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                      </p>
                      <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColor}`}>
                        {typeLabel}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelConfirm(a.id)}
                      className="rounded-xl border-[#E6F4F1] hover:border-red-200 hover:text-red-500 text-gray-500"
                    >
                      Annuler
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent doctors */}
        {recentDoctors.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Médecins récents
            </h3>
            <div className="space-y-3">
              {recentDoctors.map((a) => {
                const spec = SPECIALTIES.find((s) => s.id === a.doctorSpecialty);
                return (
                  <div
                    key={a.doctorSlug}
                    className="rounded-2xl border border-[#E6F4F1] bg-white p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0891B2]/10 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-[#0891B2]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#134E4A]">{a.doctorName}</p>
                        <p className="text-sm text-gray-500">{spec?.label}</p>
                      </div>
                    </div>
                    <a href={`/medecin/${a.doctorSlug}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-[#0891B2]/30 text-[#0891B2] hover:bg-[#0891B2] hover:text-white transition-colors gap-1"
                      >
                        Reprendre RDV
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Activity timeline */}
        {timeline.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#134E4A]/40" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Activité récente
              </h3>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6F4F1] shadow-sm overflow-hidden">
              {timeline.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    index < timeline.length - 1 ? "border-b border-[#E6F4F1]" : ""
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full ${TIMELINE_BG[item.kind]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {TIMELINE_ICONS[item.kind]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#134E4A] leading-snug">{item.label}</p>
                    <p className="text-xs text-[#134E4A]/40 mt-0.5 capitalize">
                      {format(item.date, "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cancel confirmation modal */}
        {cancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-[#E6F4F1]">
              <h3 className="text-lg font-bold text-[#134E4A]">
                Annuler ce rendez-vous ?
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Cette action est irréversible. Vous devrez reprendre un nouveau rendez-vous.
              </p>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setCancelConfirm(null)}
                  className="rounded-xl border border-[#E6F4F1] px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Non
                </button>
                <button
                  onClick={() => cancelAppointment(cancelConfirm)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Oui, annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
