/**
 * Homepage visual upload — accepts an image file, stores it in R2 (or local
 * uploads/ in dev), then atomically updates the corresponding platform_settings
 * key to point at the new URL.
 *
 * POST multipart/form-data
 *   - key: enum of the 4 image setting keys (NOT testimonials — that's JSON).
 *   - file: image (webp/jpeg/png), 5 MB max.
 *
 * Returns: { url, key }.
 *
 * Reuses uploadToR2() — same helper used by /api/doctors/photo. R2 path
 * pattern: `visuals/{slug-of-key}-{timestamp}.{ext}`.
 */
import { NextResponse } from "next/server";
import { db, platformSettings } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { uploadToR2 } from "@/lib/r2";
import { invalidateSettingsCache } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Image-only keys — testimonials is JSON, edited via POST /api/admin/visuals.
const IMAGE_KEYS = new Set([
  "homepage.hero_image_url",
  "homepage.howto_step1_image_url",
  "homepage.howto_step2_image_url",
  "homepage.howto_step3_image_url",
  "sos.hero_image_url",
]);

function slugifyKey(key: string): string {
  return key.replace(/[^a-z0-9]+/gi, "-").replace(/-+/g, "-").toLowerCase();
}

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const key = formData.get("key") as string | null;
  const file = formData.get("file") as File | null;

  if (!key || !IMAGE_KEYS.has(key)) {
    return NextResponse.json(
      { error: "Clé inconnue ou non-image" },
      { status: 400 }
    );
  }
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

  let url: string;
  try {
    const storageKey = `visuals/${slugifyKey(key)}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    url = await uploadToR2(buffer, storageKey, file.type);
  } catch (e) {
    console.error("[r2] visuals upload failed:", e);
    return NextResponse.json(
      { error: "Erreur lors du téléversement" },
      { status: 500 }
    );
  }

  // Update the setting to point at the new URL. ensureRowsExist is handled by
  // GET /api/admin/visuals on first load, but be defensive: if the row is
  // missing the update is a no-op and we still return the uploaded URL so the
  // UI can surface it.
  const [before] = await db
    .select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);

  if (before) {
    await db
      .update(platformSettings)
      .set({ value: url, updatedAt: new Date() })
      .where(eq(platformSettings.key, key));
  }

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "visuals.upload",
    resourceType: "platform_settings",
    resourceId: key,
    before: { value: before?.value ?? null },
    after: { value: url },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  invalidateSettingsCache();
  return NextResponse.json({ ok: true, url, key });
}
