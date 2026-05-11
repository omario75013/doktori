import { NextResponse, type NextRequest } from "next/server";
import { db, prescriptions, doctors, patients } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { renderPrescriptionContent } from "@/lib/prescription-render";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [result] = await db
    .select({
      id: prescriptions.id,
      content: prescriptions.content,
      createdAt: prescriptions.createdAt,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorPhone: doctors.phone,
      doctorAddress: doctors.address,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(prescriptions)
    .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .where(eq(prescriptions.id, id))
    .limit(1);

  if (!result) return NextResponse.json({ error: "Ordonnance introuvable" }, { status: 404 });
  return NextResponse.json(result);
}

// PATCH — doctor edits the content of one of their own prescriptions.
// Re-runs the {{...}} placeholder resolver so any fresh template markup
// pasted by the doctor lands in the DB already-rendered.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  let body: { content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const content = body.content;
  if (typeof content !== "string" || content.length < 3 || content.length > 5000) {
    return NextResponse.json(
      { error: "Contenu invalide (3-5000 caractères)" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({
      id: prescriptions.id,
      doctorId: prescriptions.doctorId,
      patientId: prescriptions.patientId,
      appointmentId: prescriptions.appointmentId,
    })
    .from(prescriptions)
    .where(and(eq(prescriptions.id, id), eq(prescriptions.doctorId, user.id)))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Ordonnance introuvable" }, { status: 404 });
  }

  const resolved = await renderPrescriptionContent(
    content,
    existing.doctorId,
    existing.patientId,
    existing.appointmentId,
  );

  const [updated] = await db
    .update(prescriptions)
    .set({ content: resolved })
    .where(eq(prescriptions.id, id))
    .returning();

  return NextResponse.json(updated);
}

// DELETE — doctor removes their own prescription. Patient-side links
// (mes-documents, /ordonnance/[id]) will 404 after this.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  const [deleted] = await db
    .delete(prescriptions)
    .where(and(eq(prescriptions.id, id), eq(prescriptions.doctorId, user.id)))
    .returning({ id: prescriptions.id });

  if (!deleted) {
    return NextResponse.json({ error: "Ordonnance introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
