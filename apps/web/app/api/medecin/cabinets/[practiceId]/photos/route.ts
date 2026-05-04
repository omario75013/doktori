import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { db, doctorPractices } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PHOTOS = 5;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type RouteContext = { params: Promise<{ practiceId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const { practiceId } = await params;

  // Verify ownership
  const [practice] = await db
    .select({ id: doctorPractices.id, doctorId: doctorPractices.doctorId, photos: doctorPractices.photos })
    .from(doctorPractices)
    .where(and(eq(doctorPractices.id, practiceId), eq(doctorPractices.doctorId, doctor.id)))
    .limit(1);

  if (!practice) {
    return NextResponse.json({ error: "Cabinet introuvable" }, { status: 404 });
  }

  if ((practice.photos ?? []).length >= MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Limite de ${MAX_PHOTOS} photos atteinte pour ce cabinet` },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide (multipart/form-data attendu)" },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
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

  // Use UUID key — never trust the original filename
  const objectKey = `cabinet-photos/${practiceId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let url: string;
  try {
    url = await uploadToR2(buffer, objectKey, file.type);
  } catch (e) {
    console.error("[r2] cabinet photo upload failed:", e);
    return NextResponse.json({ error: "Erreur lors du téléversement" }, { status: 500 });
  }

  const currentPhotos = practice.photos ?? [];
  const newPhoto = { url, alt: "Photo cabinet" };
  const updatedPhotos = [...currentPhotos, newPhoto];

  await db
    .update(doctorPractices)
    .set({ photos: updatedPhotos })
    .where(eq(doctorPractices.id, practiceId));

  return NextResponse.json({ url, photos: updatedPhotos }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const { practiceId } = await params;

  // Verify ownership
  const [practice] = await db
    .select({ id: doctorPractices.id, doctorId: doctorPractices.doctorId, photos: doctorPractices.photos })
    .from(doctorPractices)
    .where(and(eq(doctorPractices.id, practiceId), eq(doctorPractices.doctorId, doctor.id)))
    .limit(1);

  if (!practice) {
    return NextResponse.json({ error: "Cabinet introuvable" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const indexStr = searchParams.get("index");
  const index = indexStr !== null ? parseInt(indexStr, 10) : NaN;

  if (isNaN(index) || index < 0) {
    return NextResponse.json({ error: "Paramètre index invalide" }, { status: 400 });
  }

  const currentPhotos = practice.photos ?? [];

  if (index >= currentPhotos.length) {
    return NextResponse.json({ error: "Index hors limites" }, { status: 400 });
  }

  // Delete the object from R2 (graceful: log and continue if it fails)
  const photoToDelete = currentPhotos[index];
  if (photoToDelete?.url) {
    try {
      // URL format (prod):  <PUBLIC_URL>/doktori/<relative-key>
      // URL format (dev):   /uploads/doktori/<relative-key>
      const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";
      let r2Key: string | null = null;
      if (r2PublicUrl && photoToDelete.url.startsWith(r2PublicUrl)) {
        // e.g. "https://pub.r2.dev/doktori/cabinet-photos/…/uuid.jpg" → "doktori/cabinet-photos/…/uuid.jpg"
        r2Key = photoToDelete.url.slice(r2PublicUrl.length).replace(/^\//, "");
      } else if (photoToDelete.url.startsWith("/uploads/doktori/")) {
        // Local dev URL: "/uploads/doktori/cabinet-photos/…/uuid.jpg"
        r2Key = "doktori/" + photoToDelete.url.slice("/uploads/doktori/".length);
      }
      if (r2Key) {
        await deleteFromR2(r2Key);
      }
    } catch (e) {
      console.error("[r2] cabinet photo delete failed (continuing with DB removal):", e);
    }
  }

  const updatedPhotos = currentPhotos.filter((_, i) => i !== index);

  await db
    .update(doctorPractices)
    .set({ photos: updatedPhotos })
    .where(eq(doctorPractices.id, practiceId));

  return NextResponse.json({ ok: true, photos: updatedPhotos });
}
