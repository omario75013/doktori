import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import {
  CheckCircle,
  XCircle,
  Server,
  Database,
  Code,
  Globe,
  Search,
  Flag,
  Clock,
  Webhook,
  GitCommit,
} from "lucide-react";
import { redis } from "@/lib/cache";

export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function checkRedis(): { ok: boolean; status: string; configured: boolean } {
  const configured = Boolean(process.env.REDIS_URL);
  const status =
    typeof redis.status === "string" ? redis.status : configured ? "unknown" : "not-configured";
  return {
    configured,
    status,
    ok: status === "ready" || status === undefined,
  };
}

function readGitSha(): string {
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  // Try .next/BUILD_ID (set at build time)
  try {
    const buildIdPath = path.resolve(process.cwd(), ".next", "BUILD_ID");
    return fs.readFileSync(buildIdPath, "utf-8").trim();
  } catch {
    return "dev";
  }
}

function readLatestDeploy(): string | null {
  try {
    const nextPath = path.resolve(process.cwd(), ".next");
    const stat = fs.statSync(nextPath);
    return stat.mtime.toISOString();
  } catch {
    return null;
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
  "REDIS_URL",
  "SMTP_HOST",
  "WHATSAPP_API_TOKEN",
  "PUSH_VAPID_PUBLIC_KEY",
];

interface Tile {
  href: string;
  label: string;
  description: string;
  icon: typeof Server;
}

const tiles: Tile[] = [
  {
    href: "/admin/systeme/feature-flags",
    label: "Feature flags",
    description: "Bascules globales et pilotes par médecin",
    icon: Flag,
  },
  {
    href: "/admin/systeme/cron",
    label: "Tâches planifiées",
    description: "État et historique des crons",
    icon: Clock,
  },
  {
    href: "/admin/systeme/webhooks",
    label: "Webhooks",
    description: "Stripe, Twilio, integrations sortantes",
    icon: Webhook,
  },
  {
    href: "/admin/systeme/meilisearch",
    label: "Meilisearch",
    description: "Indexes, statistiques, re-indexation",
    icon: Search,
  },
  {
    href: "/admin/systeme/env",
    label: "Environnement",
    description: "Variables, secrets, versions clés",
    icon: Globe,
  },
];

export default async function SystemHealthPage() {
  const dbCheck = await checkDatabase();
  const redisCheck = checkRedis();

  const gitSha = readGitSha();
  const latestDeploy = readLatestDeploy();
  const nodeVersion = process.version;
  const nodeEnv = process.env.NODE_ENV;

  const envSummary = ENV_VARS_TO_CHECK.map((key) => ({
    key,
    configured: Boolean(process.env[key]),
  }));

  return (
    <div className="p-8 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Système</h1>
        <p className="text-slate-500 mt-1">
          Vue d'ensemble du runtime — santé, services, configuration
        </p>
      </div>

      {/* Tile grid for sub-pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {t.label}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Runtime info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4" />
          Runtime
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow
            label="Git SHA"
            value={
              <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded inline-flex items-center gap-1.5">
                <GitCommit className="w-3 h-3" />
                {gitSha.slice(0, 12)}
              </code>
            }
          />
          <InfoRow
            label="Node.js"
            value={<code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{nodeVersion}</code>}
          />
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
          <InfoRow
            label="Dernier déploiement"
            value={
              latestDeploy ? (
                <span className="text-xs font-mono text-slate-600">
                  {new Date(latestDeploy).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )
            }
          />
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Code className="w-4 h-4" />
          Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ServiceRow
            label="PostgreSQL"
            icon={Database}
            ok={dbCheck.ok}
            error={dbCheck.error}
          />
          <ServiceRow
            label={`Redis ${redisCheck.configured ? `(${redisCheck.status})` : "(non configuré)"}`}
            icon={Database}
            ok={redisCheck.ok}
            error={redisCheck.configured ? undefined : "REDIS_URL non défini"}
          />
        </div>
      </div>

      {/* Env vars summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Variables d'environnement
          </h2>
          <Link
            href="/admin/systeme/env"
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            Voir le détail →
          </Link>
        </div>
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

function ServiceRow({
  label,
  icon: Icon,
  ok,
  error,
}: {
  label: string;
  icon: typeof Server;
  ok: boolean;
  error?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {error && (
          <div className="text-xs text-red-500 mt-0.5 truncate" title={error}>
            {error}
          </div>
        )}
      </div>
      {ok ? (
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
      )}
    </div>
  );
}
