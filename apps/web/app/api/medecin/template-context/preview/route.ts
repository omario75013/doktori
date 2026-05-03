import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctors, doctorPractices } from "@doktori/db";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/medecin/template-context/preview
 *
 * Returns a fictive patient context (Sami Trabelsi, 35 ans, allergique pénicilline)
 * combined with the real authenticated doctor data. Used to preview template rendering
 * without needing a real patient or appointment.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Fetch real doctor info
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.id, user.id))
      .limit(1);

    const [primaryPractice] = await db
      .select()
      .from(doctorPractices)
      .where(and(eq(doctorPractices.doctorId, user.id), eq(doctorPractices.isPrimary, true)))
      .limit(1);

    // Fictive patient data for preview purposes
    const fictivePatient = {
      id: "preview-patient-id",
      name: "Sami Trabelsi",
      dateOfBirth: "1991-03-15", // ~35 ans en 2026
      gender: "male",
      weightKg: "72.00",
      heightCm: 178,
      bloodType: "A+",
      medicalProfile: {
        allergies: "Pénicilline",
        chronicConditions: null,
        currentMeds: null,
        notes: null,
      },
    };

    return NextResponse.json({
      patient: fictivePatient,
      doctor: {
        ...doctor,
        primaryPractice: primaryPractice ?? null,
      },
      appointment: {
        id: "preview-appointment-id",
        startsAt: new Date().toISOString(),
        type: "cabinet",
        reason: "Consultation de routine",
      },
      appointmentType: null,
    });
  } catch (e) {
    console.error("[GET /api/medecin/template-context/preview]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
