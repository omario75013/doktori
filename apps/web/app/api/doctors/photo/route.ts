import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";
import { invalidateDoctor } from "@/lib/cache";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * POST /api/doctors/photo
 *
 * Doctor self-photo upload. Stores in Cloudflare R2.
 */
export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session?.user?.id || role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const doctorId = formData.get("doctorId") as string | null;
  const file = formData.get("file") as File | null;

  if (!doctorId) {
    return NextResponse.json({ error: "doctorId requis" }, { status: 400 });
  }

  if (doctorId !== session.user.id) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  if (!file) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé (jpeg, png, webp uniquement)" },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ id: doctors.id, slug: doctors.slug })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  try {
    const key = `doctors/photos/${doctorId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const photoUrl = await uploadToR2(buffer, key, file.type);

    await db
      .update(doctors)
      .set({ photoUrl, updatedAt: new Date() })
      .where(eq(doctors.id, doctorId));

    await invalidateDoctor(doctorId, existing.slug);

    return NextResponse.json({ ok: true, photoUrl });
  } catch (e) {
    console.error("[r2] photo upload failed:", e);
    return NextResponse.json({ error: "Erreur lors du téléversement" }, { status: 500 });
  }
}
