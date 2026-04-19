import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  const conditions = [eq(appointments.doctorId, session.user.id)];
  if (dateFrom) conditions.push(gte(appointments.startsAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(appointments.startsAt, new Date(dateTo)));

  const results = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      checkedInAt: appointments.checkedInAt,
      patientName: patients.name,
      patientPhone: patients.phone,
      patientNoShowCount: patients.noShowCount,
      patientLastMinuteCancelCount: patients.lastMinuteCancelCount,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.startsAt))
    .limit(100);

  return NextResponse.json(results);
}
