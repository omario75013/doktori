import { NextResponse } from "next/server";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAdminAudit<
  { ok: true; tempPassword: string },
  RouteContext
>({
  action: "doctors.reset_password",
  resourceType: "doctors",
  allowedRoles: ["super_admin", "support"],
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  handler: async ({ tx, resourceId }) => {
    const [doctor] = await tx
      .select()
      .from(doctors)
      .where(eq(doctors.id, resourceId))
      .limit(1);
    if (!doctor) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const temp = randomBytes(8).toString("base64url");
    const hashed = await hash(temp, 10);

    await tx
      .update(doctors)
      .set({ passwordHash: hashed, updatedAt: new Date() })
      .where(eq(doctors.id, resourceId));

    return { ok: true, tempPassword: temp } as const;
  },
});
