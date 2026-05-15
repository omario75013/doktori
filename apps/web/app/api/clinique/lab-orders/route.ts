import { NextRequest, NextResponse } from "next/server";
import {
  db,
  labOrders,
  labs,
  doctors,
  patients,
  clinicDoctors,
} from "@doktori/db";
import { eq, and, inArray, isNotNull, desc, gte, lte, sql } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

export async function GET(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") ?? "all";
  const doctorIdParam = searchParams.get("doctorId");
  const urgencyParam = searchParams.get("urgency");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  // "sent" = orders BY clinic doctors (default); "received" = orders TO in-house labs
  const direction = searchParams.get("direction") ?? "sent";

  // Resolve all doctor IDs in this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (direction === "received") {
    // Orders RECEIVED by in-house labs of this clinic
    const inHouseLabs = await db
      .select({ id: labs.id, name: labs.name })
      .from(labs)
      .where(
        and(
          isNotNull(labs.clinicId),
          eq(labs.clinicId, clinic.id),
        )
      );

    const inHouseLabIds = inHouseLabs.map((l) => l.id);

    if (inHouseLabIds.length === 0) {
      return NextResponse.json({
        orders: [],
        kpi: { pending: 0, thisMonth: 0, today: 0, topDoctor: null },
      });
    }

    const conditions = [inArray(labOrders.labId, inHouseLabIds)];

    if (statusParam !== "all") conditions.push(eq(labOrders.status, statusParam));
    if (urgencyParam === "routine" || urgencyParam === "urgent") {
      conditions.push(eq(labOrders.urgency, urgencyParam));
    }
    if (fromParam) {
      const d = new Date(fromParam);
      if (!isNaN(d.getTime())) conditions.push(gte(labOrders.createdAt, d));
    }
    if (toParam) {
      const d = new Date(toParam);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        conditions.push(lte(labOrders.createdAt, d));
      }
    }

    const rows = await db
      .select({
        id: labOrders.id,
        doctorId: labOrders.doctorId,
        patientId: labOrders.patientId,
        labId: labOrders.labId,
        tests: labOrders.tests,
        urgency: labOrders.urgency,
        status: labOrders.status,
        instructions: labOrders.instructions,
        createdAt: labOrders.createdAt,
        completedAt: labOrders.completedAt,
        patientName: patients.name,
        doctorName: doctors.name,
        labName: labs.name,
      })
      .from(labOrders)
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
      .leftJoin(labs, eq(labOrders.labId, labs.id))
      .where(and(...conditions))
      .orderBy(desc(labOrders.createdAt))
      .limit(200);

    // KPIs for received tab
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const [kpiPending] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(and(inArray(labOrders.labId, inHouseLabIds), eq(labOrders.status, "pending")));

    const [kpiMonth] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(
        and(
          inArray(labOrders.labId, inHouseLabIds),
          eq(labOrders.status, "completed"),
          gte(labOrders.completedAt, startOfMonth),
        )
      );

    const [kpiToday] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(labOrders)
      .where(
        and(
          inArray(labOrders.labId, inHouseLabIds),
          eq(labOrders.status, "completed"),
          gte(labOrders.completedAt, startOfToday),
        )
      );

    return NextResponse.json({
      orders: rows,
      kpi: {
        pending: kpiPending?.count ?? 0,
        thisMonth: kpiMonth?.count ?? 0,
        today: kpiToday?.count ?? 0,
        topDoctor: null,
      },
    });
  }

  // ── "sent" direction (default) ────────────────────────────────────────────

  if (allDoctorIds.length === 0) {
    return NextResponse.json({ orders: [], kpi: { pending: 0, thisMonth: 0, today: 0, topDoctor: null } });
  }

  // Scope to a single doctor if requested and valid
  const targetDoctorIds =
    doctorIdParam && allDoctorIds.includes(doctorIdParam)
      ? [doctorIdParam]
      : allDoctorIds;

  // Build WHERE conditions
  const conditions = [inArray(labOrders.doctorId, targetDoctorIds)];

  if (statusParam !== "all") {
    conditions.push(eq(labOrders.status, statusParam));
  }

  if (urgencyParam && (urgencyParam === "routine" || urgencyParam === "urgent")) {
    conditions.push(eq(labOrders.urgency, urgencyParam));
  }

  if (fromParam) {
    const fromDate = new Date(fromParam);
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(labOrders.createdAt, fromDate));
    }
  }

  if (toParam) {
    const toDate = new Date(toParam);
    if (!isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(labOrders.createdAt, toDate));
    }
  }

  const rows = await db
    .select({
      id: labOrders.id,
      doctorId: labOrders.doctorId,
      patientId: labOrders.patientId,
      labId: labOrders.labId,
      tests: labOrders.tests,
      urgency: labOrders.urgency,
      status: labOrders.status,
      instructions: labOrders.instructions,
      createdAt: labOrders.createdAt,
      completedAt: labOrders.completedAt,
      patientName: patients.name,
      doctorName: doctors.name,
      labName: labs.name,
    })
    .from(labOrders)
    .innerJoin(patients, eq(labOrders.patientId, patients.id))
    .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .leftJoin(labs, eq(labOrders.labId, labs.id))
    .where(and(...conditions))
    .orderBy(desc(labOrders.createdAt))
    .limit(200);

  // ── KPI strip ─────────────────────────────────────────────────────────────
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  const [kpiPending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(labOrders)
    .where(and(inArray(labOrders.doctorId, allDoctorIds), eq(labOrders.status, "pending")));

  const [kpiThisMonth] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(labOrders)
    .where(
      and(
        inArray(labOrders.doctorId, allDoctorIds),
        eq(labOrders.status, "completed"),
        gte(labOrders.completedAt, startOfMonth),
      )
    );

  const [kpiToday] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(labOrders)
    .where(
      and(
        inArray(labOrders.doctorId, allDoctorIds),
        eq(labOrders.status, "completed"),
        gte(labOrders.completedAt, startOfToday),
      )
    );

  const topDoctorRows = await db
    .select({
      doctorId: labOrders.doctorId,
      doctorName: doctors.name,
      count: sql<number>`count(*)::int`,
    })
    .from(labOrders)
    .innerJoin(doctors, eq(labOrders.doctorId, doctors.id))
    .where(inArray(labOrders.doctorId, allDoctorIds))
    .groupBy(labOrders.doctorId, doctors.name)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const topDoctor = topDoctorRows[0]
    ? { name: topDoctorRows[0].doctorName, count: topDoctorRows[0].count }
    : null;

  return NextResponse.json({
    orders: rows,
    kpi: {
      pending: kpiPending?.count ?? 0,
      thisMonth: kpiThisMonth?.count ?? 0,
      today: kpiToday?.count ?? 0,
      topDoctor,
    },
  });
}
