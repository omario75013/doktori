import { db, referrals, doctors, platformSettings } from "@doktori/db";
import { eq, aliasedTable, count, sql } from "drizzle-orm";
import { ReferralsTable } from "./referrals-table";
import { Gift, Users, CheckCircle2, Star, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminParrainagePage() {
  const referrer = aliasedTable(doctors, "referrer");
  const referred = aliasedTable(doctors, "referred");

  const [list, settings] = await Promise.all([
    db
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
      .orderBy(referrals.createdAt),
    db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(
        sql`${platformSettings.key} LIKE 'referral.%'`
      ),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const totalReferrals = list.length;
  const pendingCount = list.filter((r) => r.status === "pending").length;
  const validatedCount = list.filter((r) => r.status === "validated" || r.status === "rewarded").length;
  const rewardedCount = list.filter((r) => r.status === "rewarded").length;

  // Top referrers
  const referrerCounts: Record<string, { name: string; total: number; rewarded: number }> = {};
  for (const r of list) {
    if (!referrerCounts[r.referrerId]) {
      referrerCounts[r.referrerId] = { name: r.referrerName, total: 0, rewarded: 0 };
    }
    referrerCounts[r.referrerId].total += 1;
    if (r.status === "rewarded") referrerCounts[r.referrerId].rewarded += 1;
  }
  const topReferrers = Object.values(referrerCounts)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Programme de parrainage</h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Suivi des parrainages et des récompenses
          </p>
        </div>
      </div>

      {/* Settings banner */}
      <div className="rounded-xl bg-amber-50 border border-amber-100 px-5 py-3 text-sm text-amber-800 flex flex-wrap gap-4">
        <span>
          <strong>Récompense parrain :</strong>{" "}
          {settingsMap["referral.reward_value"] ?? "1"}{" "}
          {settingsMap["referral.reward_type"] === "free_months" ? "mois gratuit(s)" : ""}
        </span>
        <span className="text-amber-300">|</span>
        <span>
          <strong>Récompense filleul :</strong>{" "}
          {settingsMap["referral.referee_reward_value"] ?? "1"}{" "}
          {settingsMap["referral.referee_reward_type"] === "free_months" ? "mois gratuit(s)" : ""}
        </span>
        <span className="ml-auto text-xs text-amber-600">
          Configurable dans Paramètres &gt; Parrainage
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            <span className="text-sm text-slate-500">Total</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{totalReferrals}</div>
          <div className="text-xs text-slate-400 mt-1">parrainages enregistrés</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Gift className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-sm text-slate-500">En attente</span>
          </div>
          <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
          <div className="text-xs text-slate-400 mt-1">à valider</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-sm text-slate-500">Convertis</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">{validatedCount}</div>
          <div className="text-xs text-slate-400 mt-1">validés ou récompensés</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center">
              <Star className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-sm text-slate-500">Récompensés</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{rewardedCount}</div>
          <div className="text-xs text-slate-400 mt-1">récompenses attribuées</div>
        </div>
      </div>

      {/* Funnel + Top Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Entonnoir de conversion</h2>
          <div className="space-y-3">
            {[
              { label: "Invités", value: totalReferrals, color: "bg-slate-400" },
              { label: "Inscrits", value: validatedCount + rewardedCount, color: "bg-blue-400" },
              { label: "Abonnés", value: rewardedCount, color: "bg-green-400" },
            ].map((step) => {
              const pct = totalReferrals > 0 ? Math.round((step.value / totalReferrals) * 100) : 0;
              return (
                <div key={step.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{step.label}</span>
                    <span className="font-semibold text-slate-900">
                      {step.value} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className={`${step.color} h-2.5 rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Referrers Leaderboard */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-slate-900">Meilleurs parrains</h2>
          </div>
          {topReferrers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucun parrain pour le moment</p>
          ) : (
            <div className="space-y-2">
              {topReferrers.map((r, i) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0
                          ? "bg-amber-100 text-amber-700"
                          : i === 1
                          ? "bg-slate-100 text-slate-600"
                          : i === 2
                          ? "bg-orange-100 text-orange-600"
                          : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{r.total} parrainage{r.total > 1 ? "s" : ""}</span>
                    <span className="text-green-600 font-semibold">
                      {r.rewarded} récompense{r.rewarded > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Referrals Table */}
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
