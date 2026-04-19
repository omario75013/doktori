import { NextRequest, NextResponse } from "next/server";
import {
  db,
  secretaries,
  clinicDoctors,
  doctors,
} from "@doktori/db";
import { eq, inArray, or, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  // Get all doctor IDs in this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  // Fetch secretaries that belong to the clinic directly OR to any clinic doctor
  const conditions = [eq(secretaries.clinicId, clinic.id)];
  if (allDoctorIds.length > 0) {
    conditions.push(inArray(secretaries.doctorId, allDoctorIds));
  }

  const rows = await db
    .select({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
      isActive: secretaries.isActive,
      createdAt: secretaries.createdAt,
      doctorId: secretaries.doctorId,
      clinicId: secretaries.clinicId,
      doctorName: doctors.name,
    })
    .from(secretaries)
    .leftJoin(doctors, eq(secretaries.doctorId, doctors.id))
    .where(or(...conditions));

  return NextResponse.json({ secretaries: rows });
}

export async function POST(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { name, email, password, doctorId } = body as {
    name?: string;
    email?: string;
    password?: string;
    doctorId?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Nom, email et mot de passe requis" },
      { status: 400 }
    );
  }

  // If doctorId supplied, verify it belongs to this clinic
  if (doctorId) {
    const [membership] = await db
      .select({ id: clinicDoctors.id })
      .from(clinicDoctors)
      .where(
        and(
          eq(clinicDoctors.clinicId, clinic.id),
          eq(clinicDoctors.doctorId, doctorId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "Ce médecin n'appartient pas à la clinique" },
        { status: 403 }
      );
    }
  }

  // Resolve the first clinic doctor as fallback if no doctorId provided
  let resolvedDoctorId = doctorId;
  if (!resolvedDoctorId) {
    const [firstDoctor] = await db
      .select({ doctorId: clinicDoctors.doctorId })
      .from(clinicDoctors)
      .where(eq(clinicDoctors.clinicId, clinic.id))
      .limit(1);

    if (!firstDoctor) {
      return NextResponse.json(
        { error: "Aucun médecin associé à cette clinique" },
        { status: 400 }
      );
    }
    resolvedDoctorId = firstDoctor.doctorId;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [created] = await db
    .insert(secretaries)
    .values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      doctorId: resolvedDoctorId,
      clinicId: clinic.id,
      isActive: true,
    })
    .returning({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
    });

  return NextResponse.json({ secretary: created }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = new URL(req.url);
  const secretaryId = searchParams.get("id");

  if (!secretaryId) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  // Verify the secretary belongs to this clinic
  const clinicDoctorRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));

  const allDoctorIds = clinicDoctorRows.map((r) => r.doctorId);

  const conditions = [eq(secretaries.clinicId, clinic.id)];
  if (allDoctorIds.length > 0) {
    conditions.push(inArray(secretaries.doctorId, allDoctorIds));
  }

  const [target] = await db
    .select({ id: secretaries.id })
    .from(secretaries)
    .where(eq(secretaries.id, secretaryId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Secrétaire introuvable" }, { status: 404 });
  }

  await db.delete(secretaries).where(eq(secretaries.id, secretaryId));

  return NextResponse.json({ success: true });
}
