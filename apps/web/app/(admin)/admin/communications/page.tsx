import { requireAdmin } from "@/lib/admin-auth";
import { db, smsLogs } from "@doktori/db";
import { count, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CommunicationsOverviewPage() {
  const admin = await requireAdmin([]);
  if (!admin || admin instanceof Response) redirect("/admin-login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [[{ totalSent }], [{ totalDelivered }], [{ monthlySent }]] =
    await Promise.all([
      db
        .select({ totalSent: count() })
        .from(smsLogs)
        .where(eq(smsLogs.status, "sent")),
      db
        .select({ totalDelivered: count() })
        .from(smsLogs)
        .where(eq(smsLogs.status, "delivered")),
      db
        .select({ monthlySent: count() })
        .from(smsLogs)
        .where(gte(smsLogs.createdAt, startOfMonth)),
    ]);

  const sentCount = Number(totalSent);
  const deliveredCount = Number(totalDelivered);
  const totalTerminal = sentCount + deliveredCount;
  const deliveryRate =
    totalTerminal > 0
      ? Math.round((deliveredCount / totalTerminal) * 100)
      : null;

  const monthName = startOfMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Communications</h1>
        <p className="text-slate-500 mt-1">
          Suivi des communications envoyées — {monthName}
        </p>
      </div>

      {/* Channels */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Canaux</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/communications/sms"
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-xs font-semibold text-teal-600 bg-teal-50 rounded-full px-2 py-0.5">
                Actif
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors mb-1">
              SMS
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Notifications de rendez-vous, rappels et confirmations par SMS.
            </p>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400">Total envoyés</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {(sentCount + deliveredCount).toLocaleString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Taux livraison</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {deliveryRate != null ? `${deliveryRate}%` : "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Ce mois</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {Number(monthlySent).toLocaleString("fr-FR")} SMS
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
