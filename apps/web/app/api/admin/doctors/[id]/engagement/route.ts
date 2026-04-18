import { NextResponse } from "next/server";
import { eq, and, gte, count, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { db, doctors, appointments, adminAuditLogs } from "@doktori/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "support", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [doctor] = await db
    .select({
      id: doctors.id,
      photoUrl: doctors.photoUrl,
      bio: doctors.bio,
      educations: doctors.educations,
      experiences: doctors.experiences,
      consultationFee: doctors.consultationFee,
    })
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  // ── 1. Profile completeness (25%) ──────────────────────────────────────────
  let profileScore = 0;
  if (doctor.photoUrl) profileScore += 25;
  if (doctor.bio && doctor.bio.trim().length > 50) profileScore += 25;
  if (Array.isArray(doctor.educations) && doctor.educations.length > 0) profileScore += 25;
  if (doctor.consultationFee && doctor.consultationFee > 0) profileScore += 25;
  // profileScore is 0-100

  // ── 2. Appointment activity — last 30 days (25%) ────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [activityRow] = await db
    .select({ total: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, id),
        gte(appointments.startsAt, thirtyDaysAgo)
      )
    );

  const recentAppointments = activityRow?.total ?? 0;
  // Scale: 0 = 0pts, 5+ = 50pts, 15+ = 100pts
  const activityScore = Math.min(100, Math.round((recentAppointments / 15) * 100));

  // ── 3. Response rate (accepted vs expired) (25%) ────────────────────────────
  const [responseRow] = await db
    .select({
      confirmed: sql<number>`COUNT(*) FILTER (WHERE status = 'confirmed')`,
      expired: sql<number>`COUNT(*) FILTER (WHERE status = 'expired')`,
      total: count(),
    })
    .from(appointments)
    .where(eq(appointments.doctorId, id));

  const confirmedCount = Number(responseRow?.confirmed ?? 0);
  const totalDecisioned = Number(responseRow?.total ?? 0);
  const responseScore =
    totalDecisioned > 0
      ? Math.min(100, Math.round((confirmedCount / totalDecisioned) * 100))
      : 50; // default 50 if no data yet

  // ── 4. Platform usage — login / activity (25%) ──────────────────────────────
  const thirtyDaysAgoUsage = new Date();
  thirtyDaysAgoUsage.setDate(thirtyDaysAgoUsage.getDate() - 30);

  // Approximate usage by counting recent audit log references to this doctor
  // or profile update actions (best we can do without a doctor login log)
  const [usageRow] = await db
    .select({ total: count() })
    .from(adminAuditLogs)
    .where(
      and(
        sql`${adminAuditLogs.resourceId} = ${id}`,
        gte(adminAuditLogs.createdAt, thirtyDaysAgoUsage)
      )
    );

  // Also count appointments as a proxy for logins (doctors check their appointments)
  const usageEvents = (usageRow?.total ?? 0) + Math.min(5, recentAppointments);
  const usageScore = Math.min(100, Math.round((usageEvents / 10) * 100));

  // ── Composite score ─────────────────────────────────────────────────────────
  const score = Math.round(
    (profileScore * 0.25) +
    (activityScore * 0.25) +
    (responseScore * 0.25) +
    (usageScore * 0.25)
  );

  return NextResponse.json({
    doctorId: id,
    score,
    breakdown: {
      profile: profileScore,
      activity: activityScore,
      response: responseScore,
      usage: usageScore,
    },
    meta: {
      recentAppointments,
      confirmedCount,
      totalDecisioned,
    },
  });
}
