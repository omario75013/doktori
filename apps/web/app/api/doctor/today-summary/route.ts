import { NextRequest, NextResponse } from "next/server";
import { db, appointments, patients } from "@doktori/db";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * GET /api/doctor/today-summary
 *
 * Live data feed for the dashboard's "Day Overview" hero card.
 * Used by the doctor's web view, polled every ~15s so check-ins recorded by
 * a secretary become visible without a page reload.
 *
 * Response:
 *   {
 *     waitingCount: number,       // confirmed + checkedInAt set, today
 *     todayAppts: Array<{ id, startsAt, patientName }>  // today's confirmed/pending
 *   }
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const doctorId = session.user.id;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      checkedInAt: appointments.checkedInAt,
      patientName: patients.name,
    })
    .from(appointments)
    .leftJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, start),
        lte(appointments.startsAt, end),
      ),
    );

  const waitingCount = rows.filter(
    (r) => r.status === "confirmed" && r.checkedInAt !== null,
  ).length;

  const todayAppts = rows.map((r) => ({
    id: r.id,
    startsAt: r.startsAt,
    patientName: r.patientName ?? "Patient",
  }));

  // Live KPI counts. No-shows window is rolling 30 days, NOT the current
  // calendar month — a recent no-show on Apr 30 shouldn't disappear when
  // the clock crosses midnight on May 1. Today for pending-to-confirm.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const monthRows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.status, "no_show"),
        gte(appointments.startsAt, thirtyDaysAgo),
      ),
    );
  const noShowMonthCount = monthRows.length;
  const toConfirmCount = rows.filter((r) => r.status === "pending").length;

  return NextResponse.json({
    noShowMonthCount,
    toConfirmCount,
    todayCount: rows.length,
    waitingCount,
    todayAppts,
  });
}
