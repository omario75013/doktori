import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { appointments } from "@doktori/db";
import { and, eq, gt, lt, ne, sql } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

const BodySchema = z
  .object({
    newStartsAt: z.string().datetime(),
    newEndsAt: z.string().datetime(),
    reason: z.string().max(500).optional(),
  })
  .refine((d) => new Date(d.newStartsAt) < new Date(d.newEndsAt), {
    message: "newStartsAt doit être avant newEndsAt",
    path: ["newStartsAt"],
  });

const RESCHEDULABLE_STATUSES = new Set(["pending", "confirmed"]);

export const POST = withAdminAudit<
  { ok: true; appointment: typeof appointments.$inferSelect },
  RouteContext
>({
  action: "appointments.reschedule",
  resourceType: "appointments",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getReason: ({ body }) => {
    const b = body as { reason?: unknown } | null;
    return typeof b?.reason === "string" ? b.reason : null;
  },
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, resourceId))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const newStartsAt = new Date(parsed.data.newStartsAt);
    const newEndsAt = new Date(parsed.data.newEndsAt);

    if (newStartsAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "La nouvelle date doit être dans le futur" },
        { status: 400 }
      );
    }

    const [appt] = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, resourceId))
      .limit(1);
    if (!appt) {
      return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
    }
    if (!RESCHEDULABLE_STATUSES.has(appt.status)) {
      return NextResponse.json(
        { error: `Reprogrammation interdite pour le statut '${appt.status}'` },
        { status: 409 }
      );
    }

    // Conflict check on SAME doctor, excluding this appointment.
    const [conflict] = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, appt.doctorId),
          ne(appointments.id, resourceId),
          sql`${appointments.status} IN ('pending', 'confirmed', 'completed')`,
          lt(appointments.startsAt, newEndsAt),
          gt(appointments.endsAt, newStartsAt)
        )
      )
      .limit(1);
    if (conflict) {
      return NextResponse.json(
        { error: "Conflit d'horaire avec un autre rendez-vous", conflictAppointmentId: conflict.id },
        { status: 409 }
      );
    }

    const [updated] = await tx
      .update(appointments)
      .set({
        startsAt: newStartsAt,
        endsAt: newEndsAt,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, resourceId))
      .returning();

    return { ok: true, appointment: updated } as const;
  },
});
