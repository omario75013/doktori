import { NextRequest, NextResponse } from "next/server";
import { db, patients } from "@doktori/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { getPatientFromRequest } from "@/lib/patient-auth";

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function extFromType(t: string): string {
  if (t === "application/pdf") return "pdf";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  return "jpg";
}

function keyFromPublicUrl(url: string): string | null {
  const prefix = process.env.R2_PUBLIC_URL || "";
  if (prefix && url.startsWith(prefix + "/")) return url.slice(prefix.length + 1);
  if (url.startsWith("/uploads/doktori/")) return "doktori/" + url.slice("/uploads/doktori/".length);
  return null;
}

function parseType(req: NextRequest): "cnam" | "mutuelle" | null {
  const t = new URL(req.url).searchParams.get("type");
  if (t === "cnam" || t === "mutuelle") return t;
  return null;
}

const COLUMN = {
  cnam: "cnamCardUrl" as const,
  mutuelle: "insuranceCardUrl" as const,
};

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const type = parseType(req);
  if (!type) return NextResponse.json({ error: "type=cnam|mutuelle requis" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Type non supporté (jpeg/png/webp/pdf)" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier > 10 Mo" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = extFromType(file.type);
  const key = `patient-insurance/${patient.id}/${type}-${randomUUID()}.${ext}`;
  const url = await uploadToR2(buf, key, file.type);

  // Replace previous file (best-effort cleanup)
  const col = COLUMN[type];
  const [existing] = await db
    .select({ url: patients[col] })
    .from(patients)
    .where(eq(patients.id, patient.id))
    .limit(1);

  if (existing?.url) {
    const oldKey = keyFromPublicUrl(existing.url);
    if (oldKey) deleteFromR2(oldKey).catch(() => {});
  }

  await db
    .update(patients)
    .set({ [col]: url } as Record<string, string>)
    .where(eq(patients.id, patient.id));

  return NextResponse.json({ ok: true, url, type });
}

export async function DELETE(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const type = parseType(req);
  if (!type) return NextResponse.json({ error: "type=cnam|mutuelle requis" }, { status: 400 });

  const col = COLUMN[type];
  const [existing] = await db
    .select({ url: patients[col] })
    .from(patients)
    .where(eq(patients.id, patient.id))
    .limit(1);

  if (existing?.url) {
    const oldKey = keyFromPublicUrl(existing.url);
    if (oldKey) deleteFromR2(oldKey).catch(() => {});
  }

  await db
    .update(patients)
    .set({ [col]: null } as Record<string, null>)
    .where(eq(patients.id, patient.id));

  return NextResponse.json({ ok: true });
}
