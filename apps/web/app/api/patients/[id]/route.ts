import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";
import { db, appointments, patients, patientMedicalProfile, secretaries } from "@doktori/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { parsePermissions, type Section } from "@/lib/secretary-permissions";

async function secretaryCan(secretaryId: string, section: Section): Promise<boolean> {
  const [row] = await db
    .select({ permissions: secretaries.permissions })
    .from(secretaries)
    .where(eq(secretaries.id, secretaryId))
    .limit(1);
  if (!row) return false;
  return parsePermissions(row.permissions)[section];
}

/** Ensure the caller is a doctor or secretary and has at least one appointment with this patient. */
async function authorizeDoctorForPatient(
  patientId: string,
  req?: Request
): Promise<{ doctorId: string; role: "doctor" | "secretary"; actorId: string } | NextResponse> {
  // Unified: NextAuth cookie first, then Bearer JWT (mobile / non-browser).
  const user = await requireAuth(req as NextRequest | undefined);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (user.role !== "doctor" && user.role !== "secretary") {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }
  const doctorId =
    user.role === "doctor" ? user.id : (user as { doctorId: string }).doctorId;
  if (!doctorId) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }
  const [link] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(eq(appointments.patientId, patientId), eq(appointments.doctorId, doctorId))
    )
    .limit(1);
  if (!link) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }
  return { doctorId, role: user.role, actorId: user.id };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authz = await authorizeDoctorForPatient(id, _req as unknown as NextRequest);
  if (authz instanceof NextResponse) return authz;

  const [patient] = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      bloodType: patients.bloodType,
      cnamNumber: patients.cnamNumber,
      cnssNumber: patients.cnssNumber,
      cnamRegime: patients.cnamRegime,
      cin: patients.cin,
      insuranceProvider: patients.insuranceProvider,
      insuranceNumber: patients.insuranceNumber,
      emergencyContactName: patients.emergencyContactName,
      emergencyContactPhone: patients.emergencyContactPhone,
      emergencyContactRelation: patients.emergencyContactRelation,
      heightCm: patients.heightCm,
      weightKg: patients.weightKg,
      occupation: patients.occupation,
      maritalStatus: patients.maritalStatus,
      preferredLanguage: patients.preferredLanguage,
      referringDoctorId: patients.referringDoctorId,
      nationality: patients.nationality,
      addressStreet: patients.addressStreet,
      addressCity: patients.addressCity,
      addressPostalCode: patients.addressPostalCode,
      professionNotes: patients.professionNotes,
      noShowCount: patients.noShowCount,
      lastMinuteCancelCount: patients.lastMinuteCancelCount,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  const history = await db
    .select({
      id: appointments.id,
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
        eq(appointments.patientId, id),
        eq(appointments.doctorId, authz.doctorId)
      )
    )
    .orderBy(desc(appointments.startsAt));

  const [medical] = await db
    .select()
    .from(patientMedicalProfile)
    .where(eq(patientMedicalProfile.patientId, id))
    .limit(1);

  // Strip doctor-only fields when the caller is a secretary
  let safeMedical = medical ?? null;
  let viewerPermissions: Record<string, boolean> | null = null;
  if (safeMedical && authz.role === "secretary") {
    const { privateDoctorNotes, ...rest } = safeMedical as typeof medical & {
      privateDoctorNotes?: string | null;
    };
    safeMedical = rest as typeof medical;
  }
  if (authz.role === "secretary") {
    const [row] = await db
      .select({ permissions: secretaries.permissions })
      .from(secretaries)
      .where(eq(secretaries.id, authz.actorId))
      .limit(1);
    viewerPermissions = parsePermissions(row?.permissions) as unknown as Record<string, boolean>;
  }

  return NextResponse.json({
    patient,
    appointments: history,
    medical: safeMedical,
    viewerRole: authz.role,
    viewerPermissions,
  });
}

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    phone: z.string().trim().min(6).max(30).optional(),
    email: z.string().trim().email().max(255).optional().nullable(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    gender: z.enum(["M", "F"]).optional().nullable(),
    bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional().nullable(),
    cnamNumber: z.string().trim().max(30).optional().nullable(),
    cnssNumber: z.string().trim().max(30).optional().nullable(),
    cnamRegime: z
      .enum(["cnss", "cnrps", "convention_etudiant", "convention_alaaliyah", "none"])
      .optional()
      .nullable(),
    cin: z.string().trim().max(20).optional().nullable(),
    insuranceProvider: z.string().trim().max(50).optional().nullable(),
    insuranceNumber: z.string().trim().max(30).optional().nullable(),
    emergencyContactName: z.string().trim().max(120).optional().nullable(),
    emergencyContactPhone: z.string().trim().max(30).optional().nullable(),
    emergencyContactRelation: z.string().trim().max(30).optional().nullable(),
    heightCm: z.number().int().min(30).max(260).optional().nullable(),
    weightKg: z.number().min(1).max(400).optional().nullable(),
    occupation: z.string().trim().max(100).optional().nullable(),
    maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional().nullable(),
    preferredLanguage: z.enum(["fr", "ar", "en"]).optional().nullable(),
    nationality: z.string().trim().max(40).optional().nullable(),
    addressStreet: z.string().trim().max(200).optional().nullable(),
    addressCity: z.string().trim().max(80).optional().nullable(),
    addressPostalCode: z.string().trim().max(10).optional().nullable(),
    professionNotes: z.string().max(2000).optional().nullable(),
    medical: z
      .object({
        allergies: z.string().max(2000).optional().nullable(),
        chronicConditions: z.string().max(2000).optional().nullable(),
        currentMeds: z.string().max(2000).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
        lifestyle: z.record(z.string(), z.unknown()).optional().nullable(),
        familyHistory: z.record(z.string(), z.unknown()).optional().nullable(),
        pastSurgeries: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
        pastHospitalizations: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
        vaccinations: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
        womensHealth: z.record(z.string(), z.unknown()).optional().nullable(),
      })
      .optional(),
  })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authz = await authorizeDoctorForPatient(id, req as unknown as NextRequest);
  if (authz instanceof NextResponse) return authz;
  if (authz.role === "secretary") {
    const canEdit = await secretaryCan(authz.actorId, "patientsEdit");
    if (!canEdit) {
      return NextResponse.json(
        { error: "Permission refusée : édition patients" },
        { status: 403 }
      );
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { medical, ...patientFields } = parsed.data;

  const patientUpdate: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patientFields)) {
    if (value !== undefined) patientUpdate[key] = value;
  }

  if (Object.keys(patientUpdate).length > 0) {
    if ("phone" in patientUpdate && typeof patientUpdate.phone === "string") {
      patientUpdate.phone = patientUpdate.phone.replace(/\s+/g, "").trim();
    }
    if ("email" in patientUpdate && typeof patientUpdate.email === "string") {
      patientUpdate.email = (patientUpdate.email as string).toLowerCase();
    }
    await db.update(patients).set(patientUpdate).where(eq(patients.id, id));
  }

  if (medical) {
    const medicalPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(medical)) {
      if (value !== undefined) medicalPayload[key] = value;
    }
    if (Object.keys(medicalPayload).length > 0) {
      const [existing] = await db
        .select({ patientId: patientMedicalProfile.patientId })
        .from(patientMedicalProfile)
        .where(eq(patientMedicalProfile.patientId, id))
        .limit(1);

      if (existing) {
        await db
          .update(patientMedicalProfile)
          .set({ ...medicalPayload, updatedAt: new Date() })
          .where(eq(patientMedicalProfile.patientId, id));
      } else {
        await db.insert(patientMedicalProfile).values({
          patientId: id,
          ...medicalPayload,
        });
      }
    }
  }

  const [updated] = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      bloodType: patients.bloodType,
      cnamNumber: patients.cnamNumber,
      noShowCount: patients.noShowCount,
      lastMinuteCancelCount: patients.lastMinuteCancelCount,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);

  return NextResponse.json({ patient: updated });
}

