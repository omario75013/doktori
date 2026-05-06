import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, reviews } from "@doktori/db";
import { and, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";

/**
 * POST /api/admin/reviews/bulk-approve
 *
 * Two modes:
 *  1. id-list:  { ids: string[] }                 — approve those exact reviews
 *  2. filter:   { filter: { minRating?, sinceISO? } }
 *               — auto-approve all pending reviews matching the filter.
 *                 Defaults to 5★ within the last 7 days, capped at 200.
 *
 * One audit row is written per approved review.
 */
const filterSchema = z.object({
  filter: z.object({
    minRating: z.number().int().min(1).max(5).optional().default(5),
    sinceISO: z.string().optional(),
  }),
});

const idsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

const FILTER_LIMIT = 200;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin", "moderator"]);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));

  // Resolve target review ids — either explicit list or filter-driven query.
  let targetIds: string[] = [];
  let auditReason: string | null = null;
  let auditAction: "reviews.approve" | "reviews.bulk_approve" = "reviews.approve";

  const filterParsed = filterSchema.safeParse(body);
  const idsParsed = idsSchema.safeParse(body);

  if (filterParsed.success) {
    const minRating = filterParsed.data.filter.minRating ?? 5;
    const since = filterParsed.data.filter.sinceISO
      ? new Date(filterParsed.data.filter.sinceISO)
      : new Date(Date.now() - SEVEN_DAYS_MS);

    if (Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: "sinceISO invalide" }, { status: 400 });
    }

    const candidates = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.status, "pending"),
          gte(reviews.rating, minRating),
          gte(reviews.createdAt, since),
        )
      )
      .limit(FILTER_LIMIT);

    targetIds = candidates.map((r) => r.id);
    auditReason = `Bulk approve: minRating ${minRating}, since ${since.toISOString()}`;
    auditAction = "reviews.bulk_approve";

    if (targetIds.length === 0) {
      return NextResponse.json({ approved: 0, ids: [] });
    }
  } else if (idsParsed.success) {
    targetIds = idsParsed.data.ids;
  } else {
    return NextResponse.json(
      { error: "Body invalide — attend { ids: [...] } ou { filter: {...} }" },
      { status: 400 }
    );
  }

  // Snapshot before-state for audit (pending → published).
  const beforeRows = await db
    .select({ id: reviews.id, status: reviews.status })
    .from(reviews)
    .where(inArray(reviews.id, targetIds));

  if (beforeRows.length === 0) {
    return NextResponse.json({ error: "Aucun avis trouvé" }, { status: 404 });
  }

  const foundIds = beforeRows.map((r) => r.id);
  const now = new Date();

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
  await Promise.all(
    beforeRows.map((row) =>
      logAudit({
        actor: admin,
        action: auditAction,
        resourceType: "reviews",
        resourceId: row.id,
        before: { status: row.status },
        after: { status: "published" },
        reason: auditReason,
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
    )
  );

  return NextResponse.json({ approved: foundIds.length, ids: foundIds });
}
