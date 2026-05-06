import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { invalidateDoctor } from "@/lib/cache";

const ALLOWED_FIELDS = [
  "name",
  "email",
  "phone",
  "specialty",
  "city",
  "address",
  "bio",
  "consultationFee",
  "yearsOfExperience",
  "photoUrl",
  "isActive",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [row] = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }
  return NextResponse.json({ doctor: row });
}

export const PATCH = withAdminAudit<
  { ok: true; doctor: typeof doctors.$inferSelect },
  RouteContext
>({
  resourceType: "doctors",
  action: ({ body }) => {
    const b = body as Record<string, unknown> | null;
    if (b && "isActive" in b && Object.keys(b).length === 1) {
      return b.isActive ? "doctors.activate" : "doctors.deactivate";
    }
    return "doctors.update";
  },
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(doctors).where(eq(doctors.id, resourceId)).limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as Record<string, unknown>;

    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in b) updates[field] = b[field as AllowedField];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    const [before] = await tx
      .select()
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    if (!before) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    updates.updatedAt = new Date();
    const [after] = await tx
      .update(doctors)
      .set(updates)
      .where(eq(doctors.id, resourceId))
      .returning();

    // Invalidate caches for both old + new slug (if slug changed)
    const slugsToInvalidate = new Set<string>();
    if (before.slug) slugsToInvalidate.add(before.slug);
    if (after?.slug) slugsToInvalidate.add(after.slug);
    for (const slug of slugsToInvalidate) {
      await invalidateDoctor(resourceId, slug);
    }

    return { ok: true, doctor: after } as const;
  },
});

export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "doctors.delete",
  resourceType: "doctors",
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(doctors).where(eq(doctors.id, resourceId)).limit(1);
    if (!row) return null;
    return {
      name: row.name,
      email: row.email,
      specialty: row.specialty,
      city: row.city,
      isActive: row.isActive,
    };
  },
  handler: async ({ tx, resourceId }) => {
    const [exists] = await tx
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    if (!exists) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }
    await tx.delete(doctors).where(eq(doctors.id, resourceId));
    return { ok: true } as const;
  },
});