// ─── DELETE /api/patients/[id] ────────────────────────────────────────────────
// Removes the patient from THIS doctor's list by unlinking their appointments.
// Past appointments are kept as audit/billing records (status → "archived" via null doctor is not valid, so we hard-delete future + cancel past? no —
// medical regulations require keeping history). Strategy:
//   • Delete future appointments (status pending/confirmed with startsAt > now)
//   • Mark past appointments as "archived" (status=cancelled with suspensionReason)
//   • Keep the patient row (they may see other doctors)
//
// Pragmatic choice for v1: only remove FUTURE appointments; keep historical ones.
// If the patient has no remaining appointments with any doctor AND no history
// notes, we also clean up their medical profile row.

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authz = await authorizeDoctorForPatient(id, _req as unknown as NextRequest);
  if (authz instanceof NextResponse) return authz;
  if (authz.role === "secretary") {
    const canDel = await secretaryCan(authz.actorId, "patientsDelete");
    if (!canDel) {
      return NextResponse.json(
        { error: "Permission refusée : suppression patients" },
        { status: 403 }
      );
    }
  }

  const now = new Date();

  const futureDeleted = await db.execute(sql`
    DELETE FROM appointments
    WHERE patient_id = ${id}
      AND doctor_id = ${authz.doctorId}
      AND starts_at > ${now.toISOString()}
      AND status IN ('pending', 'confirmed')
    RETURNING id
  `);

  return NextResponse.json({
    ok: true,
    removedFutureAppointments: (futureDeleted as unknown as unknown[]).length ?? 0,
    message:
      "Les rendez-vous futurs ont été supprimés. L'historique médical est conservé pour la traçabilité.",
  });
}
