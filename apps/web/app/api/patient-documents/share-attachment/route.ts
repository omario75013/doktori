import { NextRequest, NextResponse } from "next/server";
import { db, patientAttachments } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requirePatientAuth } from "@/lib/patient-auth";

// Update the sharing list on an existing patient attachment, in place.
//
// Sharing must never duplicate the file: the same row in `patient_attachments`
// stays the patient's source of truth (they edit/delete it normally). The
// `shared_with_doctor_ids` column controls which doctors can see the file in
// their fiche patient → Documents tab.
//
// Body: { attachmentId: string, doctorIds: string[] }
export async function POST(req: NextRequest) {
  const patient = requirePatientAuth(req);
  if (patient instanceof NextResponse) return patient;

  let body: { attachmentId?: unknown; doctorIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const attachmentId = typeof body.attachmentId === "string" ? body.attachmentId : null;
  const raw = body.doctorIds;
  if (!attachmentId) {
    return NextResponse.json({ error: "attachmentId requis" }, { status: 400 });
  }
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "doctorIds[] requis" }, { status: 400 });
  }
  const doctorIds = Array.from(new Set(raw as string[]));

  const [updated] = await db
    .update(patientAttachments)
    .set({ sharedWithDoctorIds: doctorIds })
    .where(
      and(
        eq(patientAttachments.id, attachmentId),
        eq(patientAttachments.patientId, patient.id),
      ),
    )
    .returning({
      id: patientAttachments.id,
      sharedWithDoctorIds: patientAttachments.sharedWithDoctorIds,
    });

  if (!updated) {
    return NextResponse.json({ error: "Pièce introuvable" }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}
