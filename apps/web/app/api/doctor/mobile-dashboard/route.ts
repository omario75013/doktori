import { NextRequest, NextResponse } from "next/server";
import { db, appointments, patients, doctorWallets } from "@doktori/db";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { getSMSUsage } from "@/lib/sms-quota";

/**
 * GET /api/doctor/mobile-dashboard
 *
 * One-shot dashboard payload for the mobile-staff doctor home screen.
 * Bundles everything the web dashboard computes server-side so the mobile
 * client doesn't need 7 round-trips.
 *
 * Bearer-friendly (mobile) AND cookie-friendly (web preview) via requireAuth.
 */
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const doctorId = user.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Today's appointments — used for waitingCount + todayCount
  const todayRows = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      checkedInAt: appointments.checkedInAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, todayStart),
        lte(appointments.startsAt, todayEnd),
      ),
    );

  const waitingRoomCount = todayRows.filter(
    (r) => r.status === "confirmed" && r.checkedInAt !== null,
  ).length;

  const [
    teleconsultRow,
    walletRow,
    smsUsage,
    monthStatsRow,
    noShowMonthRows,
    totalPatientsRow,
    recentRows,
  ] = await Promise.all([
    db.execute(
      sql`SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ${doctorId} AND type = 'teleconsult' AND starts_at >= ${monthStart.toISOString()}`,
    ),
    db
      .select({ balance: doctorWallets.balance })
      .from(doctorWallets)
      .where(eq(doctorWallets.doctorId, doctorId))
      .limit(1),
    getSMSUsage(doctorId).catch(() => ({ used: 0, limit: 0, plan: "" })),
    db.execute(
      sql`SELECT
        COUNT(*) AS month_total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'no_show') AS no_shows
      FROM appointments
      WHERE doctor_id = ${doctorId} AND starts_at >= ${monthStart.toISOString()}`,
    ),
    db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.status, "no_show"),
          gte(appointments.startsAt, thirtyDaysAgo),
        ),
      ),
    db.execute(
      sql`SELECT COUNT(DISTINCT patient_id) AS total FROM appointments WHERE doctor_id = ${doctorId}`,
    ),
    db
      .select({
        id: appointments.id,
        status: appointments.status,
        startsAt: appointments.startsAt,
        updatedAt: appointments.updatedAt,
        patientName: patients.name,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.doctorId, doctorId))
      .orderBy(desc(appointments.updatedAt))
      .limit(8),
  ]);

  const teleconsultCount = Number(
    ((teleconsultRow as unknown as Array<{ count: string }>)[0])?.count ?? 0,
  );
  const walletBalance = Number(walletRow[0]?.balance ?? 0);

  type MonthStats = { month_total: string; completed: string; no_shows: string };
  const ms = (monthStatsRow as unknown as MonthStats[])[0];
  const monthTotal = Number(ms?.month_total ?? 0);
  const monthCompleted = Number(ms?.completed ?? 0);
  const monthNoShows = Number(ms?.no_shows ?? 0);
  const decisiveTotal = monthCompleted + monthNoShows;
  const completionRate =
    decisiveTotal > 0 ? Math.round((monthCompleted / decisiveTotal) * 100) : null;

  const totalPatients = Number(
    ((totalPatientsRow as unknown as Array<{ total: string }>)[0])?.total ?? 0,
  );

  return NextResponse.json({
    todayCount: todayRows.length,
    waitingRoomCount,
    teleconsultCount,
    walletBalance,
    sms: smsUsage,
    monthTotal,
    monthCompleted,
    monthNoShows,
    monthNoShowsRolling: noShowMonthRows.length,
    completionRate,
    totalPatients,
    recentActivity: recentRows.map((r) => ({
      id: r.id,
      status: r.status,
      startsAt: r.startsAt,
      updatedAt: r.updatedAt,
      patientName: r.patientName,
    })),
  });
}
