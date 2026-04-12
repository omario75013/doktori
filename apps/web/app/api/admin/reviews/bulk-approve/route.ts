import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, reviews } from "@doktori/db";
import { eq, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin", "moderator"]);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const { ids } = body as { ids?: unknown };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids requis" }, { status: 400 });
  }

  // Validate all ids are strings
  if (!ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "ids invalides" }, { status: 400 });
  }

  const validIds = ids as string[];

  // Fetch before state for audit
  const beforeRows = await db
    .select({ id: reviews.id, status: reviews.status })
    .from(reviews)
    .where(inArray(reviews.id, validIds));

  if (beforeRows.length === 0) {
    return NextResponse.json({ error: "Aucun avis trouvé" }, { status: 404 });
  }

  const now = new Date();
  const foundIds = beforeRows.map((r) => r.id);

  await db
    .update(reviews)
    .set({
      status: "published",
      moderatedBy: admin.id,
      moderatedAt: now,
      rejectionReason: null,
    })
    .where(inArray(reviews.id, foundIds));

  const meta = extractRequestMeta(req);

  // Log audit entry for each review
  await Promise.all(
    beforeRows.map((row) =>
      logAudit({
        actor: admin,
        action: "reviews.approve",
        resourceType: "reviews",
        resourceId: row.id,
        before: { status: row.status },
        after: { status: "published" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
    )
  );

  return NextResponse.json({ updated: foundIds.length });
}
