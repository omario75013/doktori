import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db, patientDocuments, patientAttachments } from "@doktori/db";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";
import { uploadToR2 } from "@/lib/r2";

// Doctor-facing documents API, scoped to one patient via ?patientId=…
//
// GET  → list documents the doctor can see for that patient:
//         (a) doctor-created docs uploaded by *this* doctor for the patient,
//         (b) patient uploads where this doctor is in shared_with_doctor_ids.
// POST → doctor creates a document in the patient fiche (uploaded_by='doctor').
//        Auto-shared with this doctor; patient sees it read-only with badge.

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_BYTES = 15 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId requis" }, { status: 400 });
  }

  // (a) Doctor-created docs in patient_documents (and any legacy patient-
  //     uploaded copies that still live there).
  const docRows = await db
    .select()
    .from(patientDocuments)
    .where(
      and(
        eq(patientDocuments.patientId, patientId),
        or(
          eq(patientDocuments.uploadedByDoctorId, doctor.id),
          sql`${doctor.id} = ANY(${patientDocuments.sharedWithDoctorIds})`,
        ),
      ),
    )
    .orderBy(desc(patientDocuments.createdAt));

  // (b) Patient attachments shared with this doctor — sharing now lives on
  //     the attachment row itself so the patient keeps ownership.
  const attRows = await db
    .select()
    .from(patientAttachments)
    .where(
      and(
        eq(patientAttachments.patientId, patientId),
        isNull(patientAttachments.deletedAt),
        sql`${doctor.id} = ANY(${patientAttachments.sharedWithDoctorIds})`,
      ),
    )
    .orderBy(desc(patientAttachments.uploadedAt));

  // Normalize attachment rows into the same shape the fiche tab expects.
  const fromAttachments = attRows.map((a) => ({
    id: `att-${a.id}`,
    uploadedBy: "patient" as const,
    uploadedByDoctorId: null,
    sharedWithDoctorIds: a.sharedWithDoctorIds,
    fileUrl: a.fileUrl,
    fileName: a.filename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    category: a.category,
    title: a.title,
    note: a.description,
    createdAt: a.uploadedAt,
  }));

  // Dedupe by fileUrl in case both sources point at the same file
  // (legacy share-attachment may have minted a patient_documents copy).
  const seen = new Set<string>();
  const items: unknown[] = [];
  for (const d of docRows) {
    if (d.fileUrl && seen.has(d.fileUrl)) continue;
    if (d.fileUrl) seen.add(d.fileUrl);
    items.push(d);
  }
  for (const d of fromAttachments) {
    if (d.fileUrl && seen.has(d.fileUrl)) continue;
    if (d.fileUrl) seen.add(d.fileUrl);
    items.push(d);
  }

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const form = await req.formData();
  const patientId = form.get("patientId");
  if (typeof patientId !== "string" || !patientId) {
    return NextResponse.json({ error: "patientId requis" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 15 Mo)" }, { status: 400 });
  }

  const category = (form.get("category") as string) || null;
  const title = (form.get("title") as string) || null;
  const note = (form.get("note") as string) || null;

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 8);
  const key = `patient-docs/${patientId}/${randomUUID()}.${ext}`;
  const fileUrl = await uploadToR2(buf, key, file.type);

  const [row] = await db
    .insert(patientDocuments)
    .values({
      patientId,
      uploadedBy: "doctor",
      uploadedByDoctorId: doctor.id,
      sharedWithDoctorIds: [doctor.id],
      fileUrl,
      fileName: file.name.slice(0, 255),
      mimeType: file.type,
      sizeBytes: file.size,
      category,
      title,
      note,
    })
    .returning();

  return NextResponse.json({ item: row }, { status: 201 });
}
