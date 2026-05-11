import { NextRequest, NextResponse } from "next/server";
import { db, patientDocuments } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requirePatientAuth } from "@/lib/patient-auth";

// PATCH — patient updates the list of doctors a document is shared with.
// Only allowed on rows the patient owns (uploadedBy='patient'); doctor-created
// docs cannot have their sharing changed from the patient surface.
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const patient = requirePatientAuth(req);
  if (patient instanceof NextResponse) return patient;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const raw = (body as { doctorIds?: unknown })?.doctorIds;
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "doctorIds[] requis" }, { status: 400 });
  }
  const doctorIds = Array.from(new Set(raw as string[]));

  const [updated] = await db
    .update(patientDocuments)
    .set({ sharedWithDoctorIds: doctorIds })
    .where(
      and(
        eq(patientDocuments.id, id),
        eq(patientDocuments.patientId, patient.id),
        eq(patientDocuments.uploadedBy, "patient"),
      ),
    )
    .returning({
      id: patientDocuments.id,
      sharedWithDoctorIds: patientDocuments.sharedWithDoctorIds,
    });

  if (!updated) {
    return NextResponse.json(
      { error: "Document introuvable ou non modifiable" },
      { status: 404 },
    );
  }
  return NextResponse.json({ item: updated });
}

// Patient deletes one of their own uploads. Doctor-created documents are
// read-only from the patient surface — they must be removed by the doctor
// (via `/api/doctor/patient-documents/[id]`).
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const patient = requirePatientAuth(req);
  if (patient instanceof NextResponse) return patient;
  const { id } = await ctx.params;

  const [deleted] = await db
    .delete(patientDocuments)
    .where(
      and(
        eq(patientDocuments.id, id),
        eq(patientDocuments.patientId, patient.id),
        eq(patientDocuments.uploadedBy, "patient"),
      ),
    )
    .returning({ id: patientDocuments.id });

  if (!deleted) {
    return NextResponse.json(
      { error: "Document introuvable ou non modifiable" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
