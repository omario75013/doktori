import { db, referrals, doctors } from "@doktori/db";
import { eq, aliasedTable } from "drizzle-orm";
import { ReferralsTable } from "./referrals-table";

export const dynamic = "force-dynamic";

export default async function AdminParrainagePage() {
  const referrer = aliasedTable(doctors, "referrer");
  const referred = aliasedTable(doctors, "referred");

  const list = await db
    .select({
      id: referrals.id,
      status: referrals.status,
      createdAt: referrals.createdAt,
      validatedAt: referrals.validatedAt,
      referrerId: referrals.referrerId,
      referredId: referrals.referredId,
      referrerName: referrer.name,
      referredName: referred.name,
    })
    .from(referrals)
    .innerJoin(referrer, eq(referrals.referrerId, referrer.id))
    .innerJoin(referred, eq(referrals.referredId, referred.id))
    .orderBy(referrals.createdAt);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Parrainage</h1>
        <p className="text-slate-500 mt-1">
          {list.length} parrainage{list.length > 1 ? "s" : ""} enregistré{list.length > 1 ? "s" : ""}
        </p>
      </div>
      <ReferralsTable
        referrals={list.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          validatedAt: r.validatedAt ? r.validatedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
