"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { SPECIALTIES } from "@doktori/shared";

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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Chargement...</p>
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:underline"
        >
          Se déconnecter
        </button>
      </div>

      {/* Welcome card */}
      <div className="rounded-2xl bg-blue-600 text-white p-6 mb-6">
        <p className="text-blue-100 text-sm mb-1">Bonjour,</p>
        <h2 className="text-xl font-bold mb-4">{patientName}</h2>
        {nextAppointment ? (
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-blue-100 text-xs mb-1">Prochain rendez-vous</p>
            <p className="font-semibold">{nextAppointment.doctorName}</p>
            <p className="text-blue-100 text-sm">
              {format(new Date(nextAppointment.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
            </p>
          </div>
        ) : (
          <p className="text-blue-100 text-sm">Aucun rendez-vous à venir</p>
        )}
      </div>

      {/* Quick actions */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Actions rapides
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <a
            href="/recherche"
            className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4 text-center hover:border-blue-300 hover:shadow-sm transition"
          >
            <span className="text-2xl">🔍</span>
            <span className="text-xs font-medium text-gray-700">Trouver un médecin</span>
          </a>
          <a
            href="/dossier-medical"
            className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4 text-center hover:border-blue-300 hover:shadow-sm transition"
          >
            <span className="text-2xl">📋</span>
            <span className="text-xs font-medium text-gray-700">Mon dossier médical</span>
          </a>
          <a
            href="/sos"
            className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4 text-center hover:border-red-300 hover:shadow-sm transition"
          >
            <span className="text-2xl">🚨</span>
            <span className="text-xs font-medium text-gray-700">SOS Docteur</span>
          </a>
        </div>
      </section>

      {/* Upcoming appointments */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Rendez-vous à venir
        </h3>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-sm text-gray-400">
            Aucun rendez-vous à venir
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => {
              const spec = SPECIALTIES.find((s) => s.id === a.doctorSpecialty);
              const typeLabel = TYPE_LABELS[a.type] ?? a.type;
              return (
                <div
                  key={a.id}
                  className="rounded-xl border bg-white p-4 flex items-start justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{a.doctorName}</p>
                    <p className="text-sm text-blue-600">{spec?.label}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(a.startsAt), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {typeLabel}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelConfirm(a.id)}
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
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Médecins récents
          </h3>
          <div className="space-y-3">
            {recentDoctors.map((a) => {
              const spec = SPECIALTIES.find((s) => s.id === a.doctorSpecialty);
              return (
                <div
                  key={a.doctorSlug}
                  className="rounded-xl border bg-white p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{a.doctorName}</p>
                    <p className="text-sm text-gray-500">{spec?.label}</p>
                  </div>
                  <a href={`/medecin/${a.doctorSlug}`}>
                    <Button variant="outline" size="sm">
                      Reprendre RDV
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Cancel confirmation modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              Annuler ce rendez-vous ?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Cette action est irréversible. Vous devrez reprendre un nouveau rendez-vous.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setCancelConfirm(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Non
              </button>
              <button
                onClick={() => cancelAppointment(cancelConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
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
