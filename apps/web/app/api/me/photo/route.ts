import { NextRequest, NextResponse } from "next/server";
import { db, patients } from "@doktori/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { getPatientFromRequest } from "@/lib/patient-auth";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function extFromType(t: string): string {
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  return "jpg";
}

function keyFromPublicUrl(url: string): string | null {
  const prefix = process.env.R2_PUBLIC_URL || "";
  if (prefix && url.startsWith(prefix + "/")) return url.slice(prefix.length + 1);
  // Local dev: "/uploads/doktori/<rest>" → key "doktori/<rest>"
  if (url.startsWith("/uploads/doktori/")) return "doktori/" + url.slice("/uploads/doktori/".length);
  return null;
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
    return NextResponse.json({ error: "Type non supporté (jpeg/png/webp)" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image > 5 Mo" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = extFromType(file.type);
  const key = `patient-photos/${patient.id}/${randomUUID()}.${ext}`;
  const url = await uploadToR2(buf, key, file.type);

  // Delete previous photo (best-effort)
  const [existing] = await db
    .select({ photoUrl: patients.photoUrl })
    .from(patients)
    .where(eq(patients.id, patient.id))
    .limit(1);

  if (existing?.photoUrl) {
    const oldKey = keyFromPublicUrl(existing.photoUrl);
    if (oldKey) deleteFromR2(oldKey).catch(() => {});
  }

  await db.update(patients).set({ photoUrl: url }).where(eq(patients.id, patient.id));

  return NextResponse.json({ ok: true, photoUrl: url });
}

export async function DELETE(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [existing] = await db
    .select({ photoUrl: patients.photoUrl })
    .from(patients)
    .where(eq(patients.id, patient.id))
    .limit(1);

  if (existing?.photoUrl) {
    const oldKey = keyFromPublicUrl(existing.photoUrl);
    if (oldKey) deleteFromR2(oldKey).catch(() => {});
  }

  await db.update(patients).set({ photoUrl: null }).where(eq(patients.id, patient.id));

  return NextResponse.json({ ok: true });
}
