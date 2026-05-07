import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<
  {
    token: string;
    doctor: { id: string; name: string; slug: string; email: string };
    expiresAt: string;
  },
  RouteContext
>({
  action: "doctors.impersonation_start",
  resourceType: "doctors",
  allowedRoles: ["super_admin"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, admin, resourceId }) => {
    const [doctor] = await tx
      .select()
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);

    if (!doctor) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const token = await new SignJWT({
      id: doctor.id,
      email: doctor.email,
      name: doctor.name,
      role: "doctor",
      impersonatedBy: admin.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .setIssuedAt()
      .sign(secret);

    return {
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        slug: doctor.slug,
        email: doctor.email,
      },
      expiresAt: expiresAt.toISOString(),
    };
  },
});
