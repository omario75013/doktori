"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, DollarSign } from "lucide-react";

interface DoctorReferral {
  id: string;
  status: string;
  commissionPct: number;
  rewardsEarnedTnd: number;
  validatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  referrerId: string;
  referredId: string;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-700" },
  validated: { label: "Validé", className: "bg-green-50 text-green-700" },
  rejected: { label: "Rejeté", className: "bg-red-50 text-red-700" },
};

export function DoctorReferralsTable({
  referrals,
}: {
  referrals: DoctorReferral[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  async function validate(id: string) {
    if (!confirm("Valider ce parrainage ? (commission 5% sera attribuée)")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/doctor-referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate" }),
      });
      if (res.ok) {
        startTransition(() => router.refresh());
      } else {
        const err = (await res.json()) as { error?: string };
        setError(err.error ?? "Erreur lors de la validation");
      }
    } finally {
      setBusy(false);
    }
  }

  async function reject(id: string) {
    const reason = prompt("Raison du rejet (optionnel) :") ?? undefined;
    if (!confirm("Rejeter définitivement ce parrainage ?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/doctor-referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });
      if (res.ok) {
        startTransition(() => router.refresh());
      } else {
        const err = (await res.json()) as { error?: string };
        setError(err.error ?? "Erreur lors du rejet");
      }
    } finally {
      setBusy(false);
    }
  }

  async function setRewards(id: string, current: number) {
    const raw = prompt(
      "Récompenses gagnées en TND (montant total cumulé) :",
      String(current)
    );
    if (raw === null) return;
    const value = Number(raw);
    if (!isFinite(value) || value < 0) {
      alert("Montant invalide");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/doctor-referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_rewards", rewardsEarnedTnd: value }),
      });
      if (res.ok) {
        startTransition(() => router.refresh());
      } else {
        const err = (await res.json()) as { error?: string };
        setError(err.error ?? "Erreur");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2 flex-wrap">
        <h2 className="font-semibold text-slate-900 mr-auto">Tous les parrainages</h2>
        {(["all", "pending", "validated", "rejected"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s === "all" ? "Tous" : STATUS_CONFIG[s]?.label ?? s} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {error && (
        <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3">Parrain</th>
              <th className="text-left px-5 py-3">Filleul</th>
              <th className="text-left px-5 py-3">Statut</th>
              <th className="text-left px-5 py-3">Commission</th>
              <th className="text-left px-5 py-3">Gains</th>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                  Aucun parrainage
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? {
                  label: r.status,
                  className: "bg-slate-100 text-slate-600",
                };
                return (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{r.referrerName}</div>
                      <div className="text-xs text-slate-400">{r.referrerEmail}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{r.referredName}</div>
                      <div className="text-xs text-slate-400">{r.referredEmail}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.className}`}
                      >
                        {cfg.label}
                      </span>
                      {r.rejectionReason && (
                        <div className="text-xs text-red-500 mt-1 italic">
                          {r.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {r.commissionPct}%
                    </td>
                    <td className="px-5 py-3 font-semibold text-emerald-600">
                      {r.rewardsEarnedTnd.toFixed(2)} TND
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                      {r.validatedAt && (
                        <div className="text-emerald-600">
                          ✓ {new Date(r.validatedAt).toLocaleDateString("fr-FR")}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {r.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => validate(r.id)}
                              disabled={busy}
                              className="px-2 py-1 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Valider
                            </button>
                            <button
                              type="button"
                              onClick={() => reject(r.id)}
                              disabled={busy}
                              className="px-2 py-1 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              Rejeter
                            </button>
                          </>
                        )}
                        {r.status === "validated" && (
                          <button
                            type="button"
                            onClick={() => setRewards(r.id, r.rewardsEarnedTnd)}
                            disabled={busy}
                            className="px-2 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <DollarSign className="h-3 w-3" />
                            Gains
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
