import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { clinics, clinicDoctors, doctors } from "@doktori/db";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<
  { clinicDoctor: Omit<typeof clinicDoctors.$inferSelect, "createdAt"> & { createdAt: string } },
  RouteContext
>({
  action: "clinics.add_doctor",
  resourceType: "clinics",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId, body }) => {
    const [clinic] = await tx.select().from(clinics).where(eq(clinics.id, resourceId)).limit(1);
    if (!clinic) return NextResponse.json({ error: "Clinique introuvable" }, { status: 404 });

    const b = (body ?? {}) as Record<string, unknown>;
    const { doctorId, role } = b;

    if (!doctorId || typeof doctorId !== "string") {
      return NextResponse.json({ error: "doctorId requis" }, { status: 400 });
    }

    const validRole = role === "admin" || role === "member" ? role : "member";

    const [doctor] = await tx.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);
    if (!doctor) return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });

    const [existing] = await tx
      .select()
      .from(clinicDoctors)
      .where(and(eq(clinicDoctors.clinicId, resourceId), eq(clinicDoctors.doctorId, doctorId)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Ce médecin est déjà dans la clinique" }, { status: 409 });
    }

    const [inserted] = await tx
      .insert(clinicDoctors)
      .values({ clinicId: resourceId, doctorId, role: validRole })
      .returning();

    return { clinicDoctor: { ...inserted, createdAt: inserted.createdAt.toISOString() } };
  },
});
