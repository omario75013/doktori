"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "lucide-react";

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
  confirmed: "bg-[#F0FDFA] text-[#0891B2]",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
};

const TERMINAL_STATUSES = ["cancelled", "completed", "no_show"];

const ACTIONS: { status: string; label: string }[] = [
  { status: "confirmed", label: "Confirmer" },
  { status: "completed", label: "Terminé" },
  { status: "no_show", label: "Absent" },
];

export default function RendezVousPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // CNAM modal state
  const [cnamDialogAppointmentId, setCnamDialogAppointmentId] = useState<string | null>(null);
  const [cnamNumber, setCnamNumber] = useState("");
  const [cnamAmount, setCnamAmount] = useState("40");
  const [cnamError, setCnamError] = useState<string | null>(null);

  // Followup modal state
  const [followupDialogId, setFollowupDialogId] = useState<string | null>(null);
  const [followupWeeks, setFollowupWeeks] = useState("4");
  const [followupError, setFollowupError] = useState<string | null>(null);
  const [followupSuccess, setFollowupSuccess] = useState<string | null>(null);

  // Cancel modal state
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

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
    setActionError(null);
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
      setActionError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUpdating(null);
    }
  };

  const openCnamDialog = (id: string) => {
    setCnamDialogAppointmentId(id);
    setCnamNumber("");
    setCnamAmount("40");
    setCnamError(null);
  };

  const submitCnamClaim = async () => {
    const id = cnamDialogAppointmentId;
    if (!id) return;
    if (!cnamNumber.trim()) {
      setCnamError("Veuillez saisir le numéro CNAM.");
      return;
    }
    const amountDt = Number(cnamAmount);
    if (!Number.isFinite(amountDt) || amountDt < 1) {
      setCnamError("Montant invalide (minimum 1 DT).");
      return;
    }
    setCnamError(null);
    setCnamDialogAppointmentId(null);
    setUpdating(id);
    try {
      const res = await fetch("/api/cnam/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: id,
          cnamNumber: cnamNumber.trim(),
          amount: Math.round(amountDt * 1000),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur création bordereau");
      }
      const claim = await res.json();
      window.open(`/cnam/${claim.id}/print`, "_blank");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erreur création bordereau");
    } finally {
      setUpdating(null);
    }
  };

  const openFollowupDialog = (id: string) => {
    setFollowupDialogId(id);
    setFollowupWeeks("4");
    setFollowupError(null);
    setFollowupSuccess(null);
  };

  const submitFollowup = async () => {
    const id = followupDialogId;
    if (!id) return;
    const weeks = Number(followupWeeks);
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 104) {
      setFollowupError("Valeur invalide (1 à 104 semaines).");
      return;
    }
    setFollowupError(null);
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
      setFollowupSuccess(
        `Suivi programmé dans ${weeks} semaine${weeks > 1 ? "s" : ""}. Le patient recevra un SMS.`,
      );
      setTimeout(() => {
        setFollowupDialogId(null);
        setFollowupSuccess(null);
      }, 2000);
    } catch (e) {
      setFollowupError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUpdating(null);
    }
  };

  const openCancelDialog = (id: string) => {
    setCancelDialogId(id);
    setCancelReason("");
    setCancelError(null);
  };

  const submitCancel = async () => {
    const id = cancelDialogId;
    if (!id) return;
    setCancelError(null);
    setCancelSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${id}/cancel-doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de l'annulation");
      }
      setCancelDialogId(null);
      await fetchAppointments();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-[#0891B2] text-sm p-6">Chargement...</p>;
  }

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={fetchAppointments}
          className="text-sm text-[#0891B2] hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
            <Calendar className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Rendez-vous</h1>
        </div>
        <button
          onClick={fetchAppointments}
          className="text-sm text-[#0891B2] hover:text-[#0E7490] font-medium border border-[#E6F4F1] hover:bg-[#F0FDFA] rounded-xl px-3 py-2 transition-colors"
        >
          Actualiser
        </button>
      </div>

      {actionError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-4 text-red-400 hover:text-red-600 font-bold"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-[#F0FDFA] flex items-center justify-center mx-auto mb-3">
            <Calendar className="h-7 w-7 text-[#0891B2]" />
          </div>
          <p className="text-[#134E4A] font-medium mb-1">Aucun rendez-vous</p>
          <p className="text-sm text-gray-400">Vos prochains rendez-vous apparaîtront ici.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6F4F1] bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6F4F1] bg-[#F0FDFA] text-left">
                <th className="px-4 py-3 font-medium text-[#134E4A]">Date / Heure</th>
                <th className="px-4 py-3 font-medium text-[#134E4A]">Patient</th>
                <th className="px-4 py-3 font-medium text-[#134E4A]">Téléphone</th>
                <th className="px-4 py-3 font-medium text-[#134E4A]">Motif</th>
                <th className="px-4 py-3 font-medium text-[#134E4A]">Statut</th>
                <th className="px-4 py-3 font-medium text-[#134E4A]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6F4F1]">
              {appointments.map((appt) => {
                const isTerminal = TERMINAL_STATUSES.includes(appt.status);
                const isUpdating = updating === appt.id;
                return (
                  <tr key={appt.id} className="hover:bg-[#F0FDFA] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {format(new Date(appt.startsAt), "EEE d MMM yyyy HH:mm", { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#134E4A]">{appt.patientName}</span>
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
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{appt.patientPhone}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {appt.reason ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          STATUS_STYLES[appt.status] ?? "bg-gray-100"
                        }`}
                      >
                        {STATUS_LABELS[appt.status] ?? appt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isTerminal ? (
                        appt.status === "completed" ? (
                          <div className="flex gap-1.5 flex-wrap">
                            <a
                              href={`/rendez-vous/${appt.id}/consultation`}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                            >
                              Note SOAP
                            </a>
                            <button
                              onClick={() => openFollowupDialog(appt.id)}
                              disabled={isUpdating}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                            >
                              Programmer un suivi
                            </button>
                            <button
                              onClick={() => openCnamDialog(appt.id)}
                              disabled={isUpdating}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-[#E6F4F1] bg-[#F0FDFA] text-[#0891B2] hover:bg-[#E6F4F1] disabled:opacity-40 transition-colors"
                            >
                              Bordereau CNAM
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )
                      ) : (
                        <div className="flex gap-1.5 flex-wrap">
                          {ACTIONS.filter((a) => a.status !== appt.status).map((action) => (
                            <button
                              key={action.status}
                              disabled={isUpdating}
                              onClick={() => updateStatus(appt.id, action.status)}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-[#E6F4F1] hover:bg-[#F0FDFA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {isUpdating ? "..." : action.label}
                            </button>
                          ))}
                          {["pending", "confirmed"].includes(appt.status) && (
                            <button
                              disabled={isUpdating}
                              onClick={() => openCancelDialog(appt.id)}
                              className="text-xs px-2.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Annuler
                            </button>
                          )}
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

      {/* Followup modal */}
      {followupDialogId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setFollowupDialogId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4 border border-[#E6F4F1]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-[#134E4A]">Programmer un suivi</h2>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#134E4A]">
                Dans combien de semaines ?
              </label>
              <input
                type="number"
                min="1"
                max="104"
                value={followupWeeks}
                onChange={(e) => setFollowupWeeks(e.target.value)}
                className="w-full h-12 rounded-xl border border-[#E6F4F1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                autoFocus
              />
              <p className="text-xs text-gray-400">Entre 1 et 104 semaines</p>
            </div>

            {followupError && (
              <p className="text-sm text-red-600">{followupError}</p>
            )}

            {followupSuccess && (
              <p className="text-sm text-[#0891B2] bg-[#F0FDFA] border border-[#E6F4F1] rounded-xl px-3 py-2">
                {followupSuccess}
              </p>
            )}

            {!followupSuccess && (
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setFollowupDialogId(null)}
                  className="px-4 py-2 text-sm rounded-xl border border-[#E6F4F1] hover:bg-[#F0FDFA] text-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={submitFollowup}
                  disabled={updating === followupDialogId}
                  className="px-4 py-2 text-sm rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white font-bold disabled:opacity-40 transition-colors"
                >
                  {updating === followupDialogId ? "..." : "Confirmer"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelDialogId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !cancelSubmitting && setCancelDialogId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4 border border-[#E6F4F1]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-[#134E4A]">Annuler le rendez-vous</h2>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#134E4A]">
                Motif d'annulation (optionnel)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex : Patient absent, urgence, indisponibilité..."
                rows={3}
                className="w-full rounded-xl border border-[#E6F4F1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                autoFocus
              />
              <p className="text-xs text-gray-400">Le patient recevra un SMS et un e-mail d'annulation.</p>
            </div>

            {cancelError && (
              <p className="text-sm text-red-600">{cancelError}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setCancelDialogId(null)}
                disabled={cancelSubmitting}
                className="px-4 py-2 text-sm rounded-xl border border-[#E6F4F1] hover:bg-[#F0FDFA] text-gray-600 disabled:opacity-40 transition-colors"
              >
                Retour
              </button>
              <button
                onClick={submitCancel}
                disabled={cancelSubmitting}
                className="px-4 py-2 text-sm rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-40 transition-colors"
              >
                {cancelSubmitting ? "Annulation..." : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CNAM modal */}
      {cnamDialogAppointmentId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setCnamDialogAppointmentId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4 border border-[#E6F4F1]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-[#134E4A]">Créer un bordereau CNAM</h2>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#134E4A]">
                Numéro CNAM du patient
              </label>
              <input
                type="text"
                value={cnamNumber}
                onChange={(e) => setCnamNumber(e.target.value)}
                placeholder="Ex : 12345678"
                className="w-full h-12 rounded-xl border border-[#E6F4F1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#134E4A]">
                Montant de la consultation (DT)
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={cnamAmount}
                onChange={(e) => setCnamAmount(e.target.value)}
                className="w-full h-12 rounded-xl border border-[#E6F4F1] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              />
            </div>

            {cnamError && (
              <p className="text-sm text-red-600">{cnamError}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setCnamDialogAppointmentId(null)}
                className="px-4 py-2 text-sm rounded-xl border border-[#E6F4F1] hover:bg-[#F0FDFA] text-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitCnamClaim}
                className="px-4 py-2 text-sm rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white font-bold transition-colors"
              >
                Créer le bordereau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
