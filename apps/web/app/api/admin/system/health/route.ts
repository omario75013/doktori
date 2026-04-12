import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

// GET /api/admin/system/health — system health check
export async function GET(req: Request) {
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

  const configuredEnvVars = [
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
  ].filter((k) => Boolean(process.env[k]));

  return NextResponse.json({
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV,
    nextauthUrl: process.env.NEXTAUTH_URL
      ? process.env.NEXTAUTH_URL.replace(/^(https?:\/\/)/, "$1***.")
      : null,
    database: { status: dbStatus, error: dbError },
    configuredEnvVars,
  });
}
