"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Send,
  Loader2,
  UserCog,
  CalendarClock,
  RotateCcw,
} from "lucide-react";

const VALID_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmé" },
  { value: "completed", label: "Terminé" },
  { value: "no_show", label: "Absent (no-show)" },
  { value: "cancelled", label: "Annulé" },
] as const;

type AppointmentStatus = (typeof VALID_STATUSES)[number]["value"];

type ModalKind = "reassign" | "reschedule" | "refund" | null;

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
  const [openModal, setOpenModal] = useState<ModalKind>(null);

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

      <hr className="border-slate-200" />

      {/* Operational actions */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Opérations
        </label>
        <button
          onClick={() => {
            setError(null);
            setSuccess(null);
            setOpenModal("reassign");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
        >
          <UserCog className="w-4 h-4" />
          Réassigner
        </button>
        <button
          onClick={() => {
            setError(null);
            setSuccess(null);
            setOpenModal("reschedule");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
        >
          <CalendarClock className="w-4 h-4" />
          Reprogrammer
        </button>
        <button
          onClick={() => {
            setError(null);
            setSuccess(null);
            setOpenModal("refund");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Rembourser
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

      {openModal === "reassign" && (
        <ReassignModal
          appointmentId={appointmentId}
          onClose={() => setOpenModal(null)}
          onSuccess={(msg) => {
            setSuccess(msg);
            setOpenModal(null);
            router.refresh();
          }}
          onError={setError}
        />
      )}
      {openModal === "reschedule" && (
        <RescheduleModal
          appointmentId={appointmentId}
          onClose={() => setOpenModal(null)}
          onSuccess={(msg) => {
            setSuccess(msg);
            setOpenModal(null);
            router.refresh();
          }}
          onError={setError}
        />
      )}
      {openModal === "refund" && (
        <RefundModal
          appointmentId={appointmentId}
          onClose={() => setOpenModal(null)}
          onSuccess={(msg) => {
            setSuccess(msg);
            setOpenModal(null);
            router.refresh();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

// ─── Modals ─────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ReassignModal({
  appointmentId,
  onClose,
  onSuccess,
  onError,
}: {
  appointmentId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [newDoctorId, setNewDoctorId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!newDoctorId) return;
    setBusy(true);
    const res = await fetch(`/api/admin/appointments/${appointmentId}/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDoctorId, reason: reason || undefined }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      onSuccess("Rendez-vous réassigné.");
    } else {
      onError(data.error ?? "Erreur lors de la réassignation");
    }
  }

  return (
    <ModalShell title="Réassigner à un autre médecin" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            ID du nouveau médecin *
          </label>
          <input
            type="text"
            value={newDoctorId}
            onChange={(e) => setNewDoctorId(e.target.value)}
            placeholder="UUID du médecin destinataire"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Raison (optionnelle)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!newDoctorId || busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Réassigner
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function RescheduleModal({
  appointmentId,
  onClose,
  onSuccess,
  onError,
}: {
  appointmentId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!startsAt || !endsAt) return;
    setBusy(true);
    const res = await fetch(`/api/admin/appointments/${appointmentId}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newStartsAt: new Date(startsAt).toISOString(),
        newEndsAt: new Date(endsAt).toISOString(),
        reason: reason || undefined,
      }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      onSuccess("Rendez-vous reprogrammé.");
    } else {
      onError(data.error ?? "Erreur lors de la reprogrammation");
    }
  }

  return (
    <ModalShell title="Reprogrammer le rendez-vous" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Nouveau début *
          </label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Nouvelle fin *
          </label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Raison (optionnelle)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!startsAt || !endsAt || busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Reprogrammer
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function RefundModal({
  appointmentId,
  onClose,
  onSuccess,
  onError,
}: {
  appointmentId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (reason.trim().length < 10) return;
    setBusy(true);
    const body: { reason: string; amount?: number } = { reason: reason.trim() };
    if (amount.trim()) {
      const n = Number.parseInt(amount, 10);
      if (Number.isFinite(n) && n > 0) body.amount = n;
    }
    const res = await fetch(`/api/admin/appointments/${appointmentId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const status = data.paymentStatus === "refund_pending" ? "en attente (Stripe)" : "effectué";
      onSuccess(`Remboursement ${status}.`);
    } else {
      onError(data.error ?? "Erreur lors du remboursement");
    }
  }

  const reasonValid = reason.trim().length >= 10;

  return (
    <ModalShell title="Rembourser le rendez-vous" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Raison * (min. 10 caractères)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex: Le patient a annulé, médecin indisponible…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Montant en millimes (optionnel — vide = total)
          </label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ex: 50000 = 50 DT"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <p className="text-xs text-slate-500">
          Pour les paiements Stripe, le statut sera <em>refund_pending</em>{" "}
          jusqu&apos;au webhook. Pour les autres modes (virement, flouci, cash),
          le remboursement est marqué effectué (à exécuter manuellement).
        </p>
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!reasonValid || busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Rembourser
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
