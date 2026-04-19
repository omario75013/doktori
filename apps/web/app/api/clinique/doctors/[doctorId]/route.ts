import { NextResponse } from "next/server";
import { db, clinicDoctors } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const clinic = await requireClinic();
    if (clinic instanceof NextResponse) return clinic;

    const { doctorId } = await params;

    const result = await db
      .delete(clinicDoctors)
      .where(
        and(
          eq(clinicDoctors.clinicId, clinic.id),
          eq(clinicDoctors.doctorId, doctorId)
        )
      );

    if (!result) {
      return NextResponse.json({ error: "Association introuvable" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api//clinique/doctors/[doctorId]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
