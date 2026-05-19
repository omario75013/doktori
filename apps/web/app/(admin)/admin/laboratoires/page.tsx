import { db, labs } from "@doktori/db";
import { desc, eq, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { LabTableActions } from "./labs-table-actions";
import { AdminPagination } from "@/components/admin/pagination";
import { parsePageParams } from "@/lib/admin-pagination";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "En attente",
    className: "bg-amber-50 text-amber-700",
  },
  verified: {
    label: "Vérifié",
    className: "bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "Rejeté",
    className: "bg-red-50 text-red-700",
  },
};

const FILTER_STATUSES = ["all", "pending", "verified", "rejected"] as const;
type FilterStatus = (typeof FILTER_STATUSES)[number];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminLaboratoiresPage({ searchParams }: PageProps) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const sp = await searchParams;
  const statusParam = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const activeFilter: FilterStatus =
    FILTER_STATUSES.includes(statusParam as FilterStatus) && statusParam !== undefined
      ? (statusParam as FilterStatus)
      : "all";

  const { page, pageSize, offset } = parsePageParams(sp);

  // Counts per status (for chip badges + active filter total)
  const counts = await db
    .select({
      status: labs.verificationStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(labs)
    .groupBy(labs.verificationStatus);
  const countByStatus = new Map(counts.map((c) => [c.status, Number(c.count)]));
  const totalAll = counts.reduce((s, c) => s + Number(c.count), 0);
  const totalFiltered =
    activeFilter === "all" ? totalAll : countByStatus.get(activeFilter) ?? 0;

  const baseQuery = db.select().from(labs);
  const rows = await (activeFilter === "all"
    ? baseQuery
    : baseQuery.where(eq(labs.verificationStatus, activeFilter)))
    .orderBy(desc(labs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Laboratoires</h1>
          <p className="text-slate-500 mt-1">
            Vérifiez et activez les laboratoires inscrits
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_STATUSES.map((s) => {
          const c = s === "all" ? totalAll : countByStatus.get(s) ?? 0;
          const isActive = activeFilter === s;
          return (
            <Link
              key={s}
              href={s === "all" ? "/admin/laboratoires" : `/admin/laboratoires?status=${s}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" && "Tous"}
              {s === "pending" && "En attente"}
              {s === "verified" && "Vérifiés"}
              {s === "rejected" && "Rejetés"}
              <span
                className={`ml-1.5 text-xs ${isActive ? "text-teal-100" : "text-slate-400"}`}
              >
                {c}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Aucun laboratoire</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Ville</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Téléphone</th>
                  <th className="px-4 py-3 font-semibold">Services</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Inscrit le</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((lab) => {
                  const statusInfo =
                    STATUS_CONFIG[lab.verificationStatus] ??
                    STATUS_CONFIG["pending"];
                  return (
                    <tr key={lab.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                            <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
                          </div>
                          <span className="font-medium text-slate-900">{lab.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-700">{lab.city}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{lab.email}</td>
                      <td className="px-4 py-3 text-slate-700" dir="ltr">
                        {lab.phone}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {lab.services.length === 0 ? (
                            <span className="text-slate-400 text-xs">—</span>
                          ) : (
                            lab.services.map((svc) => (
                              <span
                                key={svc}
                                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600"
                              >
                                {svc}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {lab.createdAt.toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <LabTableActions labId={lab.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={totalFiltered}
            />
          </div>
        )}
      </div>
    </div>
  );
}
