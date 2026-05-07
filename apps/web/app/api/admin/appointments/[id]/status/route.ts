import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { appointments } from "@doktori/db";
import { eq } from "drizzle-orm";

const VALID_STATUSES = ["pending", "confirmed", "completed", "no_show", "cancelled"] as const;
type AppointmentStatus = (typeof VALID_STATUSES)[number];

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminAudit<
  {
    appointment: {
      id: string;
      status: string;
      confirmedAt: string | null;
      cancelledAt: string | null;
      updatedAt: string;
    };
  },
  RouteContext
>({
  action: ({ body }) => {
    const b = body as { status?: unknown } | null;
    const status = typeof b?.status === "string" ? b.status : "unknown";
    return `appointments.status.${status}`;
  },
  resourceType: "appointments",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getReason: ({ body }) => {
    const b = body as { reason?: unknown } | null;
    return typeof b?.reason === "string" ? b.reason : null;
  },
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(appointments).where(eq(appointments.id, resourceId)).limit(1);
    if (!row) return null;
    return { status: row.status, confirmedAt: row.confirmedAt, cancelledAt: row.cancelledAt };
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = body as { status?: unknown } | null;
    const newStatus = b?.status as string;
    if (!VALID_STATUSES.includes(newStatus as AppointmentStatus)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs acceptées: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const [before] = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, resourceId))
      .limit(1);

    if (!before) {
      return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
    };

    if (newStatus === "confirmed") {
      updates.confirmedAt = now;
    } else if (newStatus === "cancelled") {
      updates.cancelledAt = now;
    }

    const [after] = await tx
      .update(appointments)
      .set(updates)
      .where(eq(appointments.id, resourceId))
      .returning();

    return {
      appointment: {
        id: after.id,
        status: after.status,
        confirmedAt: after.confirmedAt?.toISOString() ?? null,
        cancelledAt: after.cancelledAt?.toISOString() ?? null,
        updatedAt: after.updatedAt.toISOString(),
      },
    };
  },
});
