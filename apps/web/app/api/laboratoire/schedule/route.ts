import { NextRequest, NextResponse } from "next/server";
import { db, labSchedules, labClosedDays } from "@doktori/db";
import { eq, asc } from "drizzle-orm";
import { requireLabContext, requireLabUser } from "@/lib/lab-auth";
import { sql } from "drizzle-orm";

// GET /api/laboratoire/schedule
export async function GET(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const weekly = await db
    .select({
      id: labSchedules.id,
      dayOfWeek: labSchedules.dayOfWeek,
      opensAt: labSchedules.opensAt,
      closesAt: labSchedules.closesAt,
      isClosed: labSchedules.isClosed,
    })
    .from(labSchedules)
    .where(eq(labSchedules.labId, labId))
    .orderBy(asc(labSchedules.dayOfWeek));

  const closedDays = await db
    .select({
      id: labClosedDays.id,
      date: labClosedDays.date,
      reason: labClosedDays.reason,
    })
    .from(labClosedDays)
    .where(eq(labClosedDays.labId, labId))
    .orderBy(asc(labClosedDays.date));

  return NextResponse.json({ weekly, closedDays });
}

// PUT /api/laboratoire/schedule (admin-only) — upserts 7 rows
export async function PUT(req: NextRequest) {
  const user = await requireLabUser();
  if (user instanceof NextResponse) {
    // Legacy lab role is treated as admin
    const ctx = await requireLabContext();
    if (ctx instanceof NextResponse) return ctx;
    return handlePut(ctx.labId, req);
  }
  if (user.labUserRole !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
  }
  return handlePut(user.labId, req);
}

async function handlePut(labId: string, req: NextRequest): Promise<NextResponse> {
  let body: { weekly?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (!Array.isArray(body.weekly)) {
    return NextResponse.json({ error: "weekly[] requis" }, { status: 400 });
  }

  for (const day of body.weekly as unknown[]) {
    if (typeof day !== "object" || day === null) continue;
    const d = day as Record<string, unknown>;
    const dayOfWeek = typeof d.dayOfWeek === "number" ? d.dayOfWeek : null;
    if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) continue;

    await db
      .insert(labSchedules)
      .values({
        labId,
        dayOfWeek,
        opensAt: typeof d.opensAt === "string" && d.opensAt ? d.opensAt : null,
        closesAt: typeof d.closesAt === "string" && d.closesAt ? d.closesAt : null,
        isClosed: typeof d.isClosed === "boolean" ? d.isClosed : false,
      })
      .onConflictDoUpdate({
        target: [labSchedules.labId, labSchedules.dayOfWeek],
        set: {
          opensAt: sql`EXCLUDED.opens_at`,
          closesAt: sql`EXCLUDED.closes_at`,
          isClosed: sql`EXCLUDED.is_closed`,
          updatedAt: new Date(),
        },
      });
  }

  return NextResponse.json({ ok: true });
}
