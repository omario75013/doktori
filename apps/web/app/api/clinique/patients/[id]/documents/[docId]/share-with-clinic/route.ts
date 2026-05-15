import { NextRequest, NextResponse } from "next/server";
import {
  db,
  patientDocuments,
  appointments,
  clinicDoctors,
  doctorPractices,
  clinics,
} from "@doktori/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { assertPatientBelongsToClinic } from "@/lib/clinic-membership";
import { logClinicAudit } from "@/lib/audit";

/**
 * POST /api/clinique/patients/[id]/documents/[docId]/share-with-clinic
 * Body: { targetClinicId: string; share: boolean }
 *
 * Adds or removes targetClinicId from patient_documents.shared_with_clinic_ids.
 * Guards:
 *   - Requesting clinic must own the document (uploaded by one of its doctors).
 *   - Target clinic must have at least one appointment with this patient.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const { id: patientId, docId } = await params;

  try {
    await assertPatientBelongsToClinic(patientId, clinic.id);
  } catch {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  let body: { targetClinicId?: unknown; share?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { targetClinicId, share } = body;
  if (typeof targetClinicId !== "string" || !targetClinicId) {
    return NextResponse.json({ error: "targetClinicId requis" }, { status: 400 });
  }
  if (typeof share !== "boolean") {
    return NextResponse.json({ error: "share (boolean) requis" }, { status: 400 });
  }

  // Fetch the document.
  const [doc] = await db
    .select({
      id: patientDocuments.id,
      uploadedByDoctorId: patientDocuments.uploadedByDoctorId,
      sharedWithClinicIds: patientDocuments.sharedWithClinicIds,
    })
    .from(patientDocuments)
    .where(
      and(eq(patientDocuments.id, docId), eq(patientDocuments.patientId, patientId))
    )
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  // Verify ownership: the document's uploading doctor must belong to the requesting clinic.
  if (!doc.uploadedByDoctorId) {
    return NextResponse.json(
      { error: "Ce document n'est pas gérable par cette clinique" },
      { status: 403 }
    );
  }

  const [ownership] = await db
    .select({ id: clinicDoctors.id })
    .from(clinicDoctors)
    .where(
      and(
        eq(clinicDoctors.clinicId, clinic.id),
        eq(clinicDoctors.doctorId, doc.uploadedByDoctorId)
      )
    )
    .limit(1);

  if (!ownership) {
    return NextResponse.json(
      { error: "Ce document n'appartient pas à votre clinique" },
      { status: 403 }
    );
  }

  // Verify target clinic has at least one appointment with this patient.
  const targetPracticeRows = await db
    .select({ id: doctorPractices.id })
    .from(doctorPractices)
    .where(eq(doctorPractices.clinicId, targetClinicId));
  const targetPracticeIds = targetPracticeRows.map((r) => r.id);

  if (targetPracticeIds.length === 0) {
    return NextResponse.json(
      { error: "La clinique cible n'a pas de pratiques connues" },
      { status: 400 }
    );
  }

  const [targetAppt] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        inArray(appointments.practiceId, targetPracticeIds)
      )
    )
    .limit(1);

  if (!targetAppt) {
    return NextResponse.json(
      { error: "La clinique cible n'a pas de rendez-vous avec ce patient" },
      { status: 400 }
    );
  }

  // Update shared_with_clinic_ids using array_append / array_remove.
  if (share) {
    await db.execute(sql`
      UPDATE patient_documents
      SET shared_with_clinic_ids = array_append(
        array_remove(shared_with_clinic_ids, ${targetClinicId}::uuid),
        ${targetClinicId}::uuid
      )
      WHERE id = ${docId}
    `);
  } else {
    await db.execute(sql`
      UPDATE patient_documents
      SET shared_with_clinic_ids = array_remove(shared_with_clinic_ids, ${targetClinicId}::uuid)
      WHERE id = ${docId}
    `);
  }

  // Audit.
  await logClinicAudit({
    clinicId: clinic.id,
    actorType: "clinic",
    actorId: clinic.id,
    action: "doc_share_inter_clinic",
    targetType: "patient_document",
    targetId: docId,
    metadata: { patientId, targetClinicId, share },
  });

  return NextResponse.json({ ok: true });
}
