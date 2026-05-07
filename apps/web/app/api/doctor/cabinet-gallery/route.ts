/**
 * Doctor-level cabinet gallery — self-upload by the authenticated doctor.
 *
 * Distinct from the per-practice photos endpoint
 * (`/api/medecin/cabinets/[practiceId]/photos`): this gallery lives on
 * `doctors.cabinetGalleryUrls` (jsonb string[]) and is rendered on the public
 * profile under the "Le cabinet" section. Capped at 6 photos total.
 *
 * POST   multipart/form-data { file } → uploads one image, appends URL
 * DELETE ?index=<n>                     → removes the photo at index N
 *
 * R2 key pattern: `cabinets/{doctorId}/{timestamp}-{rand}.{ext}`
 *
 * On success, `invalidateDoctor` is called so the public page picks up the
 * change immediately.
 */
import { NextResponse, NextRequest } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";
import { invalidateDoctor } from "@/lib/cache";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PHOTOS = 6;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function getAuthedDoctor() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "doctor") return null;
  const [doctor] = await db
    .select({
      id: doctors.id,
      slug: doctors.slug,
      cabinetGalleryUrls: doctors.cabinetGalleryUrls,
    })
    .from(doctors)
    .where(eq(doctors.id, session.user.id))
    .limit(1);
  return doctor ?? null;
}

export async function POST(req: NextRequest) {
  const doctor = await getAuthedDoctor();
  if (!doctor) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const current = doctor.cabinetGalleryUrls ?? [];
  if (current.length >= MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Limite de ${MAX_PHOTOS} photos atteinte` },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
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

  let url: string;
  try {
    const objectKey = `cabinets/${doctor.id}/${Date.now()}-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    url = await uploadToR2(buffer, objectKey, file.type);
  } catch (e) {
    console.error("[r2] doctor cabinet gallery upload failed:", e);
    return NextResponse.json(
      { error: "Erreur lors du téléversement" },
      { status: 500 }
    );
  }

  const next = [...current, url];
  await db
    .update(doctors)
    .set({ cabinetGalleryUrls: next, updatedAt: new Date() })
    .where(eq(doctors.id, doctor.id));

  await invalidateDoctor(doctor.id, doctor.slug);

  return NextResponse.json({ ok: true, url, urls: next }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const doctor = await getAuthedDoctor();
  if (!doctor) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const indexStr = searchParams.get("index");
  const index = indexStr !== null ? Number.parseInt(indexStr, 10) : Number.NaN;

  const current = doctor.cabinetGalleryUrls ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= current.length) {
    return NextResponse.json({ error: "Index invalide" }, { status: 400 });
  }

  const removed = current[index];
  const next = current.filter((_, i) => i !== index);

  await db
    .update(doctors)
    .set({ cabinetGalleryUrls: next, updatedAt: new Date() })
    .where(eq(doctors.id, doctor.id));

  // Best-effort R2 delete (don't fail the request if it errors)
  if (removed) {
    try {
      const r2PublicUrl = process.env.R2_PUBLIC_URL ?? "";
      let r2Key: string | null = null;
      if (r2PublicUrl && removed.startsWith(r2PublicUrl)) {
        r2Key = removed.slice(r2PublicUrl.length).replace(/^\//, "");
      } else if (removed.startsWith("/uploads/doktori/")) {
        r2Key = "doktori/" + removed.slice("/uploads/doktori/".length);
      }
      if (r2Key) await deleteFromR2(r2Key);
    } catch (e) {
      console.error("[r2] doctor cabinet gallery delete failed:", e);
    }
  }

  await invalidateDoctor(doctor.id, doctor.slug);

  return NextResponse.json({ ok: true, urls: next });
}
