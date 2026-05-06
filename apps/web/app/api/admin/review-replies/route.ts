import { NextResponse } from "next/server";
import { db, reviewReplies, reviews, doctors } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

const ALLOWED_STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof ALLOWED_STATUSES)[number];

/**
 * GET /api/admin/review-replies?status=pending|approved|rejected
 *
 * Admin list of doctor replies awaiting moderation. Defaults to `pending`.
 * Joins review + doctor for context. Limited to 100 most recent.
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "moderator"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("status") ?? "pending";
  const status: Status = (ALLOWED_STATUSES as readonly string[]).includes(raw)
    ? (raw as Status)
    : "pending";

  const rows = await db
    .select({
      id: reviewReplies.id,
      body: reviewReplies.body,
      status: reviewReplies.status,
      createdAt: reviewReplies.createdAt,
      moderatedAt: reviewReplies.moderatedAt,
      rejectionReason: reviewReplies.rejectionReason,
      reviewId: reviewReplies.reviewId,
      doctorId: reviewReplies.doctorId,
      doctorName: doctors.name,
      reviewBody: reviews.comment,
      reviewRating: reviews.rating,
    })
    .from(reviewReplies)
    .leftJoin(reviews, eq(reviewReplies.reviewId, reviews.id))
    .leftJoin(doctors, eq(reviewReplies.doctorId, doctors.id))
    .where(eq(reviewReplies.status, status))
    .orderBy(desc(reviewReplies.createdAt))
    .limit(100);

  return NextResponse.json({ replies: rows });
}
