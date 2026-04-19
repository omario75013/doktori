import { NextResponse } from "next/server";
import {
  db,
  appointments,
  doctors,
  patients,
  clinicDoctors,
} from "@doktori/db";
import {
  eq,
  and,
  gte,
  lte,
  inArray,
  count,
  countDistinct,
  sql,
} from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  // Get all doctor IDs for this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  if (allDoctorIds.length === 0) {
    return NextResponse.json({
      totalThisMonth: 0,
      completionRate: 0,
      noShowRate: 0,
      activePatients: 0,
      statusDistribution: [],
      perDoctor: [],
    });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // All appointments this month
  const monthCondition = and(
    inArray(appointments.doctorId, allDoctorIds),
    gte(appointments.startsAt, monthStart),
    lte(appointments.startsAt, monthEnd)
  );

  // Total count
  const [totalRow] = await db
    .select({ total: count(appointments.id) })
    .from(appointments)
    .where(monthCondition);

  const total = Number(totalRow?.total ?? 0);

  // Status distribution
  const statusDist = await db
    .select({
      status: appointments.status,
      total: count(appointments.id),
    })
    .from(appointments)
    .where(monthCondition)
    .groupBy(appointments.status);

  const statusMap = new Map(statusDist.map((r) => [r.status, Number(r.total)]));
  const completed = statusMap.get("completed") ?? 0;
  const noShow = statusMap.get("no_show") ?? 0;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;

  // Unique active patients this month
  const [activeRow] = await db
    .select({ count: countDistinct(appointments.patientId) })
    .from(appointments)
    .where(monthCondition);

  const activePatients = Number(activeRow?.count ?? 0);

  // Per-doctor stats
  const perDoctorAgg = await db
    .select({
      doctorId: appointments.doctorId,
      total: count(appointments.id),
      completed: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'completed')`,
      noShow: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'no_show')`,
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${appointments.status} = 'cancelled')`,
    })
    .from(appointments)
    .where(monthCondition)
    .groupBy(appointments.doctorId);

  // Doctor details
  const doctorRows = await db
    .select({ id: doctors.id, name: doctors.name, specialty: doctors.specialty })
    .from(doctors)
    .where(inArray(doctors.id, allDoctorIds));

  const doctorMap = new Map(doctorRows.map((d) => [d.id, d]));
  const aggMap = new Map(perDoctorAgg.map((r) => [r.doctorId, r]));

  const perDoctor = allDoctorIds.map((doctorId) => {
    const doc = doctorMap.get(doctorId);
    const agg = aggMap.get(doctorId);
    const t = Number(agg?.total ?? 0);
    const c = Number(agg?.completed ?? 0);
    const n = Number(agg?.noShow ?? 0);
    return {
      doctorId,
      name: doc?.name ?? "—",
      specialty: doc?.specialty ?? "—",
      total: t,
      completed: c,
      noShow: n,
      cancelled: Number(agg?.cancelled ?? 0),
      completionPct: t > 0 ? Math.round((c / t) * 100) : 0,
      noShowPct: t > 0 ? Math.round((n / t) * 100) : 0,
    };
  });

  const statusDistribution = statusDist.map((r) => ({
    status: r.status,
    total: Number(r.total),
  }));

  return NextResponse.json({
    totalThisMonth: total,
    completionRate,
    noShowRate,
    activePatients,
    statusDistribution,
    perDoctor,
  });
}
