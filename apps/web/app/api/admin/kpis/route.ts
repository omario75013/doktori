import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  db,
  doctors,
  patients,
  appointments,
  reviews,
  subscriptions,
  sosSessions,
} from "@doktori/db";
import { and, count, eq, gte, inArray, sql, sum } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    [{ v: totalDoctors }],
    [{ v: activeDoctors }],
    [{ v: pendingDoctors }],
    [{ v: totalPatients }],
    [{ v: patientsToday }],
    [{ v: patients7d }],
    [{ v: bookingsToday }],
    [{ v: bookings7d }],
    [{ v: pendingAppointments }],
    [{ v: pendingReviews }],
    [{ v: activeSubs }],
    [{ mrr }],
    [{ v: sosInProgress }],
  ] = await Promise.all([
    db.select({ v: count() }).from(doctors),
    db.select({ v: count() }).from(doctors).where(eq(doctors.isActive, true)),
    db.select({ v: count() }).from(doctors).where(eq(doctors.isActive, false)),
    db.select({ v: count() }).from(patients),
    db.select({ v: count() }).from(patients).where(gte(patients.createdAt, startOfToday)),
    db.select({ v: count() }).from(patients).where(gte(patients.createdAt, weekAgo)),
    db
      .select({ v: count() })
      .from(appointments)
      .where(gte(appointments.startsAt, startOfToday)),
    db
      .select({ v: count() })
      .from(appointments)
      .where(
        and(
          gte(appointments.createdAt, weekAgo),
          sql`${appointments.status} != 'cancelled'`
        )
      ),
    db
      .select({ v: count() })
      .from(appointments)
      .where(eq(appointments.status, "pending")),
    db.select({ v: count() }).from(reviews).where(eq(reviews.status, "pending")),
    db
      .select({ v: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active")),
    db
      .select({ mrr: sum(subscriptions.priceMillimes) })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active"),
          eq(subscriptions.billingCycle, "monthly")
        )
      ),
    db
      .select({ v: count() })
      .from(sosSessions)
      .where(inArray(sosSessions.status, ["pending", "accepted"])),
  ]);

  return NextResponse.json({
    doctors: {
      total: Number(totalDoctors),
      active: Number(activeDoctors),
      pending: Number(pendingDoctors),
    },
    patients: {
      total: Number(totalPatients),
      today: Number(patientsToday),
      week: Number(patients7d),
    },
    appointments: {
      today: Number(bookingsToday),
      week: Number(bookings7d),
      pending: Number(pendingAppointments),
    },
    reviews: { pending: Number(pendingReviews) },
    subscriptions: {
      active: Number(activeSubs),
      mrrMillimes: Number(mrr ?? 0),
    },
    sos: { inProgress: Number(sosInProgress) },
    at: now.toISOString(),
  });
}
