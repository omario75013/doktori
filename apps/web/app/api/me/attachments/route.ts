import { NextRequest, NextResponse } from "next/server";
import { db, patientAttachments } from "@doktori/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { uploadToR2 } from "@/lib/r2";
import { getPatientFromRequest } from "@/lib/patient-auth";

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const VALID_CATEGORIES = new Set([
  "rx", // ordonnance
  "lab", // analyse
  "xr", // radiologie
  "rep", // compte-rendu
  "ins", // carte assurance
  "autre",
]);

function extFromType(t: string): string {
  if (t === "application/pdf") return "pdf";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  return "jpg";
}

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rows = await db
    .select()
    .from(patientAttachments)
    .where(
      and(
        eq(patientAttachments.patientId, patient.id),
        isNull(patientAttachments.deletedAt),
      ),
    )
    .orderBy(desc(patientAttachments.uploadedAt));

  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Type non supporté (jpeg/png/webp/pdf)" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier > 15 Mo" }, { status: 400 });
  }

  const category = String(form?.get("category") ?? "autre");
  const finalCategory = VALID_CATEGORIES.has(category) ? category : "autre";
  const title = String(form?.get("title") ?? file.name).slice(0, 200);
  const description = (form?.get("description") as string | null)?.slice(0, 2000) || null;

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = extFromType(file.type);
  const key = `patient-documents/${patient.id}/${randomUUID()}.${ext}`;
  const url = await uploadToR2(buf, key, file.type);

  const [row] = await db
    .insert(patientAttachments)
    .values({
      patientId: patient.id,
      category: finalCategory,
      title,
      description,
      fileUrl: url,
      fileKey: key,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    })
    .returning();

  return NextResponse.json({ ok: true, item: row });
}
