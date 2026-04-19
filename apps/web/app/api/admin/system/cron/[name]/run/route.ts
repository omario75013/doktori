import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";

const KNOWN_CRONS = [
  "followups",
  "subscriptions",
  "monthly-reports",
  "reviews-auto-publish",
  "sos-cleanup",
] as const;

type CronName = (typeof KNOWN_CRONS)[number];

// POST /api/admin/system/cron/[name]/run — manually trigger a cron job
export async function POST(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { name } = await params;

  if (!KNOWN_CRONS.includes(name as CronName)) {
    return NextResponse.json({ error: "Cron job inconnu" }, { status: 400 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET non configuré" },
      { status: 500 }
    );
  }

  // Build the URL using the server-configured NEXTAUTH_URL (never from the
  // incoming request, to eliminate any SSRF vector). The cron name is
  // validated against a fixed allowlist above before reaching this point.
  const appUrl = (process.env.NEXTAUTH_URL ?? "https://doktori.tn").replace(/\/$/, "");
  const cronUrl = `${appUrl}/api/cron/${name}`;

  let result: { success: boolean; status: number; body: unknown };
  try {
    const cronRes = await fetch(cronUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    let body: unknown;
    try {
      body = await cronRes.json();
    } catch {
      body = await cronRes.text();
    }
    result = { success: cronRes.ok, status: cronRes.status, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result = { success: false, status: 0, body: { error: message } };
  }

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "run",
    resourceType: "cron_job",
    resourceId: name,
    after: result,
    ip,
    userAgent,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
