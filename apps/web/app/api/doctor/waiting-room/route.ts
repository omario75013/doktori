import { NextRequest, NextResponse } from "next/server";
import { db, doctorWaitingRoom, appointments } from "@doktori/db";
import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { requireStaff } from "@/lib/staff-context";
import { broadcastSos } from "@/lib/sos-broadcast";

// Waiting-room counter — shared between the doctor and their
// secretary. Both web (NextAuth cookie) and mobile (Bearer JWT) callers
// are accepted via requireStaff().
//
// The exposed count is the MAX of two signals so we never under-report:
//   - manual: doctor_waiting_room.count, written via +/- buttons or "set"
//     (used for walk-ins with no appointment).
//   - derived: today's confirmed appointments where checked_in_at is set
//     (a patient was checked in via the appointment flow).
//
// Without this, a secretary who checks patients in via the RDV "Check-in"
// action without also tapping the +/- buttons would see the KPI stuck at 0.

export async function GET(req: NextRequest) {
  const ctx = await requireStaff(req);
  if ("err" in ctx) return ctx.err;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [manualRow] = await db
    .select({
      count: doctorWaitingRoom.count,
      updatedAt: doctorWaitingRoom.updatedAt,
      updatedByType: doctorWaitingRoom.updatedByType,
    })
    .from(doctorWaitingRoom)
    .where(eq(doctorWaitingRoom.doctorId, ctx.doctorId))
    .limit(1);

  const [derivedRow] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, ctx.doctorId),
        gte(appointments.startsAt, todayStart),
        lte(appointments.startsAt, todayEnd),
        isNotNull(appointments.checkedInAt),
        eq(appointments.status, "confirmed"),
      ),
    );

  const manualCount = manualRow?.count ?? 0;
  const derivedCount = Number(derivedRow?.cnt ?? 0);
  const count = Math.max(manualCount, derivedCount);

  return NextResponse.json({
    count,
    manualCount,
    derivedCount,
    updatedAt: manualRow?.updatedAt ?? null,
    updatedByType: manualRow?.updatedByType ?? null,
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
    const payload = {
      count: updated[0].count,
      updatedAt: updated[0].updatedAt,
      updatedByType: updated[0].updatedByType,
    };
    // Fire-and-forget WS push so any connected dashboards for this
    // doctor (mobile + web, secretary + doctor) flip immediately.
    void broadcastSos(`waiting-room:${ctx.doctorId}`, "waiting:update", payload);
    return NextResponse.json(payload);
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

  const payload = {
    count: inserted.count,
    updatedAt: inserted.updatedAt,
    updatedByType: inserted.updatedByType,
  };
  void broadcastSos(`waiting-room:${ctx.doctorId}`, "waiting:update", payload);
  return NextResponse.json(payload);
}
