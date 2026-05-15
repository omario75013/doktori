import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireLabContext } from "@/lib/lab-auth";
import { uploadToR2 } from "@/lib/r2";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_BYTES = 20 * 1024 * 1024;

// POST /api/laboratoire/upload — generic file upload for messaging attachments
export async function POST(req: NextRequest) {
  const ctx = await requireLabContext();
  if (ctx instanceof NextResponse) return ctx;
  const { labId } = ctx;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().slice(0, 8);
  const key = `lab-messages/${labId}/${randomUUID()}.${ext}`;
  const url = await uploadToR2(buf, key, file.type || "application/octet-stream");

  return NextResponse.json({
    url,
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
  });
}
