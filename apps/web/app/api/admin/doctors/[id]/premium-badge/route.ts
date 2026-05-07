import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { doctorPremium, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<
  { ok: true; premium: typeof doctorPremium.$inferSelect },
  RouteContext
>({
  action: ({ body }) => {
    const b = body as { isActive?: unknown } | null;
    return b?.isActive ? "doctors.premium_activate" : "doctors.premium_deactivate";
  },
  resourceType: "doctors",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(doctorPremium)
      .where(eq(doctorPremium.doctorId, resourceId))
      .limit(1);
    if (!row) return null;
    return { isActive: row.isActive, until: row.until };
  },
  handler: async ({ tx, resourceId, body }) => {
    const [doctor] = await tx
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    if (!doctor) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const b = (body ?? {}) as { isActive?: unknown; until?: unknown };

    if (typeof b.isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive (boolean) est requis" },
        { status: 422 }
      );
    }

    const untilDate = typeof b.until === "string" ? new Date(b.until) : null;

    const [after] = await tx
      .insert(doctorPremium)
      .values({
        doctorId: resourceId,
        isActive: b.isActive,
        until: untilDate,
      })
      .onConflictDoUpdate({
        target: doctorPremium.doctorId,
        set: {
          isActive: b.isActive,
          until: untilDate,
        },
      })
      .returning();

    return { ok: true, premium: after } as const;
  },
});
