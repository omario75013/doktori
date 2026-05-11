import { NextRequest, NextResponse } from "next/server";
import { db, patientDocuments } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";

// Doctor deletes a document they created in a patient fiche.
// Patient uploads remain owned by the patient — doctor can only delete
// docs where uploaded_by_doctor_id = doctor.id.
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;
  const { id } = await ctx.params;

  const [deleted] = await db
    .delete(patientDocuments)
    .where(
      and(
        eq(patientDocuments.id, id),
        eq(patientDocuments.uploadedByDoctorId, doctor.id),
        eq(patientDocuments.uploadedBy, "doctor"),
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
