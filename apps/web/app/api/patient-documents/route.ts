import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db, patientDocuments, doctors, labs } from "@doktori/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requirePatientAuth } from "@/lib/patient-auth";
import { uploadToR2 } from "@/lib/r2";

// Patient documents API (patient-side).
//
// GET  → list every document for the authenticated patient, with
//        uploader info so the UI can render the "Créé par Dr X" badge.
// POST → upload a file (multipart/form-data). Optional `doctorIds[]`
//        controls which doctors the patient shares it with.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function GET(req: NextRequest) {
  const patient = requirePatientAuth(req);
  if (patient instanceof NextResponse) return patient;

  const rows = await db
    .select({
      id: patientDocuments.id,
      uploadedBy: patientDocuments.uploadedBy,
      uploadedByDoctorId: patientDocuments.uploadedByDoctorId,
      uploadedByLabId: patientDocuments.uploadedByLabId,
      sharedWithDoctorIds: patientDocuments.sharedWithDoctorIds,
      fileUrl: patientDocuments.fileUrl,
      fileName: patientDocuments.fileName,
      mimeType: patientDocuments.mimeType,
      sizeBytes: patientDocuments.sizeBytes,
      category: patientDocuments.category,
      title: patientDocuments.title,
      note: patientDocuments.note,
      createdAt: patientDocuments.createdAt,
      doctorName: doctors.name,
      labName: labs.name,
    })
    .from(patientDocuments)
    .leftJoin(doctors, eq(doctors.id, patientDocuments.uploadedByDoctorId))
    .leftJoin(labs, eq(labs.id, patientDocuments.uploadedByLabId))
    .where(eq(patientDocuments.patientId, patient.id))
    .orderBy(desc(patientDocuments.createdAt));

  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const patient = requirePatientAuth(req);
  if (patient instanceof NextResponse) return patient;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté (PDF, JPG, PNG, WebP)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 15 Mo)" }, { status: 400 });
  }

  // doctorIds is sent either as repeated form fields ("doctorIds") or a
  // single JSON array string. Accept both — the patient picker uses repeated.
  let doctorIds: string[] = [];
  const repeated = form.getAll("doctorIds").filter((v) => typeof v === "string") as string[];
  if (repeated.length > 0) {
    doctorIds = repeated;
  } else {
    const raw = form.get("doctorIds");
    if (typeof raw === "string" && raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) doctorIds = parsed.filter((v) => typeof v === "string");
      } catch {}
    }
  }

  const category = (form.get("category") as string) || null;
  const title = (form.get("title") as string) || null;
  const note = (form.get("note") as string) || null;

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 8);
  const key = `patient-docs/${patient.id}/${randomUUID()}.${ext}`;
  const fileUrl = await uploadToR2(buf, key, file.type);

  const [row] = await db
    .insert(patientDocuments)
    .values({
      patientId: patient.id,
      uploadedBy: "patient",
      uploadedByDoctorId: null,
      sharedWithDoctorIds: doctorIds,
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
