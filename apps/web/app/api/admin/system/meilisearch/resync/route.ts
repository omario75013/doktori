import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";

// POST /api/admin/system/meilisearch/resync
// Triggers a full re-index of doctors + clinics by calling the existing
// /api/search/sync endpoint with the CRON_SECRET on behalf of the admin.
export const POST = withAdminAudit<
  { ok: boolean; result: unknown },
  unknown
>({
  action: "system.meilisearch.resync",
  resourceType: "meilisearch",
  allowedRoles: ["super_admin"],
  getResourceId: () => "all",
  handler: async ({ req }) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 500 });
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

    return { ok, result };
  },
});
