import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";

// POST /api/admin/system/meilisearch/resync
// Triggers a full re-index of doctors + clinics by calling the existing
// /api/search/sync endpoint with the CRON_SECRET on behalf of the admin.
export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET non configuré" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const target = `${baseUrl.replace(/\/$/, "")}/api/search/sync`;

  let result: unknown;
  let ok = true;
  try {
    const r = await fetch(target, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    });
    ok = r.ok;
    result = await r.json().catch(() => ({}));
  } catch (e) {
    ok = false;
    result = { error: e instanceof Error ? e.message : String(e) };
  }

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "system.meilisearch.resync",
    resourceType: "meilisearch",
    resourceId: "all",
    after: { ok, result },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok, result }, { status: ok ? 200 : 502 });
}
