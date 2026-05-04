import { db, retentionPolicies } from "@doktori/db";
import { Database, Shield } from "lucide-react";
import { RetentionTable } from "./retention-table";

export const dynamic = "force-dynamic";

export default async function AdminRetentionPage() {
  const policies = await db
    .select()
    .from(retentionPolicies)
    .orderBy(retentionPolicies.resourceType);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Politiques de rétention
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Conservation et anonymisation des données personnelles —
            conformité loi tunisienne 2004-63 / RGPD
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5 text-sm text-emerald-900 flex gap-3">
        <Database className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">À propos</p>
          <ul className="list-disc list-inside text-emerald-800 space-y-1">
            <li>
              Les politiques s'appliquent automatiquement chaque jour via un
              cron de purge (dry-run par défaut, exécution explicite avec
              <code className="mx-1 px-1.5 py-0.5 bg-emerald-100 rounded text-xs">?execute=true</code>).
            </li>
            <li>
              <strong>Hard delete</strong> = suppression définitive ;
              <strong className="ml-1">Anonymisation</strong> = effacement des
              données sensibles, conservation de la trace agrégée.
            </li>
            <li>
              Pour les patients inactifs, la suppression nécessite une approbation
              manuelle — la politique sert de signalement uniquement.
            </li>
          </ul>
        </div>
      </div>

      <RetentionTable
        policies={policies.map((p) => ({
          ...p,
          lastRunAt: p.lastRunAt ? p.lastRunAt.toISOString() : null,
          updatedAt: p.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
