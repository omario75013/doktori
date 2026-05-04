import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";
import { OnboardingTour } from "@/components/medecin/onboarding-tour";
import { getSMSUsage } from "@/lib/sms-quota";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const doctorId = session.user.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayAppts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      checkedInAt: appointments.checkedInAt,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, todayStart),
        lte(appointments.startsAt, todayEnd),
      ),
    )
    .orderBy(appointments.startsAt);

  const upcomingAppts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      patientName: patients.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, todayEnd),
        lte(appointments.startsAt, weekEnd),
      ),
    )
    .orderBy(appointments.startsAt)
    .limit(20);

  const monthNoShows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.status, "no_show"),
        gte(appointments.startsAt, monthStart),
      ),
    );

  const toConfirm = todayAppts.filter((a) => a.status === "pending").length;

  // Waiting room: today's confirmed appointments where patient has checked in
  const waitingPatients = todayAppts
    .filter((a) => a.status === "confirmed" && a.checkedInAt !== null)
    .map((a) => ({
      id: a.id,
      patientName: a.patientName,
      checkedInAt: a.checkedInAt as Date,
      startsAt: a.startsAt,
    }))
    .sort((a, b) => a.checkedInAt.getTime() - b.checkedInAt.getTime());

  // Fetch doctor consultation mode, verification status + teleconsult stats + new quick stats
  const [doctorRow, teleconsultCountRow, walletRow, smsUsageData, totalPatientsRow, monthStatsRow, recentActivityRows] = await Promise.all([
    db.execute(
      sql`SELECT consultation_mode, verification_status, verification_note, average_rating, onboarding_tour_completed_at, onboarding_tour_skipped FROM doctors WHERE id = ${doctorId} LIMIT 1`
    ),
    db.execute(
      sql`SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ${doctorId} AND type = 'teleconsult' AND starts_at >= ${monthStart.toISOString()}`
    ),
    db.execute(
      sql`SELECT balance FROM doctor_wallets WHERE doctor_id = ${doctorId} LIMIT 1`
    ),
    getSMSUsage(doctorId),
    // Total unique patients all time
    db.execute(
      sql`SELECT COUNT(DISTINCT patient_id) AS total_patients FROM appointments WHERE doctor_id = ${doctorId}`
    ),
    // Month stats: total, completed, no_shows for completion rate
    db.execute(
      sql`SELECT
        COUNT(*) AS month_total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'no_show') AS no_shows
      FROM appointments
      WHERE doctor_id = ${doctorId} AND starts_at >= ${monthStart.toISOString()}`
    ),
    // Recent activity feed: last 5 updated appointments
    db.execute(
      sql`SELECT a.id, a.status, a.starts_at, a.updated_at, p.name AS patient_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      WHERE a.doctor_id = ${doctorId}
      ORDER BY a.updated_at DESC
      LIMIT 5`
    ),
  ]);

  type DoctorRowType = {
    consultation_mode: string | null;
    verification_status: string | null;
    verification_note: string | null;
    average_rating: number | null;
    onboarding_tour_completed_at: string | null;
    onboarding_tour_skipped: boolean | null;
  };
  const drRow = ((doctorRow as unknown as DoctorRowType[])[0]);
  const consultationMode = drRow?.consultation_mode ?? "cabinet";
  const verificationStatus = drRow?.verification_status ?? "pending";
  const verificationNote = drRow?.verification_note ?? null;
  const averageRating = Number(drRow?.average_rating ?? 0);
  const tourEnabled =
    !drRow?.onboarding_tour_completed_at && !drRow?.onboarding_tour_skipped;

  const teleconsultCount = Number(
    ((teleconsultCountRow as unknown as Array<{ count: string }>)[0])?.count ?? 0
  );

  const walletBalance = Number(
    ((walletRow as unknown as Array<{ balance: number | null }>)[0])?.balance ?? 0
  );

  const hasTeleconsult = consultationMode === "teleconsult" || consultationMode === "both";

  // Quick stats
  const totalPatients = Number(
    ((totalPatientsRow as unknown as Array<{ total_patients: string }>)[0])?.total_patients ?? 0
  );

  type MonthStatsType = { month_total: string; completed: string; no_shows: string };
  const monthStatsData = (monthStatsRow as unknown as MonthStatsType[])[0];
  const monthTotal = Number(monthStatsData?.month_total ?? 0);
  const monthCompleted = Number(monthStatsData?.completed ?? 0);
  const monthNoShowsCount = Number(monthStatsData?.no_shows ?? 0);
  // Completion rate: completed / (completed + no_shows) — decisive outcomes only
  const decisiveTotal = monthCompleted + monthNoShowsCount;
  const completionRate = decisiveTotal > 0 ? Math.round((monthCompleted / decisiveTotal) * 100) : null;

  // Recent activity feed
  type ActivityRowType = { id: string; status: string; starts_at: string; updated_at: string; patient_name: string };
  const recentActivity = (recentActivityRows as unknown as ActivityRowType[]).map((r) => ({
    id: r.id,
    status: r.status,
    startsAt: r.starts_at,
    updatedAt: r.updated_at,
    patientName: r.patient_name,
  }));

  return (
    <>
      <OnboardingTour enabled={tourEnabled} />
      <DashboardClient
      doctorName={session.user.name ?? "Médecin"}
      todayCount={todayAppts.length}
      toConfirm={toConfirm}
      noShowCount={monthNoShows.length}
      teleconsultCount={teleconsultCount}
      walletBalance={walletBalance}
      hasTeleconsult={hasTeleconsult}
      consultationMode={consultationMode}
      todayAppts={todayAppts}
      upcomingAppts={upcomingAppts}
      verificationStatus={verificationStatus}
      verificationNote={verificationNote}
      smsUsed={smsUsageData.used}
      smsLimit={smsUsageData.limit}
      smsPlan={smsUsageData.plan}
      totalPatients={totalPatients}
      monthTotal={monthTotal}
      completionRate={completionRate}
      averageRating={averageRating}
      recentActivity={recentActivity}
      waitingRoomCount={waitingPatients.length}
      waitingPatients={waitingPatients}
    />
    </>
  );
}
