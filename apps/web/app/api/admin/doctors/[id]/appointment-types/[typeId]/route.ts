import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { appointmentTypes } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { invalidate } from "@/lib/cache";

type RouteContext = { params: Promise<{ id: string; typeId: string }> };

export const PATCH = withAdminAudit<
  { ok: true; appointmentType: typeof appointmentTypes.$inferSelect },
  RouteContext
>({
  action: "appointment_types.update",
  resourceType: "appointment_types",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).typeId,
  getBefore: async ({ tx, ctx }) => {
    const { id, typeId } = await ctx.params;
    const [row] = await tx
      .select()
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)))
      .limit(1);
    return row ?? null;
  },
  handler: async ({ tx, ctx, body }) => {
    const { id, typeId } = await ctx.params;
    const b = (body ?? {}) as Record<string, unknown>;

    const [before] = await tx
      .select()
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)))
      .limit(1);

    if (!before) {
      return NextResponse.json(
        { error: "Type de consultation introuvable" },
        { status: 404 }
      );
    }

    const ALLOWED_FIELDS = [
      "name",
      "durationMinutes",
      "fee",
      "color",
      "isActive",
      "isDefault",
    ] as const;
    type AllowedField = (typeof ALLOWED_FIELDS)[number];

    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in b) updates[field] = b[field as AllowedField];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    if (
      "name" in updates &&
      (typeof updates.name !== "string" || (updates.name as string).trim().length === 0)
    ) {
      return NextResponse.json({ error: "name invalide" }, { status: 400 });
    }
    if (
      "durationMinutes" in updates &&
      (typeof updates.durationMinutes !== "number" ||
        !Number.isInteger(updates.durationMinutes) ||
        (updates.durationMinutes as number) <= 0)
    ) {
      return NextResponse.json(
        { error: "durationMinutes doit être un entier positif" },
        { status: 400 }
      );
    }

    if ("name" in updates) {
      updates.name = (updates.name as string).trim();
    }

    const [after] = await tx
      .update(appointmentTypes)
      .set(updates)
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)))
      .returning();

    await invalidate(`doctor:apptTypes:${id}`);

    return { ok: true, appointmentType: after } as const;
  },
});

export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "appointment_types.deactivate",
  resourceType: "appointment_types",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).typeId,
  getBefore: async ({ tx, ctx }) => {
    const { id, typeId } = await ctx.params;
    const [row] = await tx
      .select()
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)))
      .limit(1);
    if (!row) return null;
    return {
      name: row.name,
      durationMinutes: row.durationMinutes,
      fee: row.fee,
      isActive: row.isActive,
    };
  },
  handler: async ({ tx, ctx }) => {
    const { id, typeId } = await ctx.params;
    const [before] = await tx
      .select()
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)))
      .limit(1);

    if (!before) {
      return NextResponse.json(
        { error: "Type de consultation introuvable" },
        { status: 404 }
      );
    }

    // Soft-delete: set isActive=false to avoid FK issues with existing appointments
    await tx
      .update(appointmentTypes)
      .set({ isActive: false })
      .where(and(eq(appointmentTypes.id, typeId), eq(appointmentTypes.doctorId, id)));

    await invalidate(`doctor:apptTypes:${id}`);

    return { ok: true } as const;
  },
});
