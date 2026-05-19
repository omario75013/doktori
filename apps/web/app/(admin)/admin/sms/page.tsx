import { db, smsLogs, appointments, doctors, patients } from "@doktori/db";
import { desc, eq, sql, gte } from "drizzle-orm";
import { AdminPagination } from "@/components/admin/pagination";
import { parsePageParams } from "@/lib/admin-pagination";
import { MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  delivered: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle2 },
  sent: { bg: "bg-blue-50", text: "text-blue-700", icon: CheckCircle2 },
  pending: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock },
  failed: { bg: "bg-red-50", text: "text-red-700", icon: XCircle },
};

export default async function AdminSmsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, pageSize, offset } = parsePageParams(sp, { pageSize: 50 });

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(smsLogs);

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);

  const [statsRow] = await db
    .select({
      total30: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${smsLogs.status} in ('delivered','sent'))::int`,
      failed: sql<number>`count(*) filter (where ${smsLogs.status} = 'failed')::int`,
      pending: sql<number>`count(*) filter (where ${smsLogs.status} = 'pending')::int`,
      totalCostMillimes: sql<number>`coalesce(sum(${smsLogs.cost}), 0)::int`,
    })
    .from(smsLogs)
    .where(gte(smsLogs.createdAt, last30));

  const rows = await db
    .select({
      id: smsLogs.id,
      recipient: smsLogs.recipient,
      message: smsLogs.message,
      status: smsLogs.status,
      provider: smsLogs.provider,
      cost: smsLogs.cost,
      createdAt: smsLogs.createdAt,
      appointmentId: smsLogs.appointmentId,
      doctorName: doctors.name,
      patientName: patients.name,
    })
    .from(smsLogs)
    .leftJoin(appointments, eq(smsLogs.appointmentId, appointments.id))
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .orderBy(desc(smsLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">SMS</h1>
          <p className="text-slate-500 mt-1">
            Journal des messages envoyés · {total} au total
          </p>
        </div>
      </div>

      {/* 30-day KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Kpi label="30 derniers jours" value={statsRow?.total30 ?? 0} />
        <Kpi label="Livrés" value={statsRow?.delivered ?? 0} tone="emerald" />
        <Kpi label="Échecs" value={statsRow?.failed ?? 0} tone="red" />
        <Kpi label="En attente" value={statsRow?.pending ?? 0} tone="amber" />
        <Kpi
          label="Coût total (TND)"
          value={((statsRow?.totalCostMillimes ?? 0) / 1000).toFixed(3)}
          tone="blue"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Destinataire</th>
                <th className="px-4 py-3 font-semibold">Message</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Médecin / Patient</th>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold">Coût</th>
                <th className="px-4 py-3 font-semibold">Envoyé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const conf = STATUS_COLORS[r.status] ?? STATUS_COLORS.pending;
                const Icon = conf.icon;
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                      {r.recipient}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-md truncate">{r.message}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${conf.bg} ${conf.text}`}
                      >
                        <Icon className="w-3 h-3" />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {r.doctorName && <div>Dr {r.doctorName}</div>}
                      {r.patientName && <div className="text-slate-400">{r.patientName}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.provider ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {r.cost != null ? `${(r.cost / 1000).toFixed(3)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Aucun SMS envoyé pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <AdminPagination page={page} pageSize={pageSize} total={Number(total ?? 0)} />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  tone?: "slate" | "emerald" | "red" | "amber" | "blue";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-900 bg-white",
    emerald: "text-emerald-700 bg-emerald-50",
    red: "text-red-700 bg-red-50",
    amber: "text-amber-700 bg-amber-50",
    blue: "text-blue-700 bg-blue-50",
  };
  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
