import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  db,
  appointments,
  patients,
  patientMedicalProfile,
  doctors,
  doctorPractices,
  appointmentTypes,
} from "@doktori/db";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: patientId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get("appointmentId");

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId requis" }, { status: 400 });
    }

    // B2 IDOR: single atomic query — select only stable columns common to all DB versions.
    // Validate appointmentId + doctorId + patientId simultaneously — if ANY mismatches → 403.
    // Note: appointmentTypeId excluded here to maintain DB-version compatibility;
    // it is read separately via a second query below.
    const [appt] = await db
      .select({
        id: appointments.id,
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        type: appointments.type,
        reason: appointments.reason,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.doctorId, user.id),
          eq(appointments.patientId, patientId)
        )
      )
      .limit(1);

    // Fetch appointmentTypeId separately (not available in all DB migration states)
    const apptTypeId = await db
      .select({ appointmentTypeId: appointments.appointmentTypeId })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1)
      .then(rows => rows[0]?.appointmentTypeId ?? null)
      .catch(() => null); // graceful fallback if column doesn't exist yet

    if (!appt) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Fetch patient — select only stable columns present across DB migration states
    const [patient] = await db
      .select({
        id: patients.id,
        name: patients.name,
        phone: patients.phone,
        email: patients.email,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
        bloodType: patients.bloodType,
      })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
    }

    const [medicalProfile] = await db
      .select({
        id: patientMedicalProfile.id,
        patientId: patientMedicalProfile.patientId,
        allergies: patientMedicalProfile.allergies,
        chronicConditions: patientMedicalProfile.chronicConditions,
        currentMeds: patientMedicalProfile.currentMeds,
        notes: patientMedicalProfile.notes,
        updatedAt: patientMedicalProfile.updatedAt,
      })
      .from(patientMedicalProfile)
      .where(eq(patientMedicalProfile.patientId, patientId))
      .limit(1);

    // Fetch doctor info — select only stable columns
    const [doctor] = await db
      .select({
        id: doctors.id,
        name: doctors.name,
        email: doctors.email,
        specialty: doctors.specialty,
        city: doctors.city,
        phone: doctors.phone,
        consultationFee: doctors.consultationFee,
        photoUrl: doctors.photoUrl,
      })
      .from(doctors)
      .where(eq(doctors.id, user.id))
      .limit(1);

    // Fetch doctor primary practice — select only stable columns present across DB versions
    const [primaryPractice] = await db
      .select({
        id: doctorPractices.id,
        doctorId: doctorPractices.doctorId,
        name: doctorPractices.name,
        address: doctorPractices.address,
        city: doctorPractices.city,
        phone: doctorPractices.phone,
        isPrimary: doctorPractices.isPrimary,
        isActive: doctorPractices.isActive,
      })
      .from(doctorPractices)
      .where(and(eq(doctorPractices.doctorId, user.id), eq(doctorPractices.isPrimary, true)))
      .limit(1);

    // Fetch appointment type if present
    let appointmentType = null;
    if (apptTypeId) {
      const [at] = await db
        .select({
          id: appointmentTypes.id,
          doctorId: appointmentTypes.doctorId,
          name: appointmentTypes.name,
          durationMinutes: appointmentTypes.durationMinutes,
          fee: appointmentTypes.fee,
          color: appointmentTypes.color,
          mode: appointmentTypes.mode,
          isDefault: appointmentTypes.isDefault,
          isActive: appointmentTypes.isActive,
        })
        .from(appointmentTypes)
        .where(eq(appointmentTypes.id, apptTypeId!))
        .limit(1);
      appointmentType = at ?? null;
    }

    return NextResponse.json({
      appointment: appt,
      patient: {
        ...patient,
        medicalProfile: medicalProfile ?? null,
      },
      doctor: {
        ...doctor,
        primaryPractice: primaryPractice ?? null,
      },
      appointmentType,
    });
  } catch (e) {
    console.error("[GET /api/medecin/patients/[id]/template-context]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
