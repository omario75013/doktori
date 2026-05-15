import { NextRequest, NextResponse } from "next/server";
import { db, labOrders, labClosedDays, patients, doctors } from "@doktori/db";
import { and, eq, gte, lte, or, sql, isNotNull } from "drizzle-orm";
import { requireLabContext } from "@/lib/lab-auth";

// GET /api/laboratoire/agenda?from=&to=
// Returns events for the calendar view.
export async function GET(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  if (!fromStr || !toStr) {
    return NextResponse.json({ error: "from et to requis" }, { status: 400 });
  }

  const from = new Date(fromStr);
  const to = new Date(toStr);

  // Orders for this lab that have at least one timestamp in range
  const orders = await db
    .select({
      id: labOrders.id,
      patientName: patients.name,
      doctorName: doctors.name,
      tests: labOrders.tests,
      specimenCollectedAt: labOrders.specimenCollectedAt,
      expectedResultAt: labOrders.expectedResultAt,
      resultUploadedAt: labOrders.resultUploadedAt,
      status: labOrders.status,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .leftJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(
      and(
        or(eq(labOrders.labId, labId), eq(labOrders.completedByLabId, labId)),
        or(
          and(isNotNull(labOrders.specimenCollectedAt), gte(labOrders.specimenCollectedAt, from), lte(labOrders.specimenCollectedAt, to)),
          and(isNotNull(labOrders.expectedResultAt), gte(labOrders.expectedResultAt, from), lte(labOrders.expectedResultAt, to)),
          and(isNotNull(labOrders.resultUploadedAt), gte(labOrders.resultUploadedAt, from), lte(labOrders.resultUploadedAt, to))
        )
      )
    );

  const closedDays = await db
    .select({ id: labClosedDays.id, date: labClosedDays.date, reason: labClosedDays.reason })
    .from(labClosedDays)
    .where(
      and(
        eq(labClosedDays.labId, labId),
        gte(labClosedDays.date, fromStr),
        lte(labClosedDays.date, toStr)
      )
    );

  const events: Array<{
    id: string;
    kind: "specimen" | "expected" | "uploaded" | "closed";
    patientName: string | null;
    doctorName: string | null;
    examLabel: string;
    time: string | null;
    status: string | null;
  }> = [];

  for (const o of orders) {
    const tests = Array.isArray(o.tests) ? o.tests : [];
    const examLabel = tests.length > 0
      ? (tests as Array<{ label?: string; code?: string }>).map((t) => t.label ?? t.code ?? "").filter(Boolean).join(", ")
      : "Analyse";

    if (o.specimenCollectedAt && o.specimenCollectedAt >= from && o.specimenCollectedAt <= to) {
      events.push({ id: o.id, kind: "specimen", patientName: o.patientName, doctorName: o.doctorName, examLabel, time: o.specimenCollectedAt.toISOString(), status: o.status });
    }
    if (o.expectedResultAt && o.expectedResultAt >= from && o.expectedResultAt <= to) {
      events.push({ id: o.id + "_exp", kind: "expected", patientName: o.patientName, doctorName: o.doctorName, examLabel, time: o.expectedResultAt.toISOString(), status: o.status });
    }
    if (o.resultUploadedAt && o.resultUploadedAt >= from && o.resultUploadedAt <= to) {
      events.push({ id: o.id + "_upl", kind: "uploaded", patientName: o.patientName, doctorName: o.doctorName, examLabel, time: o.resultUploadedAt.toISOString(), status: o.status });
    }
  }

  for (const cd of closedDays) {
    events.push({ id: cd.id, kind: "closed", patientName: null, doctorName: null, examLabel: cd.reason ?? "Fermeture", time: cd.date, status: null });
  }

  return NextResponse.json({ events });
}
