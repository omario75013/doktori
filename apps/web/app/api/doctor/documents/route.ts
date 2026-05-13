import { NextRequest, NextResponse } from "next/server";
import { db, doctors, doctorDocuments } from "@doktori/db";
import { requireDoctor } from "@/lib/doctor-auth";
import { uploadToR2 } from "@/lib/r2";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_DOCUMENT_TYPES = new Set([
  "diplome",
  "carte_cnom",
  "cin",
  "autre",
]);

export async function GET(_req: NextRequest) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  const docs = await db
    .select()
    .from(doctorDocuments)
    .where(eq(doctorDocuments.doctorId, doctor.id))
    .orderBy(doctorDocuments.uploadedAt);

  const [statusRow] = await db
    .select({
      verificationStatus: doctors.verificationStatus,
      verificationNote: doctors.verificationNote,
    })
    .from(doctors)
    .where(eq(doctors.id, doctor.id))
    .limit(1);

  return NextResponse.json({
    documents: docs,
    verificationStatus: statusRow?.verificationStatus ?? "pending",
    verificationNote: statusRow?.verificationNote ?? null,
  });
}

export async function POST(req: NextRequest) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide (multipart/form-data attendu)" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const docType = formData.get("type");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (typeof docType !== "string" || !ALLOWED_DOCUMENT_TYPES.has(docType)) {
    return NextResponse.json(
      { error: "Type de document invalide. Valeurs acceptées : diplome, carte_cnom, cin, autre" },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Format de fichier non supporté. Formats acceptés : PDF, JPEG, PNG" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Fichier trop volumineux. Taille maximale : 10 Mo" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const objectKey = `verification/${doctor.id}/${randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileUrl = await uploadToR2(buffer, objectKey, file.type);

  const [inserted] = await db
    .insert(doctorDocuments)
    .values({
      doctorId: doctor.id,
      type: docType,
      fileUrl,
      fileName: file.name,
    })
    .returning();

  return NextResponse.json({ document: inserted }, { status: 201 });
}

// DELETE a specific document
export async function DELETE(req: NextRequest) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("id");

  if (!documentId) {
    return NextResponse.json({ error: "Paramètre id manquant" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: doctorDocuments.id, doctorId: doctorDocuments.doctorId })
    .from(doctorDocuments)
    .where(eq(doctorDocuments.id, documentId))
    .limit(1);

  if (!existing || existing.doctorId !== doctor.id) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  await db.delete(doctorDocuments).where(eq(doctorDocuments.id, documentId));

  return NextResponse.json({ ok: true });
}

// PUT: submit for review (changes status to documents_submitted)
// Called as POST /api/doctor/documents/submit — handled separately but
// we use a query param for simplicity here.
// Actually this is its own endpoint. See /api/doctor/documents/submit/route.ts
