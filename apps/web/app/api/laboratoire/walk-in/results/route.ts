import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db, patientDocuments } from "@doktori/db";
import { requireAuth } from "@/lib/require-auth";
import { uploadToR2 } from "@/lib/r2";

// TODO: patient OTP confirmation

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_BYTES = 15 * 1024 * 1024;

// POST — lab uploads results for a walk-in patient (no lab_order reference).
// Body (multipart):
//   file, patientId, category?, title?, note?, doctorIdsToShare? (comma-sep or JSON array)
export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  const role = (user as { role?: string } | undefined)?.role;
  if (!user || (role !== "lab" && role !== "lab_user")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const labId = role === "lab_user"
    ? (user as { labId?: string }).labId!
    : user.id;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Corps de la requête invalide" }, { status: 400 });
  }

  const patientId = form.get("patientId");
  if (typeof patientId !== "string" || !patientId) {
    return NextResponse.json({ error: "patientId requis" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Format non supporté (PDF, JPEG, PNG, WebP)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 15 Mo)" }, { status: 400 });
  }

  const category = (form.get("category") as string | null) ?? "analyse";
  const title = (form.get("title") as string | null) ?? file.name;
  const note = (form.get("note") as string | null) ?? null;

  // Parse doctorIdsToShare — accept comma-separated string or JSON array.
  let sharedWithDoctorIds: string[] = [];
  const rawDoctorIds = form.get("doctorIdsToShare");
  if (typeof rawDoctorIds === "string" && rawDoctorIds.trim()) {
    try {
      const parsed = JSON.parse(rawDoctorIds);
      if (Array.isArray(parsed)) {
        sharedWithDoctorIds = parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      sharedWithDoctorIds = rawDoctorIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // Upload to R2.
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().slice(0, 8);
  const key = `lab-results/${labId}/${randomUUID()}.${ext}`;
  const fileUrl = await uploadToR2(buf, key, file.type);

  const [doc] = await db
    .insert(patientDocuments)
    .values({
      patientId,
      uploadedBy: "lab",
      uploadedByLabId: labId,
      labOrderId: null,
      sharedWithDoctorIds,
      fileUrl,
      fileName: file.name.slice(0, 255),
      mimeType: file.type,
      sizeBytes: file.size,
      category,
      title: title.slice(0, 255),
      note,
    })
    .returning();

  return NextResponse.json({ ok: true, document: doc }, { status: 201 });
}
