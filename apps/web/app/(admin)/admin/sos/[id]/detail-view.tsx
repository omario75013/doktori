"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  MessageSquare,
  Star,
  ArrowLeft,
  User,
  Stethoscope,
  Shield,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  status: string;
  symptom_category: string | null;
  description: string | null;
  fee: number | null;
  commission: number | null;
  requested_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  expires_at: string;
  patient_lat: number;
  patient_lng: number;
  patient_name: string | null;
  patient_phone: string | null;
  doctor_id: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  doctor_city: string | null;
  doctor_lat: number | null;
  doctor_lng: number | null;
  proxy_number: string | null;
  proxy_active: boolean | null;
  review_rating: number | null;
  review_comment: string | null;
  review_at: string | null;
  admin_notes: string | null;
}

interface Decline {
  id: string;
  declined_at: string;
  reason: string | null;
  doctor_name: string | null;
}

interface SmsLog {
  id: string;
  recipient: string;
  message: string;
  status: string;
  created_at: string;
}

interface AvailableDoctor {
  id: string;
  name: string;
  city: string;
  specialty: string;
}

import {
  SOS_STATUS_LABELS as STATUS_LABELS,
  SOS_STATUS_COLORS as STATUS_COLORS,
  formatDT,
} from "@/lib/sos-constants";

// ── Sub-components ─────────────────────────────────────────────────────────────

