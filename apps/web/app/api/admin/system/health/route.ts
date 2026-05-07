import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { redis } from "@/lib/cache";

// GET /api/admin/system/health — system health check
export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  let dbStatus: "connected" | "error" = "error";
  let dbError: string | null = null;
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "connected";
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  // Redis status (from existing ioredis client)
  const redisConfigured = Boolean(process.env.REDIS_URL);
  const redisStatus = typeof redis.status === "string" ? redis.status : "unknown";

  // Git SHA from env or .next/BUILD_ID fallback
  let gitSha = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
  if (!gitSha) {
    try {
      gitSha = fs
        .readFileSync(path.resolve(process.cwd(), ".next", "BUILD_ID"), "utf-8")
        .trim();
    } catch {
      gitSha = "dev";
    }
  }

  // Latest deploy: mtime of .next directory
  let latestDeploy: string | null = null;
  try {
    const stat = fs.statSync(path.resolve(process.cwd(), ".next"));
    latestDeploy = stat.mtime.toISOString();
  } catch {
    latestDeploy = null;
  }

  const configuredEnvVars = [
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
  ].filter((k) => Boolean(process.env[k]));

  return NextResponse.json({
    gitSha,
    latestDeploy,
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV,
    nextauthUrl: process.env.NEXTAUTH_URL
      ? process.env.NEXTAUTH_URL.replace(/^(https?:\/\/)/, "$1***.")
      : null,
    database: { status: dbStatus, error: dbError },
    redis: {
      configured: redisConfigured,
      status: redisStatus,
      ok: redisStatus === "ready",
    },
    configuredEnvVars,
  });
}
