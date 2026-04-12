import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, doctors, patients, appointments, subscriptions } from "@doktori/db";
import { count, eq, gte, and, lt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin([]);
  if (admin instanceof NextResponse) return admin;

  const now = new Date();

  // Start of current month
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Start of last month
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  function pct(curr: number, prev: number): number | null {
    if (prev === 0) return curr > 0 ? 100 : null;
    return Math.round(((curr - prev) / prev) * 100);
  }

  const [
    [{ v: apptThisMonth }],
    [{ v: apptLastMonth }],
    [{ v: patientsThisMonth }],
    [{ v: patientsLastMonth }],
    [{ v: doctorsThisMonth }],
    [{ v: doctorsLastMonth }],
    [{ v: activeSubs }],
  ] = await Promise.all([
    db
      .select({ v: count() })
      .from(appointments)
      .where(gte(appointments.createdAt, startOfThisMonth)),
    db
      .select({ v: count() })
      .from(appointments)
      .where(
        and(
          gte(appointments.createdAt, startOfLastMonth),
          lt(appointments.createdAt, startOfThisMonth)
        )
      ),
    db
      .select({ v: count() })
      .from(patients)
      .where(gte(patients.createdAt, startOfThisMonth)),
    db
      .select({ v: count() })
      .from(patients)
      .where(
        and(
          gte(patients.createdAt, startOfLastMonth),
          lt(patients.createdAt, startOfThisMonth)
        )
      ),
    db
      .select({ v: count() })
      .from(doctors)
      .where(gte(doctors.createdAt, startOfThisMonth)),
    db
      .select({ v: count() })
      .from(doctors)
      .where(
        and(
          gte(doctors.createdAt, startOfLastMonth),
          lt(doctors.createdAt, startOfThisMonth)
        )
      ),
    db
      .select({ v: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active")),
  ]);

  const curr = {
    appointments: Number(apptThisMonth),
    patients: Number(patientsThisMonth),
    doctors: Number(doctorsThisMonth),
  };
  const prev = {
    appointments: Number(apptLastMonth),
    patients: Number(patientsLastMonth),
    doctors: Number(doctorsLastMonth),
  };

  return NextResponse.json({
    appointments: {
      thisMonth: curr.appointments,
      lastMonth: prev.appointments,
      pctChange: pct(curr.appointments, prev.appointments),
    },
    patients: {
      thisMonth: curr.patients,
      lastMonth: prev.patients,
      pctChange: pct(curr.patients, prev.patients),
    },
    doctors: {
      thisMonth: curr.doctors,
      lastMonth: prev.doctors,
      pctChange: pct(curr.doctors, prev.doctors),
    },
    subscriptions: {
      active: Number(activeSubs),
    },
    at: now.toISOString(),
  });
}
