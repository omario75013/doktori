import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, secretaries } from "@doktori/db";
import { eq } from "drizzle-orm";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "secretary") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Type de fichier invalide" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image > 5 Mo" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1] ?? "jpg";
  const key = `secretaries/${session.user.id}-${Date.now()}.${ext}`;
  const url = await uploadToR2(buf, key, file.type);

  await db
    .update(secretaries)
    .set({ photoUrl: url })
    .where(eq(secretaries.id, session.user.id));

  return NextResponse.json({ ok: true, photoUrl: url });
}
