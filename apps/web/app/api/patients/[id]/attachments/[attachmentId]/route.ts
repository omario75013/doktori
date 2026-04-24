import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointments, patientAttachments } from "@doktori/db";
import { and, eq } from "drizzle-orm";

async function authorize(
  patientId: string
): Promise<{ doctorId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "doctor" && role !== "secretary") {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }
  const doctorId =
    role === "doctor" ? session.user.id : session.user.doctorId;
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
  return { doctorId };
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params;
  const authz = await authorize(id);
  if (authz instanceof NextResponse) return authz;

  await db
    .update(patientAttachments)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(patientAttachments.id, attachmentId),
        eq(patientAttachments.patientId, id)
      )
    );

  return NextResponse.json({ ok: true });
}
