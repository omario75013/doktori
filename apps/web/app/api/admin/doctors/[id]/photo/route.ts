import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { uploadToR2 } from "@/lib/r2";
import { invalidateDoctor } from "@/lib/cache";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<
  { ok: true; photoUrl: string },
  RouteContext
>({
  action: "doctors.photo_upload",
  resourceType: "doctors",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select({ photoUrl: doctors.photoUrl })
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    if (!row) return null;
    return { photoUrl: row.photoUrl };
  },
  handler: async ({ tx, resourceId, req }) => {
    const [existing] = await tx
      .select({ photoUrl: doctors.photoUrl, slug: doctors.slug })
      .from(doctors)
      .where(eq(doctors.id, resourceId))
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

    const key = `doctors/photos/${resourceId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const photoUrl = await uploadToR2(buffer, key, file.type);

    await tx
      .update(doctors)
      .set({ photoUrl, updatedAt: new Date() })
      .where(eq(doctors.id, resourceId));

    await invalidateDoctor(resourceId, existing.slug);

    return { ok: true, photoUrl } as const;
  },
});

export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "doctors.photo_remove",
  resourceType: "doctors",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select({ photoUrl: doctors.photoUrl })
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    if (!row) return null;
    return { photoUrl: row.photoUrl };
  },
  handler: async ({ tx, resourceId }) => {
    const [existing] = await tx
      .select({ photoUrl: doctors.photoUrl, slug: doctors.slug })
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    await tx
      .update(doctors)
      .set({ photoUrl: null, updatedAt: new Date() })
      .where(eq(doctors.id, resourceId));

    await invalidateDoctor(resourceId, existing.slug);

    return { ok: true } as const;
  },
});
