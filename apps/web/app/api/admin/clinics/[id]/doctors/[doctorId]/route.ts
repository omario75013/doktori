import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { clinicDoctors, doctors } from "@doktori/db";

type RouteContext = { params: Promise<{ id: string; doctorId: string }> };

export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "clinics.remove_doctor",
  resourceType: "clinics",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, ctx }) => {
    const { id, doctorId } = await ctx.params;
    const [existing] = await tx
      .select()
      .from(clinicDoctors)
      .where(and(eq(clinicDoctors.clinicId, id), eq(clinicDoctors.doctorId, doctorId)))
      .limit(1);
    if (!existing) return null;
    const [doctor] = await tx
      .select({ name: doctors.name })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);
    return { doctorId, doctorName: doctor?.name ?? doctorId, role: existing.role };
  },
  handler: async ({ tx, ctx }) => {
    const { id, doctorId } = await ctx.params;

    const [existing] = await tx
      .select()
      .from(clinicDoctors)
      .where(and(eq(clinicDoctors.clinicId, id), eq(clinicDoctors.doctorId, doctorId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Association introuvable" }, { status: 404 });
    }

    await tx
      .delete(clinicDoctors)
      .where(and(eq(clinicDoctors.clinicId, id), eq(clinicDoctors.doctorId, doctorId)));

    return { ok: true } as const;
  },
});
