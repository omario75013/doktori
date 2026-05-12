import { NextRequest, NextResponse } from "next/server";
import { db, doctorWaitingRoom } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/staff-context";

// Waiting-room counter — shared between the doctor and their
// secretary. Both web (NextAuth cookie) and mobile (Bearer JWT) callers
// are accepted via requireStaff(). Absence of a row counts as 0.

export async function GET(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  const [row] = await db
    .select({
      count: doctorWaitingRoom.count,
      updatedAt: doctorWaitingRoom.updatedAt,
      updatedByType: doctorWaitingRoom.updatedByType,
    })
    .from(doctorWaitingRoom)
    .where(eq(doctorWaitingRoom.doctorId, ctx.doctorId))
    .limit(1);

  return NextResponse.json({
    count: row?.count ?? 0,
    updatedAt: row?.updatedAt ?? null,
    updatedByType: row?.updatedByType ?? null,
  });
}

// Three modes:
//   { op: "set", value: N } — set absolute count (0..50)
//   { op: "inc" }            — +1, max 50
//   { op: "dec" }            — −1, floored at 0
//
// Single transactional upsert so concurrent +/− taps from the doctor
// and secretary don't race.
export async function PATCH(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  let body: { op?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const op = body.op;
  if (op !== "set" && op !== "inc" && op !== "dec") {
    return NextResponse.json({ error: "op invalide" }, { status: 400 });
  }

  let nextValue: number | null = null;
  if (op === "set") {
    const v = Number(body.value);
    if (!Number.isInteger(v) || v < 0 || v > 50) {
      return NextResponse.json(
        { error: "Valeur invalide (0-50)" },
        { status: 400 },
      );
    }
    nextValue = v;
  }

  // Try UPDATE first — for an inc/dec on an existing row, Postgres
  // computes the new value atomically referencing the existing count.
  // If no row matches the doctorId, fall through and INSERT a fresh
  // one with the seed value.
  const updateSet =
    op === "inc"
      ? { count: sql<number>`LEAST(${doctorWaitingRoom.count} + 1, 50)` }
      : op === "dec"
      ? { count: sql<number>`GREATEST(${doctorWaitingRoom.count} - 1, 0)` }
      : { count: nextValue ?? 0 };

  const updated = await db
    .update(doctorWaitingRoom)
    .set({
      ...updateSet,
      updatedAt: new Date(),
      updatedByType: ctx.selfType,
      updatedById: ctx.selfId,
    })
    .where(eq(doctorWaitingRoom.doctorId, ctx.doctorId))
    .returning({
      count: doctorWaitingRoom.count,
      updatedAt: doctorWaitingRoom.updatedAt,
      updatedByType: doctorWaitingRoom.updatedByType,
    });

  if (updated.length > 0) {
    return NextResponse.json({
      count: updated[0].count,
      updatedAt: updated[0].updatedAt,
      updatedByType: updated[0].updatedByType,
    });
  }

  // First-ever change for this doctor — insert the seed row.
  const seedCount =
    op === "set" ? nextValue ?? 0 : op === "inc" ? 1 : 0;
  const [inserted] = await db
    .insert(doctorWaitingRoom)
    .values({
      doctorId: ctx.doctorId,
      count: seedCount,
      updatedByType: ctx.selfType,
      updatedById: ctx.selfId,
    })
    .returning({
      count: doctorWaitingRoom.count,
      updatedAt: doctorWaitingRoom.updatedAt,
      updatedByType: doctorWaitingRoom.updatedByType,
    });

  return NextResponse.json({
    count: inserted.count,
    updatedAt: inserted.updatedAt,
    updatedByType: inserted.updatedByType,
  });
}
