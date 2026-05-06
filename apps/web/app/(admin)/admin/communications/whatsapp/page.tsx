"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  Eye,
  MessageCircle,
  Send,
  XCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WaStatus = "queued" | "sent" | "delivered" | "read" | "failed";

type WhatsappLog = {
  id: string;
  recipientPhone: string;
  recipientType: string | null;
  recipientId: string | null;
  body: string;
  status: string;
  providerMessageId: string | null;
  error: string | null;
  triggeredByAdminId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
};

type Filters = {
  status: string;
  recipientType: string;
  since: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, "•") + phone.slice(-4);
}

function truncate(s: string, max = 80): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

const STATUS_LABELS: Record<WaStatus, string> = {
  queued: "En file",
  sent: "Envoyé",
  delivered: "Livré",
  read: "Lu",
  failed: "Échoué",
};

const RECIPIENT_TYPES = [
  { value: "", label: "Tous" },
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Médecin" },
  { value: "secretary", label: "Secrétaire" },
  { value: "admin", label: "Admin" },
];

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = (status as WaStatus) ?? "queued";
  const styles: Record<WaStatus, string> = {
    queued: "bg-slate-50 text-slate-700 ring-slate-200",
    sent: "bg-blue-50 text-blue-700 ring-blue-200",
    delivered: "bg-green-50 text-green-700 ring-green-200",
    read: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    failed: "bg-red-50 text-red-700 ring-red-200",
  };
  const icons: Record<WaStatus, React.ReactNode> = {
    queued: <Clock className="w-3 h-3" />,
    sent: <Send className="w-3 h-3" />,
    delivered: <CheckCircle2 className="w-3 h-3" />,
    read: <Eye className="w-3 h-3" />,
    failed: <XCircle className="w-3 h-3" />,
  };
  const styleKey: WaStatus = (["queued", "sent", "delivered", "read", "failed"].includes(s)
    ? s
    : "queued") as WaStatus;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[styleKey]}`}
    >
      {icons[styleKey]}
      {STATUS_LABELS[styleKey] ?? status}
    </span>
  );
}

export default function AdminWhatsappLogsPage() {
  const [filters, setFilters] = useState<Filters>({
    status: "",
    recipientType: "",
    since: "",
  });
  const [logs, setLogs] = useState<WhatsappLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  const load = useCallback(
    async (currentOffset: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.recipientType) params.set("recipientType", filters.recipientType);
        if (filters.since) {
          const d = new Date(filters.since);
          if (!isNaN(d.getTime())) params.set("since", d.toISOString());
        }
        params.set("limit", String(limit));
        params.set("offset", String(currentOffset));

        const res = await fetch(
          `/api/admin/communications/whatsapp?${params.toString()}`
        );
        if (!res.ok) {
          setError("Erreur de chargement");
          setLogs([]);
          setTotal(0);
          return;
        }
        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setError("Erreur réseau");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    setOffset(0);
    load(0);
  }, [load]);

  function goTo(newOffset: number) {
    setOffset(newOffset);
    load(newOffset);
  }

  const hasNext = offset + limit < total;
  const hasPrev = offset > 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Logs WhatsApp</h1>
        </div>
        <p className="text-slate-500 ml-12">
          Historique des messages WhatsApp envoyés via la plateforme.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Statut
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Tous</option>
            <option value="queued">En file</option>
            <option value="sent">Envoyé</option>
            <option value="delivered">Livré</option>
            <option value="read">Lu</option>
            <option value="failed">Échoué</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Destinataire
          </label>
          <select
            value={filters.recipientType}
            onChange={(e) =>
              setFilters({ ...filters, recipientType: e.target.value })
            }
            className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {RECIPIENT_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Depuis
          </label>
          <input
            type="date"
            value={filters.since}
            onChange={(e) => setFilters({ ...filters, since: e.target.value })}
            className="text-sm rounded-lg border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Total */}
      <div className="text-sm text-slate-500 mb-3 tabular-nums">
        {total.toLocaleString("fr-FR")} message{total > 1 ? "s" : ""}
      </div>

      {/* Table */}
      {error ? (
        <p className="text-red-500 text-sm bg-red-50 rounded-xl border border-red-200 p-4">
          {error}
        </p>
      ) : loading && logs.length === 0 ? (
        <p className="text-slate-400 text-sm">Chargement…</p>
      ) : logs.length === 0 ? (
        <p className="text-slate-400 text-sm bg-white rounded-xl border border-slate-200 p-8 text-center">
          Aucun message WhatsApp trouvé
        </p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Destinataire
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Provider ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Livré
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), "d MMM yyyy HH:mm", {
                        locale: fr,
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      {maskPhone(log.recipientPhone)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.recipientType ?? "—"}
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <p className="text-slate-700 truncate" title={log.body}>
                        {truncate(log.body)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs text-slate-500 truncate max-w-[180px]"
                      title={log.providerMessageId ?? ""}
                    >
                      {log.providerMessageId
                        ? truncate(log.providerMessageId, 18)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {log.deliveredAt
                        ? format(new Date(log.deliveredAt), "d MMM HH:mm", {
                            locale: fr,
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(hasPrev || hasNext) && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-slate-500 tabular-nums">
                {offset + 1}–{Math.min(offset + limit, total)} sur{" "}
                {total.toLocaleString("fr-FR")}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goTo(Math.max(0, offset - limit))}
                  disabled={!hasPrev || loading}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => goTo(offset + limit)}
                  disabled={!hasNext || loading}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
