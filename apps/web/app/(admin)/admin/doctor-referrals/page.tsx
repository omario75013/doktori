import { db, doctorReferrals, doctors } from "@doktori/db";
import { aliasedTable, eq } from "drizzle-orm";
import { Stethoscope, Users, CheckCircle2, XCircle, Clock } from "lucide-react";
import { DoctorReferralsTable } from "./referrals-table";

export const dynamic = "force-dynamic";

export default async function AdminDoctorReferralsPage() {
  const referrer = aliasedTable(doctors, "ref_referrer");
  const referred = aliasedTable(doctors, "ref_referred");

  const list = await db
    .select({
      id: doctorReferrals.id,
      status: doctorReferrals.status,
      commissionPct: doctorReferrals.commissionPct,
      rewardsEarnedTnd: doctorReferrals.rewardsEarnedTnd,
      validatedAt: doctorReferrals.validatedAt,
      rejectionReason: doctorReferrals.rejectionReason,
      createdAt: doctorReferrals.createdAt,
      referrerId: doctorReferrals.referrerDoctorId,
      referredId: doctorReferrals.referredDoctorId,
      referrerName: referrer.name,
      referrerEmail: referrer.email,
      referredName: referred.name,
      referredEmail: referred.email,
    })
    .from(doctorReferrals)
    .innerJoin(referrer, eq(doctorReferrals.referrerDoctorId, referrer.id))
    .innerJoin(referred, eq(doctorReferrals.referredDoctorId, referred.id))
    .orderBy(doctorReferrals.createdAt);

  const total = list.length;
  const pending = list.filter((r) => r.status === "pending").length;
  const validated = list.filter((r) => r.status === "validated").length;
  const rejected = list.filter((r) => r.status === "rejected").length;

  const totalRewards = list.reduce(
    (sum, r) => sum + Number(r.rewardsEarnedTnd ?? 0),
    0
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Parrainage médecin → médecin
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Validation des invitations entre confrères · commission 5%
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total" value={total} icon={Users} color="slate" />
        <KpiCard label="En attente" value={pending} icon={Clock} color="amber" />
        <KpiCard
          label="Validés"
          value={validated}
          icon={CheckCircle2}
          color="green"
        />
        <KpiCard label="Rejetés" value={rejected} icon={XCircle} color="red" />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500 mb-2">Récompenses</div>
          <div className="text-3xl font-bold text-emerald-600">
            {totalRewards.toFixed(2)} TND
          </div>
          <div className="text-xs text-slate-400 mt-1">cumulé</div>
        </div>
      </div>

      <DoctorReferralsTable
        referrals={list.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          validatedAt: r.validatedAt ? r.validatedAt.toISOString() : null,
          commissionPct: Number(r.commissionPct),
          rewardsEarnedTnd: Number(r.rewardsEarnedTnd ?? 0),
        }))}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "slate" | "amber" | "green" | "red";
}) {
  const styles: Record<string, string> = {
    slate: "bg-slate-50 text-slate-500",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
  };
  const valueColor: Record<string, string> = {
    slate: "text-slate-900",
    amber: "text-amber-600",
    green: "text-green-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${styles[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${valueColor[color]}`}>{value}</div>
    </div>
  );
}
