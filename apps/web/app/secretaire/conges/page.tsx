"use client";

import { useEffect, useState, useCallback } from "react";
import { Plane, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type TimeOff = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  createdAt: string;
};

export default function SecretaryConges() {
  const [list, setList] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<number | null>(null);
  const [balance, setBalance] = useState<{ accrued: number; used: number; balance: number } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!meId) return;
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/secretaries/${meId}/time-off`),
        fetch(`/api/secretaries/${meId}/leave-balance`),
      ]);
      if (r1.ok) setList(await r1.json());
      if (r2.ok) setBalance(await r2.json());
    } finally {
      setLoading(false);
    }
  }, [meId]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setMeId(s?.user?.id ?? null));
    fetch("/api/secretary/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.monthlyDayOffAllowance != null) setAllowance(Number(d.monthlyDayOffAllowance));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!meId || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/secretaries/${meId}/time-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          reason: reason.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Demande envoyée");
      setStartDate("");
      setEndDate("");
      setReason("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const approvedDays = list
    .filter((x) => x.status === "approved")
    .reduce((sum, x) => sum + (differenceInCalendarDays(new Date(x.endDate), new Date(x.startDate)) + 1), 0);
  const pending = list.filter((x) => x.status === "pending").length;
  const denied = list.filter((x) => x.status === "denied").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Plane className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mes congés</h1>
          <p className="text-sm text-gray-500">Demandes à valider par le médecin</p>
        </div>
      </div>

      {balance && (
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            balance.balance < 0
              ? "border-red-200 bg-red-50"
              : "border-teal-200 bg-teal-50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Solde total
              </p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  balance.balance < 0 ? "text-red-700" : "text-teal-700"
                }`}
              >
                {balance.balance > 0 ? "+" : ""}
                {balance.balance.toFixed(1)} j
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {balance.accrued.toFixed(1)} jours cumulés − {balance.used} jours pris
              </p>
            </div>
            <Plane
              className={`h-10 w-10 ${
                balance.balance < 0 ? "text-red-300" : "text-teal-300"
              }`}
            />
          </div>
          {balance.balance < 0 && (
            <p className="mt-3 text-xs text-red-700 font-medium">
              ⚠ Solde négatif — vous avez pris plus de jours que votre quota cumulé
              depuis votre date d&apos;embauche.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Plane className="h-4 w-4 text-primary" />}
          label="Quota mensuel"
          value={allowance != null ? allowance : "—"}
          color="teal"
        />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} label="Jours pris" value={approvedDays} color="green" />
        <StatCard icon={<Clock className="h-4 w-4 text-orange-600" />} label="En attente" value={pending} color="orange" />
        <StatCard icon={<XCircle className="h-4 w-4 text-gray-500" />} label="Refusés" value={denied} color="gray" />
      </div>
      {allowance != null && (
        <p className="text-xs text-gray-500">
          Vous disposez de <strong>{allowance} jour(s)</strong> de congé par mois. Les demandes dépassant ce quota nécessiteront une validation exceptionnelle du médecin.
        </p>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-border bg-white shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-foreground">Nouvelle demande</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Date début *</span>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Date fin *</span>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-gray-600">Motif (facultatif)</span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </label>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Envoi…" : "Envoyer la demande"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-border bg-white shadow-sm p-5">
        <h2 className="font-semibold text-foreground mb-3">Historique</h2>
        {loading ? (
          <div className="py-6 text-center">
            <Loader2 className="h-4 w-4 animate-spin inline" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-4 text-sm text-gray-400 italic">Aucune demande</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((r) => {
              const days = differenceInCalendarDays(new Date(r.endDate), new Date(r.startDate)) + 1;
              return (
                <li key={r.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {format(new Date(r.startDate), "d MMM yyyy", { locale: fr })} →{" "}
                      {format(new Date(r.endDate), "d MMM yyyy", { locale: fr })}
                      <span className="text-gray-400 font-normal ml-2">({days} j)</span>
                    </p>
                    {r.reason && <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Demande du {format(new Date(r.createdAt), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: "green" | "orange" | "gray" | "teal";
}) {
  const bg: Record<string, string> = {
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
    gray: "bg-gray-50 border-gray-200",
    teal: "bg-teal-50 border-teal-200",
  };
  return (
    <div className={`rounded-2xl border p-4 ${bg[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs font-semibold text-gray-600">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-orange-100 text-orange-700" },
    approved: { label: "Approuvé", cls: "bg-green-100 text-green-700" },
    denied: { label: "Refusé", cls: "bg-gray-100 text-gray-500" },
  };
  const cfg = m[status] ?? m.pending;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
