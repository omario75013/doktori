import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, doctorInsurance, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const rows = await db
    .select()
    .from(doctorInsurance)
    .where(eq(doctorInsurance.doctorId, id));

  return NextResponse.json({ insurance: rows });
}

export const POST = withAdminAudit<
  { ok: true; insurance: typeof doctorInsurance.$inferSelect },
  RouteContext
>({
  action: "doctors.insurance_add",
  resourceType: "doctors",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId, body }) => {
    const [doctor] = await tx
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    if (!doctor) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const b = (body ?? {}) as { insuranceType?: unknown; isConventioned?: unknown };
    if (
      !b.insuranceType ||
      typeof b.insuranceType !== "string" ||
      b.insuranceType.trim() === ""
    ) {
      return NextResponse.json({ error: "insuranceType requis" }, { status: 400 });
    }

    const [row] = await tx
      .insert(doctorInsurance)
      .values({
        doctorId: resourceId,
        insuranceType: b.insuranceType.trim(),
        isConventioned:
          typeof b.isConventioned === "boolean" ? b.isConventioned : true,
      })
      .returning();

    return { ok: true, insurance: row } as const;
  },
});

export const DELETE = withAdminAudit<{ ok: true }, RouteContext>({
  action: "doctors.insurance_remove",
  resourceType: "doctors",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId, req }) => {
    let insuranceId: string | null = null;
    const url = new URL(req.url);
    const queryInsuranceId = url.searchParams.get("insuranceId");
    if (queryInsuranceId) {
      insuranceId = queryInsuranceId;
    } else {
      try {
        const b = (await req.clone().json()) as { insuranceId?: unknown };
        if (typeof b.insuranceId === "string") insuranceId = b.insuranceId;
      } catch {
        // body may be empty for query-param-only requests
      }
    }

    if (!insuranceId) {
      return NextResponse.json({ error: "insuranceId requis" }, { status: 400 });
    }

    const [existing] = await tx
      .select()
      .from(doctorInsurance)
      .where(
        and(eq(doctorInsurance.id, insuranceId), eq(doctorInsurance.doctorId, resourceId))
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Convention introuvable" },
        { status: 404 }
      );
    }

    await tx
      .delete(doctorInsurance)
      .where(
        and(eq(doctorInsurance.id, insuranceId), eq(doctorInsurance.doctorId, resourceId))
      );

    return { ok: true } as const;
  },
});
