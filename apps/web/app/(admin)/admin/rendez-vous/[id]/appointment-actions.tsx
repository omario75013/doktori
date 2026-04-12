"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Send, Loader2 } from "lucide-react";

const VALID_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmé" },
  { value: "completed", label: "Terminé" },
  { value: "no_show", label: "Absent (no-show)" },
  { value: "cancelled", label: "Annulé" },
] as const;

type AppointmentStatus = (typeof VALID_STATUSES)[number]["value"];

export function AppointmentActions({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AppointmentStatus>(currentStatus as AppointmentStatus);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [reminderBusy, setReminderBusy] = useState(false);

  async function changeStatus() {
    if (status === currentStatus) {
      setError("Le statut n'a pas changé.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: reason || undefined }),
      });
      if (res.ok) {
        setSuccess(`Statut mis à jour : ${VALID_STATUSES.find((s) => s.value === status)?.label}`);
        setReason("");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur lors de la mise à jour.");
      }
    });
  }

  async function resendReminder() {
    setReminderBusy(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/admin/appointments/${appointmentId}/resend-reminder`, {
      method: "POST",
    });
    setReminderBusy(false);
    if (res.ok) {
      setSuccess("Rappel enregistré.");
    } else {
      setError("Erreur lors de l'envoi du rappel.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Status change */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Changer le statut
        </label>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
            className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            {VALID_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Raison (optionnelle)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: demande du patient, urgence..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={changeStatus}
        disabled={busy || status === currentStatus}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Appliquer le statut
      </button>

      <hr className="border-slate-200" />

      {/* Resend reminder */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Rappel SMS
        </label>
        <button
          onClick={resendReminder}
          disabled={reminderBusy}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed border border-teal-200 rounded-lg transition-colors"
        >
          {reminderBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Renvoyer le rappel
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {success}
        </p>
      )}
    </div>
  );
}
