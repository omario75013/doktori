import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, doctorHomeVisitSettings, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [row] = await db
    .select()
    .from(doctorHomeVisitSettings)
    .where(eq(doctorHomeVisitSettings.doctorId, id))
    .limit(1);

  return NextResponse.json({ homeVisit: row ?? null });
}

export const PATCH = withAdminAudit<
  { ok: true; homeVisit: typeof doctorHomeVisitSettings.$inferSelect },
  RouteContext
>({
  action: "doctors.home_visit_update",
  resourceType: "doctors",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(doctorHomeVisitSettings)
      .where(eq(doctorHomeVisitSettings.doctorId, resourceId))
      .limit(1);
    if (!row) return null;
    return { isAvailable: row.isAvailable, radiusKm: row.radiusKm, fee: row.fee };
  },
  handler: async ({ tx, resourceId, body }) => {
    const [doctor] = await tx
      .select()
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    if (!doctor) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const b = (body ?? {}) as {
      isAvailable?: unknown;
      radiusKm?: unknown;
      fee?: unknown;
    };

    if (b.isAvailable === undefined) {
      return NextResponse.json({ error: "isAvailable requis" }, { status: 400 });
    }
    if (typeof b.isAvailable !== "boolean") {
      return NextResponse.json({ error: "isAvailable doit être un booléen" }, { status: 400 });
    }
    if (b.radiusKm !== undefined && typeof b.radiusKm !== "number") {
      return NextResponse.json({ error: "radiusKm doit être un entier" }, { status: 400 });
    }
    if (b.fee !== undefined && typeof b.fee !== "number") {
      return NextResponse.json({ error: "fee doit être un entier (en millimes)" }, { status: 400 });
    }

    const [before] = await tx
      .select()
      .from(doctorHomeVisitSettings)
      .where(eq(doctorHomeVisitSettings.doctorId, resourceId))
      .limit(1);

    const now = new Date();

    let after: typeof doctorHomeVisitSettings.$inferSelect;
    if (before) {
      const updates: Record<string, unknown> = {
        isAvailable: b.isAvailable,
        updatedAt: now,
      };
      if (b.radiusKm !== undefined) updates.radiusKm = b.radiusKm;
      if (b.fee !== undefined) updates.fee = b.fee;

      [after] = await tx
        .update(doctorHomeVisitSettings)
        .set(updates)
        .where(eq(doctorHomeVisitSettings.doctorId, resourceId))
        .returning();
    } else {
      const insertValues = {
        doctorId: resourceId,
        isAvailable: b.isAvailable,
        radiusKm: typeof b.radiusKm === "number" ? b.radiusKm : 5,
        fee: typeof b.fee === "number" ? b.fee : 0,
        updatedAt: now,
      };

      [after] = await tx
        .insert(doctorHomeVisitSettings)
        .values(insertValues)
        .returning();
    }

    return { ok: true, homeVisit: after } as const;
  },
});
