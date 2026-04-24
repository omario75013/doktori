import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db, secretaries, secretaryTimeOff } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { requireStaff } from "@/lib/staff-context";
import { computeLeaveBalance } from "@/lib/leave-balance";

export async function GET(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;
  if (ctx.selfType !== "secretary") {
    return NextResponse.json({ error: "Réservé aux secrétaires" }, { status: 403 });
  }

  const [requests, balance] = await Promise.all([
    db
      .select({
        id: secretaryTimeOff.id,
        startDate: secretaryTimeOff.startDate,
        endDate: secretaryTimeOff.endDate,
        reason: secretaryTimeOff.reason,
        status: secretaryTimeOff.status,
        createdAt: secretaryTimeOff.createdAt,
        decidedAt: secretaryTimeOff.decidedAt,
      })
      .from(secretaryTimeOff)
      .where(eq(secretaryTimeOff.secretaryId, ctx.selfId))
      .orderBy(desc(secretaryTimeOff.createdAt)),
    computeLeaveBalance(ctx.selfId),
  ]);

  return NextResponse.json({ requests, balance });
}

const postSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;
  if (ctx.selfType !== "secretary") {
    return NextResponse.json({ error: "Réservé aux secrétaires" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation échouée", details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: "La date de fin doit être après le début" }, { status: 400 });
  }

  const [created] = await db
    .insert(secretaryTimeOff)
    .values({
      secretaryId: ctx.selfId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      reason: parsed.data.reason ?? null,
      status: "pending",
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
