import { NextRequest, NextResponse } from "next/server";
import { db, patients, patientMedicalProfile } from "@doktori/db";
import { eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

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
    .where(eq(patients.id, session.id))
    .limit(1);

  if (!patient) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const [profile] = await db
    .select()
    .from(patientMedicalProfile)
    .where(eq(patientMedicalProfile.patientId, session.id))
    .limit(1);

  return NextResponse.json({
    patient,
    profile: profile ?? {
      allergies: "",
      chronicConditions: "",
      currentMeds: "",
      notes: "",
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body invalide" }, { status: 400 });

  const { dateOfBirth, gender, bloodType, allergies, chronicConditions, currentMeds, notes } = body;

  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }
  if (gender && !["M", "F"].includes(gender)) {
    return NextResponse.json({ error: "Genre invalide" }, { status: 400 });
  }
  if (bloodType && !["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(bloodType)) {
    return NextResponse.json({ error: "Groupe sanguin invalide" }, { status: 400 });
  }

  await db
    .update(patients)
    .set({
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      bloodType: bloodType || null,
    })
    .where(eq(patients.id, session.id));

  const clean = (s: unknown) =>
    typeof s === "string" ? s.slice(0, 2000).trim() || null : null;

  const values = {
    patientId: session.id,
    allergies: clean(allergies),
    chronicConditions: clean(chronicConditions),
    currentMeds: clean(currentMeds),
    notes: clean(notes),
    updatedAt: new Date(),
  };

  await db
    .insert(patientMedicalProfile)
    .values(values)
    .onConflictDoUpdate({
      target: patientMedicalProfile.patientId,
      set: {
        allergies: values.allergies,
        chronicConditions: values.chronicConditions,
        currentMeds: values.currentMeds,
        notes: values.notes,
        updatedAt: values.updatedAt,
      },
    });

  return NextResponse.json({ ok: true });
}
