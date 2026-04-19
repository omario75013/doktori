import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, featureFlags } from "@doktori/db";
import { eq, sql } from "drizzle-orm";

// PATCH /api/admin/system/flags/[key] — toggle or update a feature flag
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { key } = await params;

    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Flag introuvable" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Partial<typeof featureFlags.$inferInsert> = {};

    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    if (body.description !== undefined) updates.description = body.description;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune mise à jour fournie" }, { status: 400 });
    }

    const [updated] = await db
      .update(featureFlags)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(featureFlags.key, key))
      .returning();

    const { ip, userAgent } = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "update",
      resourceType: "feature_flag",
      resourceId: key,
      before: existing,
      after: updated,
      ip,
      userAgent,
    });

    return NextResponse.json({ flag: updated });
  } catch (e) {
    console.error("[PATCH /api//admin/system/flags/[key]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
