import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, clinics, clinicDoctors, doctors, appointments } from "@doktori/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
  if (!clinic) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const clinicDoctorRows = await db
    .select({
      id: clinicDoctors.id,
      role: clinicDoctors.role,
      createdAt: clinicDoctors.createdAt,
      doctorId: doctors.id,
      doctorName: doctors.name,
      doctorEmail: doctors.email,
      doctorSpecialty: doctors.specialty,
    })
    .from(clinicDoctors)
    .innerJoin(doctors, eq(clinicDoctors.doctorId, doctors.id))
    .where(eq(clinicDoctors.clinicId, id));

  // Appointment count for clinic doctors this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [{ apptCount }] = await db
    .select({ apptCount: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      sql`${appointments.doctorId} IN (
        SELECT doctor_id FROM clinic_doctors WHERE clinic_id = ${id}
      ) AND ${appointments.startsAt} >= ${monthStart}`
    );

  return NextResponse.json({
    clinic: {
      ...clinic,
      createdAt: clinic.createdAt.toISOString(),
    },
    doctors: clinicDoctorRows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    apptCountThisMonth: Number(apptCount ?? 0),
  });
}

export const PATCH = withAdminAudit<
  { clinic: Omit<typeof clinics.$inferSelect, "createdAt"> & { createdAt: string } },
  RouteContext
>({
  action: "clinics.update",
  resourceType: "clinics",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const [row] = await tx.select().from(clinics).where(eq(clinics.id, resourceId)).limit(1);
    return row ?? null;
  },
  handler: async ({ tx, resourceId, body }) => {
    const [existing] = await tx.select().from(clinics).where(eq(clinics.id, resourceId)).limit(1);
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const b = (body ?? {}) as Record<string, unknown>;
    const allowed = ["name", "address", "city", "phone", "email", "plan", "logoUrl"] as const;
    const updates: Partial<typeof clinics.$inferInsert> = {};

    for (const key of allowed) {
      if (key in b && b[key] !== undefined) {
        (updates as Record<string, unknown>)[key] = b[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
    }

    const [updated] = await tx
      .update(clinics)
      .set(updates)
      .where(eq(clinics.id, resourceId))
      .returning();

    return { clinic: { ...updated, createdAt: updated.createdAt.toISOString() } };
  },
});
