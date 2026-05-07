import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, appointmentTypes } from "@doktori/db";
import { eq, asc } from "drizzle-orm";
import { invalidate } from "@/lib/cache";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const rows = await db
    .select()
    .from(appointmentTypes)
    .where(eq(appointmentTypes.doctorId, id))
    .orderBy(asc(appointmentTypes.createdAt));

  return NextResponse.json({ appointmentTypes: rows });
}

export const POST = withAdminAudit<
  { ok: true; appointmentType: typeof appointmentTypes.$inferSelect },
  RouteContext
>({
  action: "appointment_types.create",
  resourceType: "appointment_types",
  allowedRoles: ["super_admin"],
  // The resource being audited is the doctor's appointment-types collection;
  // we use the doctorId as the audit resource for traceability.
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as Record<string, unknown>;

    const name = b.name as string | undefined;
    const durationMinutes = b.durationMinutes as number | undefined;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name est requis" }, { status: 400 });
    }
    if (
      typeof durationMinutes !== "number" ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0
    ) {
      return NextResponse.json(
        { error: "durationMinutes doit être un entier positif" },
        { status: 400 }
      );
    }

    const insert: {
      doctorId: string;
      name: string;
      durationMinutes: number;
      fee?: number;
      color?: string;
      isDefault?: boolean;
    } = {
      doctorId: resourceId,
      name: name.trim(),
      durationMinutes,
    };

    if (typeof b.fee === "number") insert.fee = b.fee;
    if (typeof b.color === "string") insert.color = b.color;
    if (typeof b.isDefault === "boolean") insert.isDefault = b.isDefault;

    const [newType] = await tx
      .insert(appointmentTypes)
      .values(insert)
      .returning();

    await invalidate(`doctor:apptTypes:${resourceId}`);

    return { ok: true, appointmentType: newType } as const;
  },
});
