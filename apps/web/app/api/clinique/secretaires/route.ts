import { NextRequest, NextResponse } from "next/server";
import {
  db,
  secretaries,
  clinicDoctors,
  doctorPractices,
  doctors,
} from "@doktori/db";
import { eq, inArray, and } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { logClinicAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Returns the IDs of all doctor_practices rows that belong to this clinic. */
async function getClinicPracticeIds(clinicId: string): Promise<string[]> {
  const rows = await db
    .select({ id: doctorPractices.id })
    .from(doctorPractices)
    .where(eq(doctorPractices.clinicId, clinicId));
  return rows.map((r) => r.id);
}

// ─── GET /api/clinique/secretaires ───────────────────────────────────────────
// Phase 3: only surfaces secretaries whose practice_id resolves to a
// doctor_practices row that belongs to THIS clinic.

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const practiceIds = await getClinicPracticeIds(clinic.id);
  if (practiceIds.length === 0) {
    return NextResponse.json({ secretaries: [] });
  }

  const rows = await db
    .select({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
      isActive: secretaries.isActive,
      createdAt: secretaries.createdAt,
      doctorId: secretaries.doctorId,
      practiceId: secretaries.practiceId,
      doctorName: doctors.name,
    })
    .from(secretaries)
    .leftJoin(doctors, eq(secretaries.doctorId, doctors.id))
    .where(inArray(secretaries.practiceId, practiceIds));

  return NextResponse.json({ secretaries: rows });
}

// ─── POST /api/clinique/secretaires ──────────────────────────────────────────
// Creates a secretary scoped to a clinic-owned practice.
// Requires: { name, email, password, doctorId, practiceId }

export async function POST(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { name, email, password, doctorId, practiceId } = body as {
    name?: string;
    email?: string;
    password?: string;
    doctorId?: string;
    practiceId?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Nom, email et mot de passe requis" },
      { status: 400 }
    );
  }

  // practiceId is required for clinic-side creation in Phase 3
  if (!practiceId) {
    return NextResponse.json(
      { error: "Cabinet requis" },
      { status: 400 }
    );
  }

  // Verify the practice belongs to this clinic
  const [practice] = await db
    .select({ id: doctorPractices.id, doctorId: doctorPractices.doctorId })
    .from(doctorPractices)
    .where(
      and(
        eq(doctorPractices.id, practiceId),
        eq(doctorPractices.clinicId, clinic.id)
      )
    )
    .limit(1);

  if (!practice) {
    return NextResponse.json(
      { error: "Cabinet introuvable ou n'appartient pas à la clinique" },
      { status: 403 }
    );
  }

  // If doctorId is supplied, it must match the practice's doctor
  const resolvedDoctorId = doctorId ?? practice.doctorId;
  if (resolvedDoctorId !== practice.doctorId) {
    return NextResponse.json(
      { error: "Ce médecin ne correspond pas au cabinet sélectionné" },
      { status: 403 }
    );
  }

  // Verify doctor belongs to this clinic via clinic_doctors
  const [membership] = await db
    .select({ id: clinicDoctors.id })
    .from(clinicDoctors)
    .where(
      and(
        eq(clinicDoctors.clinicId, clinic.id),
        eq(clinicDoctors.doctorId, resolvedDoctorId)
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json(
      { error: "Ce médecin n'appartient pas à la clinique" },
      { status: 403 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [created] = await db
    .insert(secretaries)
    .values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      doctorId: resolvedDoctorId,
      // clinicId removed from schema (Section D: drop_secretaries_clinic_id.sql)
      practiceId,
      isActive: true,
    })
    .returning({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
    });

  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    action: "secretary_create",
    targetType: "secretary",
    targetId: created.id,
    metadata: { practiceId, doctorId: resolvedDoctorId },
  });

  return NextResponse.json({ secretary: created }, { status: 201 });
}

// ─── DELETE /api/clinique/secretaires?id=<uuid> ───────────────────────────────
// Only allows deleting a secretary whose practiceId belongs to this clinic.

export async function DELETE(req: NextRequest) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { searchParams } = new URL(req.url);
  const secretaryId = searchParams.get("id");

  if (!secretaryId) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  // Verify via practice scope
  const practiceIds = await getClinicPracticeIds(clinic.id);

  const [target] = await db
    .select({ id: secretaries.id, practiceId: secretaries.practiceId })
    .from(secretaries)
    .where(eq(secretaries.id, secretaryId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "Secrétaire introuvable" }, { status: 404 });
  }

  // Must belong to a clinic-owned practice
  if (!target.practiceId || !practiceIds.includes(target.practiceId)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await db.delete(secretaries).where(eq(secretaries.id, secretaryId));

  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    action: "secretary_delete",
    targetType: "secretary",
    targetId: secretaryId,
    metadata: { practiceId: target.practiceId },
  });

  return NextResponse.json({ success: true });
}
