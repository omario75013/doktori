import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments, patients } from "@doktori/db";
import { and, eq, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "secretary" && session.user.role !== "doctor")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const doctorId =
    session.user.role === "doctor" ? session.user.id : session.user.doctorId;
  if (!doctorId) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from/to requis (ISO)" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      patientId: appointments.patientId,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, new Date(from)),
        lte(appointments.startsAt, new Date(to))
      )
    )
    .orderBy(appointments.startsAt);

  return NextResponse.json(rows);
}
