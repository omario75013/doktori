import { NextRequest, NextResponse } from "next/server";
import { db, reviewReplies, reviews } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";

const bodySchema = z.object({
  body: z.string().min(10).max(2000),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/medecin/reviews/[id]/reply
 *
 * Doctor creates a reply to a patient review (one reply per review).
 * Reply starts in `pending` status; an admin must approve it before it
 * becomes publicly visible.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: reviewId } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Confirm the review exists and belongs to this doctor.
  const [review] = await db
    .select({ id: reviews.id, doctorId: reviews.doctorId })
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1);
  if (!review) {
    return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });
  }
  if (review.doctorId !== user.doctorId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Idempotency: a doctor can reply only once per review.
  const [existing] = await db
    .select({ id: reviewReplies.id })
    .from(reviewReplies)
    .where(eq(reviewReplies.reviewId, reviewId))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "Une réponse existe déjà pour cet avis" },
      { status: 409 }
    );
  }

  const [created] = await db
    .insert(reviewReplies)
    .values({
      reviewId,
      doctorId: user.doctorId,
      body: parsed.data.body,
      status: "pending",
    })
    .returning();

  return NextResponse.json({ reply: created }, { status: 201 });
}

/**
 * GET /api/medecin/reviews/[id]/reply
 *
 * Doctor reads their own reply for the given review. Returns
 * `{ reply: null }` when no reply has been posted yet.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: reviewId } = await ctx.params;

  const [reply] = await db
    .select()
    .from(reviewReplies)
    .where(
      and(
        eq(reviewReplies.reviewId, reviewId),
        eq(reviewReplies.doctorId, user.doctorId),
      )
    )
    .limit(1);

  return NextResponse.json({ reply: reply ?? null });
}
