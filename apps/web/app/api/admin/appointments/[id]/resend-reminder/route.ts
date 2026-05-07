import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { appointments } from "@doktori/db";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<
  { success: true; message: string },
  RouteContext
>({
  action: "appointments.resend_reminder",
  resourceType: "appointments",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select({ id: appointments.id, status: appointments.status, patientId: appointments.patientId })
      .from(appointments)
      .where(eq(appointments.id, resourceId))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
    }

    // SMS infrastructure not yet wired — logged for now.
    return { success: true, message: "Rappel enregistré (SMS à implémenter)" } as const;
  },
});
