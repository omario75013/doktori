import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, catalogMotifs, catalogSpecialties } from "@doktori/db";
import { asc, eq } from "drizzle-orm";

// GET /api/admin/catalog/motifs — list with specialty label
export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select({
      id: catalogMotifs.id,
      name: catalogMotifs.name,
      nameAr: catalogMotifs.nameAr,
      specialtyId: catalogMotifs.specialtyId,
      specialtyLabel: catalogSpecialties.label,
      durationMinutes: catalogMotifs.durationMinutes,
      suggestedFee: catalogMotifs.suggestedFee,
      category: catalogMotifs.category,
      isActive: catalogMotifs.isActive,
      sortOrder: catalogMotifs.sortOrder,
      createdAt: catalogMotifs.createdAt,
    })
    .from(catalogMotifs)
    .leftJoin(catalogSpecialties, eq(catalogMotifs.specialtyId, catalogSpecialties.id))
    .orderBy(asc(catalogMotifs.sortOrder), asc(catalogMotifs.name));

  return NextResponse.json({ motifs: rows });
}

// POST /api/admin/catalog/motifs
const createSchema = z.object({
  name: z.string().min(1).max(255),
  nameAr: z.string().max(255).nullish(),
  specialtyId: z.string().max(50).nullish(),
  durationMinutes: z.number().int().min(5).max(480).optional().default(30),
  suggestedFee: z.number().int().min(0).nullish(),
  category: z.enum(["consultation", "controle", "urgence", "teleconsultation", "domicile", "autre"]).optional().default("consultation"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export const POST = withAdminAudit({
  action: "catalog.motifs.create",
  resourceType: "catalog_motifs",
  allowedRoles: ["super_admin"],
  getResourceId: async () => "_new",
  handler: async ({ tx, body }) => {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const v = parsed.data;
    const [created] = await tx
      .insert(catalogMotifs)
      .values({
        name: v.name,
        nameAr: v.nameAr ?? null,
        specialtyId: v.specialtyId ?? null,
        durationMinutes: v.durationMinutes,
        suggestedFee: v.suggestedFee ?? null,
        category: v.category,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
      })
      .returning();
    return { motif: created };
  },
});
