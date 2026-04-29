"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Download, Printer, FileText, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

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

function getStatusLabels(t: ReturnType<typeof useTranslations<"medecin.cnam">>) {
  return {
    draft: t("statusDraft"),
    submitted: t("statusSubmitted"),
    reimbursed: t("statusReimbursed"),
    rejected: t("statusRejected"),
  };
}

const STATUS_STYLES: Record<Claim["status"], string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  reimbursed: "bg-secondary text-primary",
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
  const t = useTranslations("medecin.cnam");
  const tCommon = useTranslations("medecin.common");
  const STATUS_LABELS = getStatusLabels(t);

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
    if (res.ok) {
      toast.success(status === "submitted" ? t("markedSubmitted") : t("markedReimbursed"));
      load();
    } else {
      toast.error(t("statusUpdateError"));
    }
  }

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { count: 0, amount: 0, byStatus: {} };
  const monthLabel = month ? format(parseISO(`${month}-01`), "MMMM yyyy", { locale: fr }) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-sm text-gray-500">{t("subtitle", { monthLabel })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-xl border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <a
            href={`/api/cnam/claims/export?month=${month}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-doktori-teal-dark transition-colors h-10"
          >
            <Download className="w-4 h-4" />
            CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard label={t("claims")} value={totals.count.toString()} valueColor="text-foreground" />
        <StatCard
          label={t("totalAmount")}
          value={`${((totals.amount || 0) / 1000).toFixed(0)} DT`}
          valueColor="text-primary"
        />
        <StatCard
          label={t("reimbursed")}
          value={`${((totals.byStatus.reimbursed || 0) / 1000).toFixed(0)} DT`}
          valueColor="text-green-600"
        />
        <StatCard
          label={t("pending")}
          value={`${(((totals.byStatus.draft || 0) + (totals.byStatus.submitted || 0)) / 1000).toFixed(0)} DT`}
          valueColor="text-orange-600"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">Aucun bordereau pour {monthLabel}</p>
          <p className="text-gray-400 text-sm">{t("createFromCompleted")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white dark:bg-gray-800 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border dark:border-gray-700 bg-secondary dark:bg-gray-700/50 text-left">
                <th className="px-4 py-3 font-medium text-foreground">{tCommon("date")}</th>
                <th className="px-4 py-3 font-medium text-foreground">Patient</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("cnamNumber")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{tCommon("amount")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{tCommon("status")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-gray-700">
              {rows.map((r) => {
                const Icon = STATUS_ICONS[r.status];
                return (
                  <tr key={r.id} className="hover:bg-secondary dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {format(parseISO(r.consultationDate), "d MMM yyyy", { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.patientName}</div>
                      <div className="text-xs text-gray-400">
                        {r.patientRole === "assure" ? t("insured") : t("beneficiary")}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.cnamNumber}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {(r.amount / 1000).toFixed(0)} DT
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[r.status]}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a
                          href={`/cnam/${r.id}/print`}
                          target="_blank"
                          rel="noopener"
                          className="text-xs px-2.5 py-1.5 rounded-xl border border-border bg-white hover:bg-secondary inline-flex items-center gap-1 transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          {tCommon("print")}
                        </a>
                        {r.status === "draft" && (
                          <button
                            disabled={updating === r.id}
                            onClick={() => updateStatus(r.id, "submitted")}
                            className="text-xs px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                          >
                            {t("markSubmitted")}
                          </button>
                        )}
                        {r.status === "submitted" && (
                          <button
                            disabled={updating === r.id}
                            onClick={() => updateStatus(r.id, "reimbursed")}
                            className="text-xs px-2.5 py-1.5 rounded-xl border border-border bg-secondary text-primary hover:bg-border disabled:opacity-40 transition-colors"
                          >
                            {t("markReimbursed")}
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

function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}
