"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";

type Preview = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  patientPhone: string;
};

const ALL_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmé" },
  { value: "completed", label: "Terminé" },
  { value: "cancelled", label: "Annulé" },
  { value: "no_show", label: "Absent" },
] as const;

const DEFAULT_FROM = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 16);
};

const DEFAULT_TO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(23, 59, 0, 0);
  return d.toISOString().slice(0, 16);
};

export default function BulkCancelPage() {
  const [from, setFrom] = useState<string>(DEFAULT_FROM());
  const [to, setTo] = useState<string>(DEFAULT_TO());
  const [doctorId, setDoctorId] = useState<string>("");
  const [statuses, setStatuses] = useState<string[]>(["pending", "confirmed"]);
  const [reason, setReason] = useState<string>("");

  const [preview, setPreview] = useState<Preview[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    cancelled: number;
    skipped: number;
    errors: { id: string; error: string }[];
    total: number;
  } | null>(null);

  function toggleStatus(s: string) {
    setStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function loadPreview() {
    setError(null);
    setResult(null);
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      if (doctorId) params.set("doctorId", doctorId);
      for (const s of statuses) params.append("status", s);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/appointments?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur lors du chargement");
      }
      const data = (await res.json()) as { appointments: Preview[] };
      setPreview(data.appointments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function bulkCancel() {
    if (!preview || preview.length === 0) return;
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const ids = preview.slice(0, 100).map((p) => p.id);
      const res = await fetch(`/api/admin/appointments/bulk-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentIds: ids, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de l'annulation en masse");
      }
      setResult(data);
      // Refresh preview to reflect new state
      await loadPreview();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  const reasonValid = reason.trim().length >= 10;
  const canSubmit =
    !!preview && preview.length > 0 && reasonValid && !submitting;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link
        href="/admin/rendez-vous"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux rendez-vous
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Annulation en masse</h1>
        <p className="text-slate-500 mt-1">
          Filtrez les rendez-vous puis annulez-les en une seule opération (max
          100 par appel).
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          Cette action enregistre une entrée d&apos;audit par rendez-vous. Les
          rendez-vous déjà <em>annulés</em> ou <em>terminés</em> sont ignorés
          automatiquement.
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Filtres</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              De
            </label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              À
            </label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              ID médecin (optionnel)
            </label>
            <input
              type="text"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              placeholder="UUID du médecin"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Statuts à inclure
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => {
                const active = statuses.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleStatus(s.value)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      active
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={loadPreview}
            disabled={previewLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg"
          >
            {previewLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Aperçu
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Aperçu — {preview.length} rendez-vous
              {preview.length === 100 && (
                <span className="ml-1 text-amber-600 font-normal">
                  (limite atteinte)
                </span>
              )}
            </h2>
          </div>
          {preview.length === 0 ? (
            <div className="p-8 text-sm text-center text-slate-500">
              Aucun rendez-vous correspondant aux filtres.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Médecin</th>
                    <th className="px-4 py-2">Patient</th>
                    <th className="px-4 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700">
                        {new Date(p.startsAt).toLocaleString("fr-TN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{p.doctorName}</td>
                      <td className="px-4 py-2 text-slate-700">{p.patientName}</td>
                      <td className="px-4 py-2 text-slate-500">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reason + submit */}
      {preview && preview.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Raison de l&apos;annulation (min. 10 caractères) *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex: Cabinet fermé exceptionnellement le 15/05 (panne)…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            {reason.trim().length} caractères
          </p>

          <button
            onClick={bulkCancel}
            disabled={!canSubmit}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Annuler {preview.length} rendez-vous
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3">
          <div className="font-semibold">Opération terminée</div>
          <ul className="mt-1 list-disc list-inside text-green-700">
            <li>Annulés : {result.cancelled}</li>
            <li>Ignorés : {result.skipped}</li>
            <li>Erreurs : {result.errors.length}</li>
            <li>Total demandé : {result.total}</li>
          </ul>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">Détails des erreurs</summary>
              <ul className="mt-1 text-xs font-mono">
                {result.errors.map((er) => (
                  <li key={er.id}>
                    {er.id.slice(0, 8)}…: {er.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
