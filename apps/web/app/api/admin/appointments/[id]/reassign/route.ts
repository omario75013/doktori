import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { appointments, doctors } from "@doktori/db";
import { and, eq, gt, lt, ne, sql } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  newDoctorId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const REASSIGNABLE_STATUSES = new Set(["pending", "confirmed"]);

export const POST = withAdminAudit<
  { ok: true; appointment: typeof appointments.$inferSelect },
  RouteContext
>({
  action: "appointments.reassign",
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
    const { newDoctorId } = parsed.data;

    const [appt] = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, resourceId))
      .limit(1);
    if (!appt) {
      return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
    }
    if (!REASSIGNABLE_STATUSES.has(appt.status)) {
      return NextResponse.json(
        { error: `Réassignation interdite pour le statut '${appt.status}'` },
        { status: 409 }
      );
    }
    if (appt.doctorId === newDoctorId) {
      return NextResponse.json(
        { error: "Le nouveau médecin est identique au médecin actuel" },
        { status: 400 }
      );
    }

    const [newDoctor] = await tx
      .select({ id: doctors.id, isActive: doctors.isActive })
      .from(doctors)
      .where(eq(doctors.id, newDoctorId))
      .limit(1);
    if (!newDoctor) {
      return NextResponse.json({ error: "Médecin destinataire introuvable" }, { status: 404 });
    }
    if (!newDoctor.isActive) {
      return NextResponse.json({ error: "Médecin destinataire inactif" }, { status: 400 });
    }

    // Conflict check on new doctor: any non-cancelled appointment that overlaps
    // [appt.startsAt, appt.endsAt) — excluding this appointment.
    const [conflict] = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, newDoctorId),
          ne(appointments.id, resourceId),
          sql`${appointments.status} IN ('pending', 'confirmed', 'completed')`,
          lt(appointments.startsAt, appt.endsAt),
          gt(appointments.endsAt, appt.startsAt)
        )
      )
      .limit(1);
    if (conflict) {
      return NextResponse.json(
        { error: "Conflit d'horaire chez le médecin destinataire", conflictAppointmentId: conflict.id },
        { status: 409 }
      );
    }

    const [updated] = await tx
      .update(appointments)
      .set({ doctorId: newDoctorId, updatedAt: new Date() })
      .where(eq(appointments.id, resourceId))
      .returning();

    return { ok: true, appointment: updated } as const;
  },
});
