"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Check, MessageSquare, Star, X } from "lucide-react";

type ReplyStatus = "pending" | "approved" | "rejected";

type Reply = {
  id: string;
  body: string;
  status: ReplyStatus;
  createdAt: string;
  moderatedAt: string | null;
  rejectionReason: string | null;
  reviewId: string;
  doctorId: string;
  doctorName: string | null;
  reviewBody: string | null;
  reviewRating: number | null;
};

const STATUS_LABELS: Record<ReplyStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
};

const STATUS_STYLES: Record<ReplyStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-green-50 text-green-700 ring-green-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

function StatusBadge({ status }: { status: ReplyStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function StarRow({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-slate-400 text-xs">—</span>;
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

export default function AdminReviewRepliesPage() {
  const [status, setStatus] = useState<ReplyStatus>("pending");
  const [rows, setRows] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/review-replies?status=${status}`);
    if (res.ok) {
      const data = (await res.json()) as { replies: Reply[] };
      setRows(data.replies);
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setActingOn(id);
    const res = await fetch(`/api/admin/review-replies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setActingOn(null);
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function reject(id: string) {
    const reason = window.prompt(
      "Motif du rejet (visible uniquement par le médecin) :"
    );
    if (!reason || reason.trim().length < 3) return;
    setActingOn(id);
    const res = await fetch(`/api/admin/review-replies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionReason: reason.trim() }),
    });
    setActingOn(null);
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/reviews"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux avis
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-teal-600" />
            Réponses médecins à modérer
          </h1>
          <p className="text-slate-500 mt-1">
            Approuvez ou rejetez les réponses publiques des médecins aux avis
            patients.
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5">
        {(Object.keys(STATUS_LABELS) as ReplyStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              status === s
                ? "bg-teal-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-slate-400 text-sm">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400 text-sm bg-white rounded-xl border border-slate-200 p-8 text-center">
          Aucune réponse {STATUS_LABELS[status].toLowerCase()}.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <article
              key={r.id}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              {/* Original review */}
              <div className="border-l-2 border-slate-200 pl-3 mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">
                    Avis patient
                  </span>
                  <StarRow rating={r.reviewRating} />
                </div>
                <p className="text-sm text-slate-600 italic">
                  {r.reviewBody ?? <span className="text-slate-400">(sans commentaire)</span>}
                </p>
              </div>

              {/* Doctor reply */}
              <div className="bg-teal-50/40 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-900">
                    Réponse de Dr {r.doctorName ?? "—"}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                  {r.body}
                </p>
                {r.rejectionReason && (
                  <p className="text-xs text-red-600 mt-2">
                    Motif du rejet : {r.rejectionReason}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Soumise le {format(new Date(r.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                  {r.moderatedAt && (
                    <>
                      {" · "}
                      modérée le {format(new Date(r.moderatedAt), "d MMM yyyy HH:mm", { locale: fr })}
                    </>
                  )}
                </span>

                {r.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approve(r.id)}
                      disabled={actingOn === r.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approuver
                    </button>
                    <button
                      onClick={() => reject(r.id)}
                      disabled={actingOn === r.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 border border-red-200 disabled:opacity-50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
