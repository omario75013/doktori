import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, appointments } from "@doktori/db";
import { count, eq, gte, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin([]);
  if (admin instanceof NextResponse) return admin;

  const since = new Date(Date.now() - 30 * 86400000);

  const [
    [{ v: total }],
    [{ v: pending }],
    [{ v: confirmed }],
    [{ v: completed }],
  ] = await Promise.all([
    db.select({ v: count() }).from(appointments).where(gte(appointments.createdAt, since)),
    db
      .select({ v: count() })
      .from(appointments)
      .where(and(gte(appointments.createdAt, since), eq(appointments.status, "pending"))),
    db
      .select({ v: count() })
      .from(appointments)
      .where(and(gte(appointments.createdAt, since), eq(appointments.status, "confirmed"))),
    db
      .select({ v: count() })
      .from(appointments)
      .where(and(gte(appointments.createdAt, since), eq(appointments.status, "completed"))),
  ]);

  return NextResponse.json({
    steps: [
      { step: "Créés", count: Number(total) },
      { step: "En attente", count: Number(pending) },
      { step: "Confirmés", count: Number(confirmed) },
      { step: "Complétés", count: Number(completed) },
    ],
  });
}
