import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { ArrowLeft, Globe, Package, CheckCircle, XCircle } from "lucide-react";
import { getAdminSession } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Public-by-design env vars (values are safe to display)
const PUBLIC_ENV_VARS = [
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SOCKETIO_URL",
  "NEXT_PUBLIC_SENTRY_DSN",
  "MEILISEARCH_URL",
  "OPENROUTER_MODEL",
  "OPENROUTER_BASE_URL",
  "NODE_ENV",
] as const;

// Secret env vars — show only "configured / not configured", NEVER value
const SECRET_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "CRON_SECRET",
  "MEILISEARCH_KEY",
  "REDIS_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "WHATSAPP_API_TOKEN",
  "PUSH_VAPID_PUBLIC_KEY",
  "PUSH_VAPID_PRIVATE_KEY",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "FLOUCI_APP_TOKEN",
  "FLOUCI_APP_SECRET",
] as const;

const TRACKED_PACKAGES = [
  "next",
  "react",
  "drizzle-orm",
  "stripe",
  "ioredis",
  "meilisearch",
  "next-auth",
  "@anthropic-ai/sdk",
  "@sentry/nextjs",
] as const;

function readPackageVersions(): Record<string, string | null> {
  try {
    const pkgJsonPath = path.resolve(process.cwd(), "package.json");
    const raw = fs.readFileSync(pkgJsonPath, "utf-8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const merged = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
    const out: Record<string, string | null> = {};
    for (const name of TRACKED_PACKAGES) {
      out[name] = merged[name] ?? null;
    }
    return out;
  } catch {
    return Object.fromEntries(TRACKED_PACKAGES.map((p) => [p, null]));
  }
}

function maskUrl(value: string): string {
  // Strip credentials from URLs (postgres://user:pass@host → postgres://***@host)
  return value.replace(/(:\/\/)([^:/]+:[^@/]+@)/, "$1***:***@");
}

export default async function AdminEnvPage() {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "super_admin") {
    redirect("/admin");
  }

  const pkgVersions = readPackageVersions();
  const nodeVersion = process.version;

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <Link
        href="/admin/systeme"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Système
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Globe className="w-8 h-8 text-teal-600" />
          Environnement
        </h1>
        <p className="text-slate-500 mt-1">
          Configuration du runtime — les valeurs des secrets ne sont jamais exposées
        </p>
      </div>

      {/* Runtime */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
          Runtime
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Row label="Node.js" value={<code className="font-mono bg-slate-100 px-2 py-0.5 rounded">{nodeVersion}</code>} />
          <Row
            label="NODE_ENV"
            value={
              <span
                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  process.env.NODE_ENV === "production"
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {process.env.NODE_ENV ?? "—"}
              </span>
            }
          />
        </div>
      </div>

      {/* Public env */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
          Variables publiques
        </h2>
        <div className="space-y-2">
          {PUBLIC_ENV_VARS.map((key) => {
            const v = process.env[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-sm"
              >
                <code className="font-mono text-xs text-slate-700">{key}</code>
                {v ? (
                  <code className="font-mono text-xs text-slate-600 truncate ml-4 max-w-[60%] text-right">
                    {key.toLowerCase().includes("url") ? maskUrl(v) : v}
                  </code>
                ) : (
                  <span className="text-xs text-slate-400">non défini</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Secret env (configured indicator only) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Secrets
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Les valeurs ne sont jamais affichées — uniquement l'indicateur de présence.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SECRET_ENV_VARS.map((key) => {
            const configured = Boolean(process.env[key]);
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                {configured ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <code
                  className={`font-mono text-xs ${
                    configured ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {key}
                </code>
              </div>
            );
          })}
        </div>
      </div>

      {/* Packages */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Package className="w-4 h-4" />
          Versions clés
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {TRACKED_PACKAGES.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
            >
              <code className="font-mono text-xs text-slate-700">{name}</code>
              <code className="font-mono text-xs text-slate-500">
                {pkgVersions[name] ?? "—"}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
