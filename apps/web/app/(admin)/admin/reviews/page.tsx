"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Star, Check, X } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  status: "pending" | "published" | "rejected";
  createdAt: string;
  doctorName: string;
  doctorSlug: string;
  patientName: string;
};

type Tab = "pending" | "published" | "rejected";

const TAB_LABELS: Record<Tab, string> = {
  pending: "En attente",
  published: "Publiés",
  rejected: "Rejetés",
};

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reviews?status=${tab}`);
    if (res.ok) setRows(await res.json());
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function moderate(id: string, status: "published" | "rejected") {
    setUpdating(id);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Modération des avis</h1>
        <p className="text-slate-500 mt-1">
          Approuvez ou rejetez les avis patients avant publication.
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === t
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400 text-sm bg-white rounded-xl border border-slate-200 p-8 text-center">
          Aucun avis {TAB_LABELS[tab].toLowerCase()}.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900">{r.doctorName}</span>
                  <span className="text-xs text-slate-400">
                    · {r.patientName} · {format(new Date(r.createdAt), "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-xs font-semibold text-slate-500">{r.rating}/5</span>
                </div>
                {r.comment && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.comment}</p>
                )}
              </div>
              {tab === "pending" && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    disabled={updating === r.id}
                    onClick={() => moderate(r.id, "published")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Publier
                  </button>
                  <button
                    disabled={updating === r.id}
                    onClick={() => moderate(r.id, "rejected")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rejeter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
