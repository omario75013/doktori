import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const rows = (await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM doctors WHERE verification_status IN ('pending','documents_submitted'))
        AS "validationPending",
      (SELECT count(*)::int FROM reviews WHERE status = 'pending') AS "reviewsPending",
      (SELECT count(*)::int FROM admin_notifications WHERE is_read = false) AS "notifUnread"
  `)) as unknown as Array<{
    validationPending: number;
    reviewsPending: number;
    notifUnread: number;
  }>;

  const r = rows[0] ?? { validationPending: 0, reviewsPending: 0, notifUnread: 0 };
  return NextResponse.json({
    validationPending: Number(r.validationPending),
    reviewsPending: Number(r.reviewsPending),
    notifUnread: Number(r.notifUnread),
  });
}
