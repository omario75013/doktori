"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Gift } from "lucide-react";

interface Referral {
  id: string;
  status: string;
  createdAt: string;
  validatedAt: string | null;
  referrerId: string;
  referredId: string;
  referrerName: string;
  referredName: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-700" },
  validated: { label: "Validé", className: "bg-blue-50 text-blue-700" },
  rewarded: { label: "Récompensé", className: "bg-green-50 text-green-700" },
};

export function ReferralsTable({ referrals }: { referrals: Referral[] }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return referrals;
    return referrals.filter((r) => r.status === statusFilter);
  }, [referrals, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: referrals.length };
    for (const r of referrals) {
      c[r.status] = (c[r.status] ?? 0) + 1;
    }
    return c;
  }, [referrals]);

  async function updateStatus(id: string, status: "validated" | "rewarded") {
    const label = status === "validated" ? "valider" : "récompenser";
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ce parrainage ?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) startTransition(() => router.refresh());
      else {
        const err = await res.json() as { error: string };
        setError(err.error ?? "Erreur lors de la mise à jour du parrainage.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-700 transition-colors">✕</button>
        </div>
      )}
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {(["all", "pending", "validated", "rewarded"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f === "all"
                ? "Tous"
                : STATUS_CONFIG[f]?.label ?? f}{" "}
              <span className="text-slate-400">({counts[f] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Parrain</th>
              <th className="px-4 py-3 font-semibold">Filleul</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Validé le</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const statusCfg = STATUS_CONFIG[r.status] ?? {
                label: r.status,
                className: "bg-slate-100 text-slate-700",
              };
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.referrerName}</td>
                  <td className="px-4 py-3 text-slate-700">{r.referredName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {r.validatedAt ? new Date(r.validatedAt).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "pending" && (
                        <button
                          onClick={() => updateStatus(r.id, "validated")}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50"
                          title="Valider"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Valider
                        </button>
                      )}
                      {r.status === "validated" && (
                        <button
                          onClick={() => updateStatus(r.id, "rewarded")}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50"
                          title="Récompenser"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          Récompenser
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  Aucun parrainage trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
