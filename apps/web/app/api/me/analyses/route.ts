import { NextRequest, NextResponse } from "next/server";
import { db, patientAnalyses } from "@doktori/db";
import { desc, eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { uploadToR2 } from "@/lib/r2";
import { randomUUID } from "node:crypto";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rows = await db
    .select()
    .from(patientAnalyses)
    .where(eq(patientAnalyses.patientId, patient.id))
    .orderBy(desc(patientAnalyses.testDate));

  return NextResponse.json({ analyses: rows });
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Form invalide" }, { status: 400 });
  }

  const title = ((form.get("title") as string | null) ?? "").trim();
  const labName = ((form.get("lab_name") as string | null) ?? "").trim();
  const testDate = ((form.get("test_date") as string | null) ?? "").trim();
  const file = form.get("file");

  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  if (title.length > 200) return NextResponse.json({ error: "Titre trop long" }, { status: 400 });
  if (testDate && !/^\d{4}-\d{2}-\d{2}$/.test(testDate)) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Type ${file.type} non supporté (PDF, JPEG, PNG uniquement)` }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const key = `patient-analyses/${patient.id}/${randomUUID()}.${ext}`;
  const url = await uploadToR2(buffer, key, file.type);

  const [row] = await db
    .insert(patientAnalyses)
    .values({
      patientId: patient.id,
      title: title.slice(0, 200),
      labName: labName ? labName.slice(0, 160) : null,
      testDate: testDate || null,
      fileUrl: url,
    })
    .returning();

  return NextResponse.json({ analysis: row }, { status: 201 });
}
