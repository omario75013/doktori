import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { uploadToR2 } from "@/lib/r2";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [existing] = await db
    .select({ photoUrl: doctors.photoUrl })
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 5 Mo)" },
      { status: 400 }
    );
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé (jpeg, png, webp uniquement)" },
      { status: 400 }
    );
  }

  try {
    const key = `doctors/photos/${id}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const photoUrl = await uploadToR2(buffer, key, file.type);

    await db
      .update(doctors)
      .set({ photoUrl, updatedAt: new Date() })
      .where(eq(doctors.id, id));

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "doctors.photo_upload",
      resourceType: "doctors",
      resourceId: id,
      before: { photoUrl: existing.photoUrl },
      after: { photoUrl },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true, photoUrl });
  } catch (e) {
    console.error("[r2] admin photo upload failed:", e);
    return NextResponse.json({ error: "Erreur lors du téléversement" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [existing] = await db
    .select({ photoUrl: doctors.photoUrl })
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  await db
    .update(doctors)
    .set({ photoUrl: null, updatedAt: new Date() })
    .where(eq(doctors.id, id));

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "doctors.photo_remove",
    resourceType: "doctors",
    resourceId: id,
    before: { photoUrl: existing.photoUrl },
    after: { photoUrl: null },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
