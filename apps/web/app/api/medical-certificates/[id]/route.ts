import { NextResponse, type NextRequest } from "next/server";
import { db, medicalCertificates, doctors, patients } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { renderPrescriptionContent } from "@/lib/prescription-render";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [result] = await db
    .select({
      id: medicalCertificates.id,
      title: medicalCertificates.title,
      content: medicalCertificates.content,
      createdAt: medicalCertificates.createdAt,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorPhone: doctors.phone,
      doctorAddress: doctors.address,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(medicalCertificates)
    .innerJoin(doctors, eq(medicalCertificates.doctorId, doctors.id))
    .innerJoin(patients, eq(medicalCertificates.patientId, patients.id))
    .where(eq(medicalCertificates.id, id))
    .limit(1);

  if (!result) return NextResponse.json({ error: "Certificat introuvable" }, { status: 404 });
  return NextResponse.json(result);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  let body: { content?: unknown; title?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }
  const content = body.content;
  const title = body.title;
  if (typeof content !== "string" || content.length < 3 || content.length > 8000) {
    return NextResponse.json(
      { error: "Contenu invalide (3-8000 caractères)" },
      { status: 400 },
    );
  }
  if (title !== undefined && (typeof title !== "string" || title.length < 3 || title.length > 160)) {
    return NextResponse.json(
      { error: "Titre invalide (3-160 caractères)" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({
      id: medicalCertificates.id,
      doctorId: medicalCertificates.doctorId,
      patientId: medicalCertificates.patientId,
      appointmentId: medicalCertificates.appointmentId,
    })
    .from(medicalCertificates)
    .where(and(eq(medicalCertificates.id, id), eq(medicalCertificates.doctorId, user.id)))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Certificat introuvable" }, { status: 404 });
  }

  const resolved = await renderPrescriptionContent(
    content,
    existing.doctorId,
    existing.patientId,
    existing.appointmentId,
  );

  const [updated] = await db
    .update(medicalCertificates)
    .set({
      content: resolved,
      ...(typeof title === "string" ? { title: title.trim() } : {}),
    })
    .where(eq(medicalCertificates.id, id))
    .returning();

  return NextResponse.json(updated);
}

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
    .delete(medicalCertificates)
    .where(and(eq(medicalCertificates.id, id), eq(medicalCertificates.doctorId, user.id)))
    .returning({ id: medicalCertificates.id });

  if (!deleted) {
    return NextResponse.json({ error: "Certificat introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
