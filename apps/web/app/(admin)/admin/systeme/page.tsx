import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { CheckCircle, XCircle, Server, Database, Code, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const ENV_VARS_TO_CHECK = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "CRON_SECRET",
  "TWILIO_ACCOUNT_SID",
  "STRIPE_SECRET_KEY",
  "MEILISEARCH_URL",
  "SMTP_HOST",
  "WHATSAPP_API_TOKEN",
  "PUSH_VAPID_PUBLIC_KEY",
  "VERCEL_GIT_COMMIT_SHA",
];

export default async function SystemHealthPage() {
  const dbCheck = await checkDatabase();

  const gitSha = process.env.VERCEL_GIT_COMMIT_SHA || "dev";
  const nodeVersion = process.version;
  const nodeEnv = process.env.NODE_ENV;
  const nextauthUrl = process.env.NEXTAUTH_URL ?? null;

  const envSummary = ENV_VARS_TO_CHECK.map((key) => ({
    key,
    configured: Boolean(process.env[key]),
  }));

  return (
    <div className="p-8 max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Santé système</h1>
        <p className="text-slate-500 mt-1">
          Vue d'ensemble de l'environnement d'exécution
        </p>
      </div>

      {/* Runtime info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4" />
          Runtime
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Git SHA" value={<code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{gitSha}</code>} />
          <InfoRow label="Node.js" value={<code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{nodeVersion}</code>} />
          <InfoRow
            label="Environnement"
            value={
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  nodeEnv === "production"
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {nodeEnv}
              </span>
            }
          />
          {nextauthUrl && (
            <InfoRow
              label="NEXTAUTH_URL"
              value={
                <span className="font-mono text-xs text-slate-600">
                  {nextauthUrl.replace(/^(https?:\/\/)([^/]+)/, "$1***")}
                </span>
              }
            />
          )}
        </div>
      </div>

      {/* Database */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4" />
          Base de données
        </h2>
        <div className="flex items-center gap-3">
          {dbCheck.ok ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Connecté</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-600">Erreur</span>
              {dbCheck.error && (
                <code className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
                  {dbCheck.error}
                </code>
              )}
            </>
          )}
        </div>
      </div>

      {/* Env vars */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Variables d'environnement
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {envSummary.map(({ key, configured }) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              {configured ? (
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <code className={`font-mono text-xs ${configured ? "text-slate-700" : "text-slate-400"}`}>
                {key}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
