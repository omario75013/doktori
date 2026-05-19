import { db, supportTickets } from "@doktori/db";
import { desc, eq, sql } from "drizzle-orm";
import { AdminPagination } from "@/components/admin/pagination";
import { parsePageParams } from "@/lib/admin-pagination";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "open", "in_progress", "waiting_user", "resolved", "closed"] as const;
type FilterStatus = (typeof STATUSES)[number];

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting_user: "Attente client",
  resolved: "Résolu",
  closed: "Fermé",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const statusParam = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const activeFilter: FilterStatus =
    STATUSES.includes(statusParam as FilterStatus) && statusParam ? (statusParam as FilterStatus) : "all";
  const { page, pageSize, offset } = parsePageParams(sp);

  const counts = await db
    .select({
      status: supportTickets.status,
      count: sql<number>`count(*)::int`,
    })
    .from(supportTickets)
    .groupBy(supportTickets.status);
  const countByStatus = new Map(counts.map((c) => [c.status, Number(c.count)]));
  const totalAll = counts.reduce((s, c) => s + Number(c.count), 0);
  const totalFiltered = activeFilter === "all" ? totalAll : countByStatus.get(activeFilter) ?? 0;

  const baseQuery = db.select().from(supportTickets);
  const rows = await (activeFilter === "all"
    ? baseQuery
    : baseQuery.where(eq(supportTickets.status, activeFilter))
  )
    .orderBy(desc(supportTickets.lastMessageAt))
    .limit(pageSize)
    .offset(offset);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
          <LifeBuoy className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Support</h1>
          <p className="text-slate-500 mt-1">Tickets ouverts par les utilisateurs</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map((s) => {
          const c = s === "all" ? totalAll : countByStatus.get(s) ?? 0;
          const isActive = activeFilter === s;
          return (
            <Link
              key={s}
              href={s === "all" ? "/admin/support" : `/admin/support?status=${s}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" ? "Tous" : STATUS_LABELS[s] ?? s}
              <span className={`ml-1.5 text-xs ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                {c}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Sujet</th>
                <th className="px-4 py-3 font-semibold">Demandeur</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Priorité</th>
                <th className="px-4 py-3 font-semibold">Dernier message</th>
                <th className="px-4 py-3 font-semibold">Ouvert le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/admin/support/${t.id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                      {t.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium text-slate-900">{t.requesterName ?? "—"}</div>
                    <div className="text-slate-500">
                      {t.requesterType} {t.requesterEmail ? `· ${t.requesterEmail}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        PRIORITY_COLORS[t.priority] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(t.lastMessageAt).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Aucun ticket
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <AdminPagination page={page} pageSize={pageSize} total={totalFiltered} />
        </div>
      </div>
    </div>
  );
}
