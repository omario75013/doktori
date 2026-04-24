import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, inArray, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || (user.role !== "doctor" && user.role !== "secretary")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let doctorId: string | null = null;
  if (user.role === "doctor") {
    doctorId = user.id;
  } else if (user.role === "secretary") {
    doctorId = user.doctorId ?? null;
  }

  if (!doctorId) {
    return NextResponse.json([]);
  }

  try {
    const results = await db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        type: appointments.type,
        patientId: appointments.patientId,
        patientName: patients.name,
        patientPhone: patients.phone,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          inArray(appointments.status, ["reschedule_requested", "cancel_requested"])
        )
      )
      .orderBy(desc(appointments.updatedAt));

    return NextResponse.json(results);
  } catch (e) {
    console.error("[GET /api/appointments/change-requests]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
