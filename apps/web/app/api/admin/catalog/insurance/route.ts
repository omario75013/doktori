import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, insuranceProviders } from "@doktori/db";
import { asc } from "drizzle-orm";

// GET /api/admin/catalog/insurance — list providers
export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select()
    .from(insuranceProviders)
    .orderBy(asc(insuranceProviders.sortOrder), asc(insuranceProviders.label));

  return NextResponse.json({ providers: rows });
}

// POST /api/admin/catalog/insurance — create
const createSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,50}$/, "id minuscules / chiffres / _ -"),
  label: z.string().min(1).max(100),
  labelAr: z.string().max(100).nullish(),
  type: z.enum(["public", "private"]),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const POST = withAdminAudit({
  action: "catalog.insurance.create",
  resourceType: "insurance_providers",
  allowedRoles: ["super_admin"],
  getResourceId: async (req) => {
    try {
      const body = (await req.clone().json()) as { id?: string };
      return body.id ?? "_new";
    } catch {
      return "_new";
    }
  },
  handler: async ({ tx, body }) => {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const v = parsed.data;
    const [created] = await tx
      .insert(insuranceProviders)
      .values({
        id: v.id,
        label: v.label,
        labelAr: v.labelAr ?? null,
        type: v.type,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
      })
      .returning();
    return { provider: created };
  },
});
