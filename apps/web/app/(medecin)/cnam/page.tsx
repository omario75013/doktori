"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, Printer, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";

type Claim = {
  id: string;
  cnamNumber: string;
  patientRole: "assure" | "ayant_droit";
  amount: number;
  consultationDate: string;
  status: "draft" | "submitted" | "reimbursed" | "rejected";
  submittedAt: string | null;
  reimbursedAt: string | null;
  createdAt: string;
  patientName: string;
  patientId: string;
};

type Response = {
  rows: Claim[];
  totals: { count: number; amount: number; byStatus: Record<string, number> };
};

const STATUS_LABELS: Record<Claim["status"], string> = {
  draft: "Brouillon",
  submitted: "Soumis",
  reimbursed: "Remboursé",
  rejected: "Rejeté",
};

const STATUS_STYLES: Record<Claim["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  reimbursed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<Claim["status"], React.ComponentType<{ className?: string }>> = {
  draft: FileText,
  submitted: Clock,
  reimbursed: CheckCircle2,
  rejected: XCircle,
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function CnamPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cnam/claims?month=${month}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: Claim["status"]) {
    setUpdating(id);
    const res = await fetch(`/api/cnam/claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    if (res.ok) load();
  }

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { count: 0, amount: 0, byStatus: {} };
  const monthLabel = month ? format(parseISO(`${month}-01`), "MMMM yyyy", { locale: fr }) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bordereaux CNAM</h1>
          <p className="text-sm text-gray-500">Tiers-payant — {monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm"
          />
          <a
            href={`/api/cnam/claims/export?month=${month}`}
            className="inline-flex items-center gap-1 rounded-md bg-teal-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-teal-700"
          >
            <Download className="w-4 h-4" />
            CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard label="Bordereaux" value={totals.count.toString()} accent="bg-slate-100 text-slate-800" />
        <StatCard
          label="Montant total"
          value={`${((totals.amount || 0) / 1000).toFixed(0)} DT`}
          accent="bg-teal-50 text-teal-800"
        />
        <StatCard
          label="Remboursés"
          value={`${((totals.byStatus.reimbursed || 0) / 1000).toFixed(0)} DT`}
          accent="bg-green-50 text-green-800"
        />
        <StatCard
          label="En attente"
          value={`${(((totals.byStatus.draft || 0) + (totals.byStatus.submitted || 0)) / 1000).toFixed(0)} DT`}
          accent="bg-orange-50 text-orange-800"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            Aucun bordereau pour {monthLabel}. Créez-en un depuis un rendez-vous terminé.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="px-4 py-3 font-medium text-gray-600">N° CNAM</th>
                <th className="px-4 py-3 font-medium text-gray-600">Montant</th>
                <th className="px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const Icon = STATUS_ICONS[r.status];
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {format(parseISO(r.consultationDate), "d MMM yyyy", { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.patientName}</div>
                      <div className="text-xs text-gray-400">
                        {r.patientRole === "assure" ? "Assuré" : "Ayant-droit"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.cnamNumber}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {(r.amount / 1000).toFixed(0)} DT
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${STATUS_STYLES[r.status]}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <a
                          href={`/cnam/${r.id}/print`}
                          target="_blank"
                          rel="noopener"
                          className="text-xs px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-100 inline-flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          Imprimer
                        </a>
                        {r.status === "draft" && (
                          <button
                            disabled={updating === r.id}
                            onClick={() => updateStatus(r.id, "submitted")}
                            className="text-xs px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                          >
                            Marquer soumis
                          </button>
                        )}
                        {r.status === "submitted" && (
                          <button
                            disabled={updating === r.id}
                            onClick={() => updateStatus(r.id, "reimbursed")}
                            className="text-xs px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40"
                          >
                            Marquer remboursé
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4`}>
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent.includes("text-") ? accent.split(" ").find((c) => c.startsWith("text-")) : "text-gray-900"}`}>
        {value}
      </div>
    </div>
  );
}
