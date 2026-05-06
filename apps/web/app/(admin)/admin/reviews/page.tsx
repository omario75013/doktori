"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import {
  Star,
  Check,
  X,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  MessageSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  status: "pending" | "published" | "rejected";
  rejectionReason: string | null;
  moderatedByName: string | null;
  moderatedAt: string | null;
  createdAt: string;
  doctorName: string;
  doctorSlug: string;
  patientName: string;
};

type StatusFilter = "pending" | "published" | "rejected";

const REJECTION_PRESETS = [
  "Contenu offensant",
  "Faux avis",
  "Doublon",
  "Hors sujet",
  "Violation de la vie privée",
  "Contenu commercial",
  "Autre",
] as const;

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: "En attente",
  published: "Publiés",
  rejected: "Rejetés",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Review["status"] }) {
  const styles: Record<Review["status"], string> = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    published: "bg-green-50 text-green-700 ring-green-200",
    rejected: "bg-red-50 text-red-700 ring-red-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-500">{rating}/5</span>
    </span>
  );
}

// ─── Rejection Modal ──────────────────────────────────────────────────────────

function RejectionModal({
  reviewId,
  onClose,
  onRejected,
}: {
  reviewId: string;
  onClose: () => void;
  onRejected: (id: string) => void;
}) {
  const [preset, setPreset] = useState<string>(REJECTION_PRESETS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const rejectionReason = details.trim()
      ? `${preset}: ${details.trim()}`
      : preset;

    const res = await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionReason }),
    });

    setSubmitting(false);

    if (res.ok) {
      onRejected(reviewId);
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Erreur lors du rejet");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-slate-900">Rejeter cet avis</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motif
            </label>
            <div className="relative">
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {REJECTION_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Détails supplémentaires{" "}
              <span className="text-slate-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Précisez si nécessaire..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Rejet en cours…" : "Confirmer le rejet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ rows }: { rows: Review[] }) {
  const total = rows.length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const rejected = rows.filter((r) => r.status === "rejected").length;
  const avgRating =
    total > 0
      ? (rows.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
      : "—";

  const stats = [
    { label: "Total affiché", value: total },
    { label: "Note moyenne", value: avgRating },
    { label: "En attente", value: pending },
    { label: "Rejetés", value: rejected },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

type Filters = {
  statuses: StatusFilter[];
  ratings: number[];
  from: string;
  to: string;
};

function FiltersBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  function toggleStatus(s: StatusFilter) {
    const next = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: next.length > 0 ? next : [s] });
  }

  function toggleRating(r: number) {
    const next = filters.ratings.includes(r)
      ? filters.ratings.filter((x) => x !== r)
      : [...filters.ratings, r];
    onChange({ ...filters, ratings: next });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-6">
      {/* Status */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Statut</p>
        <div className="flex gap-2 flex-wrap">
          {(["pending", "published", "rejected"] as StatusFilter[]).map((s) => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.statuses.includes(s)}
                onChange={() => toggleStatus(s)}
                className="rounded accent-teal-600"
              />
              <span className="text-sm text-slate-700">{STATUS_LABELS[s]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Note</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((r) => (
            <label key={r} className="flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.ratings.includes(r)}
                onChange={() => toggleRating(r)}
                className="rounded accent-teal-600"
              />
              <span className="text-sm text-slate-700">{r}★</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Période</p>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="text-sm rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-slate-400 text-sm">→</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="text-sm rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminReviewsPage() {
  const [filters, setFilters] = useState<Filters>({
    statuses: ["pending"],
    ratings: [],
    from: "",
    to: "",
  });
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [smartBulkLoading, setSmartBulkLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());

    const params = new URLSearchParams();
    params.set("status", filters.statuses.join(","));
    if (filters.ratings.length > 0) params.set("ratings", filters.ratings.join(","));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    const res = await fetch(`/api/admin/reviews?${params.toString()}`);
    if (res.ok) setRows(await res.json());
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setUpdating(id);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    setUpdating(null);
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function bulkApprove() {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const res = await fetch("/api/admin/reviews/bulk-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    setBulkLoading(false);
    if (res.ok) {
      setRows((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
    }
  }

  async function smartBulkApprove() {
    const ok = window.confirm(
      "Approuver tous les avis 5★ en attente des 7 derniers jours ?"
    );
    if (!ok) return;
    setSmartBulkLoading(true);
    const res = await fetch("/api/admin/reviews/bulk-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { minRating: 5 } }),
    });
    setSmartBulkLoading(false);
    if (res.ok) {
      const data = (await res.json()) as { approved: number };
      window.alert(`${data.approved} avis approuvés.`);
      load();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(data.error ?? "Erreur lors de l'approbation en masse");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  const pendingRows = rows.filter((r) => r.status === "pending");
  const showBulk = selected.size > 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Modération des avis</h1>
          <p className="text-slate-500 mt-1">
            Approuvez ou rejetez les avis patients avant publication.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={smartBulkApprove}
            disabled={smartBulkLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            title="Approuver tous les 5★ en attente des 7 derniers jours"
          >
            <Sparkles className="w-4 h-4" />
            {smartBulkLoading ? "Approbation…" : "Approuver 5★ (7j)"}
          </button>
          <Link
            href="/admin/reviews/replies"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Réponses médecins
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StatsBar rows={rows} />

      {/* Filters */}
      <FiltersBar filters={filters} onChange={setFilters} />

      {/* Bulk action bar */}
      {showBulk && (
        <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4">
          <span className="text-sm font-semibold text-teal-800">
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
          </span>
          <button
            onClick={bulkApprove}
            disabled={bulkLoading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            {bulkLoading ? "Approbation…" : "Approuver la sélection"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-slate-500 hover:text-slate-700 ml-auto"
          >
            Tout désélectionner
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400 text-sm bg-white rounded-xl border border-slate-200 p-8 text-center">
          Aucun avis pour ces filtres.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === rows.length && rows.length > 0}
                    onChange={toggleAll}
                    className="rounded accent-teal-600"
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Médecin</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Patient</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Note</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Commentaire</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Modéré par</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Modéré le</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    selected.has(r.id) ? "bg-teal-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="rounded accent-teal-600"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {r.doctorName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.patientName}</td>
                  <td className="px-4 py-3">
                    <StarRow rating={r.rating} />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {r.comment ? (
                      <p className="text-slate-700 truncate" title={r.comment}>
                        {r.comment.length > 80 ? r.comment.slice(0, 80) + "…" : r.comment}
                      </p>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Aucun commentaire</span>
                    )}
                    {r.rejectionReason && (
                      <p className="text-xs text-red-500 mt-0.5 truncate" title={r.rejectionReason}>
                        Motif : {r.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {r.moderatedByName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {r.moderatedAt
                      ? format(new Date(r.moderatedAt), "d MMM yyyy HH:mm", { locale: fr })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {format(new Date(r.createdAt), "d MMM yyyy", { locale: fr })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.status !== "published" && (
                        <button
                          disabled={updating === r.id}
                          onClick={() => approve(r.id)}
                          title="Approuver"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approuver
                        </button>
                      )}
                      {r.status !== "rejected" && (
                        <button
                          disabled={updating === r.id}
                          onClick={() => setRejectTarget(r.id)}
                          title="Rejeter"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
                        >
                          <X className="w-3.5 h-3.5" />
                          Rejeter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rejection modal */}
      {rejectTarget && (
        <RejectionModal
          reviewId={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={(id) => setRows((prev) => prev.filter((r) => r.id !== id))}
        />
      )}
    </div>
  );
}
