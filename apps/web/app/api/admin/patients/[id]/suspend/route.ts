import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { patients } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<{ ok: true }, RouteContext>({
  action: "patients.suspend",
  resourceType: "patients",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getReason: ({ body }) => {
    const b = body as { reason?: unknown } | null;
    return typeof b?.reason === "string" ? b.reason : null;
  },
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(patients).where(eq(patients.id, resourceId)).limit(1);
    if (!row) return null;
    return { isSuspended: row.isSuspended, suspensionReason: row.suspensionReason };
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = body as { reason?: unknown } | null;
    const reason = typeof b?.reason === "string" ? b.reason.trim() : "";
    if (!reason) {
      return NextResponse.json({ error: "La raison de suspension est requise" }, { status: 422 });
    }

    const [patient] = await tx.select().from(patients).where(eq(patients.id, resourceId)).limit(1);
    if (!patient) {
      return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
    }
    if (patient.isSuspended) {
      return NextResponse.json({ error: "Patient déjà suspendu" }, { status: 409 });
    }

    const now = new Date();
    await tx
      .update(patients)
      .set({ isSuspended: true, suspensionReason: reason, suspendedAt: now })
      .where(eq(patients.id, resourceId));

    return { ok: true } as const;
  },
});
