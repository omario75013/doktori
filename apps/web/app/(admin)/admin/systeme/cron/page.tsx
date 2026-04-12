"use client";

import { useState } from "react";
import { Clock, Play, CheckCircle, XCircle, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CronJob = {
  name: string;
  schedule: string;
  description: string;
};

type RunResult = {
  success: boolean;
  status: number;
  body: string | Record<string, unknown> | null;
};

// ─── Cron definitions ────────────────────────────────────────────────────────

const CRON_JOBS: CronJob[] = [
  {
    name: "followups",
    schedule: "0 9 * * *",
    description: "SMS de suivi quotidien pour les patients sur liste d'attente",
  },
  {
    name: "subscriptions",
    schedule: "0 2 * * *",
    description: "Renouvellements d'abonnements et relances de paiement",
  },
  {
    name: "monthly-reports",
    schedule: "0 1 1 * *",
    description: "Génération des bordereaux CNAM mensuels",
  },
  {
    name: "reviews-auto-publish",
    schedule: "0 */6 * * *",
    description: "Publication automatique des avis en attente depuis plus de 48h",
  },
  {
    name: "sos-cleanup",
    schedule: "*/5 * * * *",
    description: "Expiration des sessions SOS en attente et fermeture des proxies téléphoniques",
  },
];

// ─── Result badge ─────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: RunResult }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${
        result.success
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-600 border border-red-200"
      }`}
    >
      {result.success ? (
        <CheckCircle className="w-4 h-4 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 shrink-0" />
      )}
      <span className="font-medium">
        {result.success ? "Succès" : `Erreur ${result.status || ""}`}
      </span>
      {result.body && (
        <code className="text-xs opacity-70 truncate max-w-[200px]">
          {typeof result.body === "string"
            ? result.body
            : JSON.stringify(result.body) as string}
        </code>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CronDashboardPage() {
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RunResult>>({});

  async function handleRun(name: string) {
    setRunningJob(name);
    setResults((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    try {
      const res = await fetch(`/api/admin/system/cron/${name}/run`, {
        method: "POST",
      });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      setResults((prev) => ({
        ...prev,
        [name]: { success: res.ok, status: res.status, body },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [name]: {
          success: false,
          status: 0,
          body: { error: err instanceof Error ? err.message : String(err) },
        },
      }));
    } finally {
      setRunningJob(null);
    }
  }

  return (
    <div className="p-8 max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Cron jobs</h1>
        <p className="text-slate-500 mt-1">
          Tâches planifiées — exécution manuelle disponible pour les super admins
        </p>
      </div>

      {/* Jobs list */}
      <div className="space-y-3">
        {CRON_JOBS.map((job) => {
          const isRunning = runningJob === job.name;
          const result = results[job.name];

          return (
            <div
              key={job.name}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono font-semibold text-slate-900 text-sm">
                        {job.name}
                      </code>
                      <code className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {job.schedule}
                      </code>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{job.description}</p>
                    {result && (
                      <div className="mt-3">
                        <ResultBadge result={result} />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isRunning || runningJob !== null}
                  onClick={() => handleRun(job.name)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isRunning ? "En cours…" : "Exécuter"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning note */}
      <p className="text-xs text-slate-400 text-center">
        L'exécution manuelle d'un cron est journalisée dans les logs d'audit.
      </p>
    </div>
  );
}
