import { NextRequest, NextResponse } from "next/server";
import { db, appointments, doctors, patientFavorites } from "@doktori/db";
import { eq, inArray } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

// GET /api/me/doctors — list of doctors the patient is "connected" to,
// used as the picker in the share-document modal. Combines doctors the
// patient has appointments with (any status) and doctors the patient has
// favorited. Deduped by doctor id.
export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const apptDoctors = await db
    .select({ doctorId: appointments.doctorId })
    .from(appointments)
    .where(eq(appointments.patientId, patient.id));

  let favDoctorIds: string[] = [];
  try {
    const favRows = await db
      .select({ doctorId: patientFavorites.doctorId })
      .from(patientFavorites)
      .where(eq(patientFavorites.patientId, patient.id));
    favDoctorIds = favRows.map((r) => r.doctorId).filter(Boolean) as string[];
  } catch {
    /* favorites table optional in some envs */
  }

  const ids = Array.from(
    new Set([...apptDoctors.map((r) => r.doctorId), ...favDoctorIds].filter(Boolean)),
  );

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const rows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
      photoUrl: doctors.photoUrl,
    })
    .from(doctors)
    .where(inArray(doctors.id, ids));

  return NextResponse.json({ items: rows });
}
