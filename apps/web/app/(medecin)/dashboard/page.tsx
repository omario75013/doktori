import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";

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

  // Fetch doctor consultation mode + teleconsult stats using raw SQL (new columns)
  const [doctorRow, teleconsultCountRow, walletRow] = await Promise.all([
    db.execute(
      sql`SELECT consultation_mode FROM doctors WHERE id = ${doctorId} LIMIT 1`
    ),
    db.execute(
      sql`SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ${doctorId} AND type = 'teleconsult' AND starts_at >= ${monthStart.toISOString()}`
    ),
    db.execute(
      sql`SELECT balance FROM doctor_wallets WHERE doctor_id = ${doctorId} LIMIT 1`
    ),
  ]);

  const consultationMode =
    ((doctorRow as unknown as Array<{ consultation_mode: string | null }>)[0])
      ?.consultation_mode ?? "cabinet";

  const teleconsultCount = Number(
    ((teleconsultCountRow as unknown as Array<{ count: string }>)[0])?.count ?? 0
  );

  const walletBalance = Number(
    ((walletRow as unknown as Array<{ balance: number | null }>)[0])?.balance ?? 0
  );

  const hasTeleconsult = consultationMode === "teleconsult" || consultationMode === "both";

  return (
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
    />
  );
}
