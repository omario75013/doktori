"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  patientName: string;
  patientPhone: string;
  patientNoShowCount: number;
  patientLastMinuteCancelCount: number;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "À confirmer",
  confirmed: "Confirmé",
  cancelled: "Annulé",
  completed: "Terminé",
  no_show: "Absent",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
};

const TERMINAL_STATUSES = ["cancelled", "completed", "no_show"];

const ACTIONS: { status: string; label: string }[] = [
  { status: "confirmed", label: "Confirmer" },
  { status: "completed", label: "Terminé" },
  { status: "no_show", label: "Absent" },
  { status: "cancelled", label: "Annuler" },
];

export default function RendezVousPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments/doctor");
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data: Appointment[] = await res.json();
      setAppointments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur mise à jour");
      }
      await fetchAppointments();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUpdating(null);
    }
  };

  const scheduleFollowup = async (id: string) => {
    const input = window.prompt(
      "Dans combien de semaines programmer le suivi ?",
      "4",
    );
    if (!input) return;
    const weeks = Number(input);
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 104) {
      alert("Valeur invalide (1 à 104 semaines)");
      return;
    }
    setUpdating(id);
    try {
      const res = await fetch(`/api/appointments/${id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur programmation");
      }
      alert(`Suivi programmé dans ${weeks} semaine${weeks > 1 ? "s" : ""}. Le patient recevra un SMS.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-sm p-6">Chargement...</p>;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={fetchAppointments}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rendez-vous</h1>
        <button
          onClick={fetchAppointments}
          className="text-sm text-blue-600 hover:underline"
        >
          Actualiser
        </button>
      </div>

      {appointments.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucun rendez-vous.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Date / Heure</th>
                <th className="px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="px-4 py-3 font-medium text-gray-600">Téléphone</th>
                <th className="px-4 py-3 font-medium text-gray-600">Motif</th>
                <th className="px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {appointments.map((appt) => {
                const isTerminal = TERMINAL_STATUSES.includes(appt.status);
                const isUpdating = updating === appt.id;
                return (
                  <tr key={appt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(appt.startsAt), "EEE d MMM yyyy HH:mm", {
                        locale: fr,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{appt.patientName}</span>
                        {appt.patientNoShowCount >= 2 && (
                          <span
                            className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700"
                            title={`${appt.patientNoShowCount} absences enregistrées`}
                          >
                            ⚠ {appt.patientNoShowCount}
                          </span>
                        )}
                        {appt.patientLastMinuteCancelCount >= 2 && (
                          <span
                            className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700"
                            title={`${appt.patientLastMinuteCancelCount} annulations tardives`}
                          >
                            {appt.patientLastMinuteCancelCount} tardives
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{appt.patientPhone}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {appt.reason ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          STATUS_STYLES[appt.status] ?? "bg-gray-100"
                        }`}
                      >
                        {STATUS_LABELS[appt.status] ?? appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isTerminal ? (
                        appt.status === "completed" ? (
                          <button
                            onClick={() => scheduleFollowup(appt.id)}
                            disabled={isUpdating}
                            className="text-xs px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                          >
                            Programmer un suivi
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          {ACTIONS.filter((a) => a.status !== appt.status).map((action) => (
                            <button
                              key={action.status}
                              disabled={isUpdating}
                              onClick={() => updateStatus(appt.id, action.status)}
                              className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isUpdating ? "..." : action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
