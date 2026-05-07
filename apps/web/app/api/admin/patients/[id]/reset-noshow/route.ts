import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { patients } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<{ ok: true }, RouteContext>({
  action: "patients.reset_noshow",
  resourceType: "patients",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(patients).where(eq(patients.id, resourceId)).limit(1);
    if (!row) return null;
    return { noShowCount: row.noShowCount };
  },
  handler: async ({ tx, resourceId }) => {
    const [patient] = await tx.select().from(patients).where(eq(patients.id, resourceId)).limit(1);
    if (!patient) {
      return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
    }

    await tx.update(patients).set({ noShowCount: 0 }).where(eq(patients.id, resourceId));

    return { ok: true } as const;
  },
});