function TimelineEvent({
  icon,
  label,
  timestamp,
  actor,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  timestamp: string | null;
  actor?: string;
  variant?: "default" | "danger" | "success";
}) {
  const borderColor =
    variant === "danger"
      ? "border-red-300"
      : variant === "success"
        ? "border-green-300"
        : "border-slate-300";

  return (
    <div className="flex gap-4">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 ${borderColor} bg-white flex items-center justify-center`}>
        {icon}
      </div>
      <div className="pb-4 border-l border-slate-200 pl-4 flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {actor && <p className="text-xs text-slate-500">{actor}</p>}
        {timestamp && (
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(timestamp).toLocaleString("fr-TN")}
          </p>
        )}
      </div>
    </div>
  );
}

function ForceAcceptModal({
  doctors,
  onAccept,
  onClose,
}: {
  doctors: AvailableDoctor[];
  onAccept: (doctorId: string) => void;
  onClose: () => void;
}) {
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Forcer l&apos;acceptation
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Sélectionner un médecin disponible pour assigner cette session :
        </p>
        <select
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-4 bg-white"
        >
          <option value="">-- Choisir un médecin --</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              Dr {d.name} — {d.specialty} ({d.city})
            </option>
          ))}
        </select>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            Annuler
          </button>
          <button
            onClick={() => selectedDoctorId && onAccept(selectedDoctorId)}
            disabled={!selectedDoctorId}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            Forcer l&apos;acceptation
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DetailView({
  session: initial,
  declines,
  smsLogs,
  availableDoctors,
}: {
  session: Record<string, unknown>;
  declines: Record<string, unknown>[];
  smsLogs: Record<string, unknown>[];
  availableDoctors: AvailableDoctor[];
}) {
  const router = useRouter();
  const session = initial as unknown as Session;

  const [notes, setNotes] = useState<string>(session.admin_notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showForceModal, setShowForceModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ reason: string } | null>(null);

  const saveNotes = useCallback(async () => {
    setNotesSaving(true);
    const res = await fetch(`/api/admin/sos/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNotes: notes }),
    });
    setNotesSaving(false);
    if (res.ok) {
      toast.success("Notes sauvegardées");
    } else {
      toast.error("Erreur lors de la sauvegarde des notes");
    }
  }, [session.id, notes]);

  async function doAction(action: string, body?: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/sos/${session.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.error || `Erreur ${res.status}`;
        setActionError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      toast.success("Action effectuée avec succès");
      router.refresh();
    } catch {
      setActionError("Erreur réseau");
      toast.error("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  const declinesList = declines as unknown as Decline[];
  const smsList = smsLogs as unknown as SmsLog[];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-4 text-red-400 hover:text-red-700 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/sos"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">
              Session SOS — {session.id.slice(0, 8)}…
            </h1>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[session.status] ?? "bg-slate-100 text-slate-500"}`}
            >
              {STATUS_LABELS[session.status] ?? session.status}
            </span>
          </div>
          {session.symptom_category && (
            <p className="mt-1 text-slate-500">
              Symptôme : <span className="font-medium">{session.symptom_category}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: timeline + SMS logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Chronologie
            </h2>
            <div className="space-y-0">
              <TimelineEvent
                icon={<Clock className="w-4 h-4 text-slate-500" />}
                label="Demande reçue"
                timestamp={session.requested_at}
                actor={session.patient_name ?? undefined}
              />

              {declinesList.map((d) => (
                <TimelineEvent
                  key={d.id}
                  icon={<XCircle className="w-4 h-4 text-red-500" />}
                  label={`Refusé${d.reason ? ` — ${d.reason}` : ""}`}
                  timestamp={d.declined_at}
                  actor={d.doctor_name ? `Dr ${d.doctor_name}` : undefined}
                  variant="danger"
                />
              ))}

              {session.accepted_at && (
                <TimelineEvent
                  icon={<CheckCircle className="w-4 h-4 text-teal-600" />}
                  label="Acceptée"
                  timestamp={session.accepted_at}
                  actor={session.doctor_name ? `Dr ${session.doctor_name}` : undefined}
                  variant="success"
                />
              )}

              {session.status === "completed" && session.completed_at && (
                <TimelineEvent
                  icon={<CheckCircle className="w-4 h-4 text-green-600" />}
                  label="Terminée"
                  timestamp={session.completed_at}
                  variant="success"
                />
              )}

              {session.status === "expired" && (
                <TimelineEvent
                  icon={<AlertTriangle className="w-4 h-4 text-slate-500" />}
                  label="Expirée"
                  timestamp={session.expires_at}
                />
              )}

              {session.status === "cancelled" && (
                <TimelineEvent
                  icon={<XCircle className="w-4 h-4 text-red-500" />}
                  label="Annulée"
                  timestamp={null}
                  variant="danger"
                />
              )}
            </div>
          </div>

          {/* SMS logs */}
          {smsList.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Journaux SMS ({smsList.length})
              </h2>
              <div className="space-y-3">
                {smsList.map((log) => (
                  <div key={log.id} className="text-sm border border-slate-100 rounded-lg p-3 bg-slate-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-slate-500">{log.recipient}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${log.status === "sent" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-slate-700">{log.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(log.created_at).toLocaleString("fr-TN")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Notes administrateur
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={4}
              placeholder="Notes internes (sauvegardées automatiquement)…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {notesSaving && (
              <p className="text-xs text-teal-600 mt-1">Sauvegarde…</p>
            )}
          </div>
        </div>

        {/* Right column: info cards + actions */}
        <div className="space-y-4">
          {/* Patient card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Patient
            </h3>
            <p className="font-semibold text-slate-900">{session.patient_name ?? "—"}</p>
            {session.patient_phone && (
              <p className="text-sm text-slate-600 mt-1">
                <Phone className="w-3.5 h-3.5 inline mr-1" />
                {session.patient_phone}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Position : {session.patient_lat.toFixed(4)}, {session.patient_lng.toFixed(4)}
            </p>
          </div>

          {/* Doctor card */}
          {session.doctor_name && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Stethoscope className="w-3.5 h-3.5" /> Médecin assigné
              </h3>
              <p className="font-semibold text-slate-900">Dr {session.doctor_name}</p>
              {session.doctor_city && (
                <p className="text-sm text-slate-600">{session.doctor_city}</p>
              )}
              {session.doctor_phone && (
                <p className="text-sm text-slate-600 mt-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1" />
                  {session.doctor_phone}
                </p>
              )}
            </div>
          )}

          {/* Phone proxy card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" /> Proxy téléphonique
            </h3>
            {session.proxy_number ? (
              <div>
                <p className="font-mono text-sm text-teal-700">{session.proxy_number}</p>
                <span className={`mt-1 inline-flex px-2 py-0.5 text-xs rounded-full ${session.proxy_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {session.proxy_active ? "Actif" : "Inactif"}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Aucun proxy créé</p>
            )}
          </div>

          {/* Review card */}
          {session.review_rating && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Star className="w-3.5 h-3.5" /> Avis patient
              </h3>
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < (session.review_rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                  />
                ))}
                <span className="text-sm font-semibold text-slate-700 ml-1">
                  {session.review_rating}/5
                </span>
              </div>
              {session.review_comment && (
                <p className="text-sm text-slate-600 italic">&ldquo;{session.review_comment}&rdquo;</p>
              )}
              {session.review_at && (
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(session.review_at).toLocaleDateString("fr-TN")}
                </p>
              )}
            </div>
          )}

          {/* Financial */}
          {(session.fee != null || session.commission != null) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Facturation
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Honoraire</span>
                  <span className="font-medium text-slate-900">
                    {session.fee ? `${(session.fee / 1000).toFixed(3)} DT` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Commission</span>
                  <span className="font-medium text-slate-900">
                    {session.commission ? `${(session.commission / 1000).toFixed(3)} DT` : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Actions
            </h3>

            {session.status === "pending" && (
              <>
                <button
                  onClick={() => setShowForceModal(true)}
                  disabled={busy}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  Forcer l&apos;acceptation
                </button>
                <button
                  onClick={() => setCancelDialog({ reason: "" })}
                  disabled={busy}
                  className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  Annuler la session
                </button>
                <button
                  onClick={() => doAction("extend")}
                  disabled={busy}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  Prolonger de +15 min
                </button>
              </>
            )}

            {session.status === "accepted" && (
              <>
                <button
                  onClick={() => doAction("complete")}
                  disabled={busy}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Marquer terminée
                </button>
                <button
                  onClick={() => setCancelDialog({ reason: "" })}
                  disabled={busy}
                  className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  Annuler la session
                </button>
              </>
            )}

            {["completed", "expired", "cancelled"].includes(session.status) && (
              <p className="text-sm text-slate-400 text-center py-2">Aucune action disponible</p>
            )}
          </div>
        </div>
      </div>

      {/* Force accept modal */}
      {showForceModal && (
        <ForceAcceptModal
          doctors={availableDoctors}
          onAccept={(doctorId) => {
            setShowForceModal(false);
            doAction("force-accept", { doctorId });
          }}
          onClose={() => setShowForceModal(false)}
        />
      )}

      {/* Cancel reason modal */}
      {cancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              Raison d&apos;annulation
            </h2>
            <textarea
              value={cancelDialog.reason}
              onChange={(e) => setCancelDialog({ reason: e.target.value })}
              placeholder="Entrez la raison..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCancelDialog(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  doAction("cancel", { reason: cancelDialog.reason });
                  setCancelDialog(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
