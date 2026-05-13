import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireDoctor } from "@/lib/doctor-auth";
import { uploadToR2 } from "@/lib/r2";

// Doctor signature — uploaded as an image (PNG / JPG / WebP) up to 2 MB
// and stored on the doctors row as signature_url. Rendered on
// prescriptions and any other generated document. PNG with a
// transparent background gives the cleanest result on the printed RDV.

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_BYTES = 2 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;
  const [row] = await db
    .select({ signatureUrl: doctors.signatureUrl })
    .from(doctors)
    .where(eq(doctors.id, doctor.id))
    .limit(1);
  return NextResponse.json({ signatureUrl: row?.signatureUrl ?? null });
}

export async function POST(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté (PNG, JPG, WebP)" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image trop volumineuse (max 2 Mo)" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase().slice(0, 8);
  const key = `signatures/${doctor.id}/${randomUUID()}.${ext}`;
  const signatureUrl = await uploadToR2(buf, key, file.type);

  await db
    .update(doctors)
    .set({ signatureUrl })
    .where(eq(doctors.id, doctor.id));

  return NextResponse.json({ signatureUrl });
}

export async function DELETE(req: NextRequest) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;
  await db
    .update(doctors)
    .set({ signatureUrl: null })
    .where(eq(doctors.id, doctor.id));
  return NextResponse.json({ ok: true });
}
