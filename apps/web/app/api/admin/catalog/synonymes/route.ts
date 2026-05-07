import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, meilisearchSynonyms } from "@doktori/db";
import { asc } from "drizzle-orm";

// GET /api/admin/catalog/synonymes
export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select()
    .from(meilisearchSynonyms)
    .orderBy(asc(meilisearchSynonyms.term));

  return NextResponse.json({ synonyms: rows });
}

// POST /api/admin/catalog/synonymes
const createSchema = z.object({
  term: z.string().min(1).max(100),
  synonyms: z.array(z.string().min(1).max(100)).min(1).max(50),
  isActive: z.boolean().optional().default(true),
});

export const POST = withAdminAudit({
  action: "catalog.synonymes.create",
  resourceType: "meilisearch_synonyms",
  allowedRoles: ["super_admin"],
  getResourceId: async (req) => {
    try {
      const body = (await req.clone().json()) as { term?: string };
      return body.term ?? "_new";
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
      .insert(meilisearchSynonyms)
      .values({
        term: v.term.trim().toLowerCase(),
        synonyms: v.synonyms.map((s) => s.trim().toLowerCase()),
        isActive: v.isActive,
      })
      .returning();
    return { synonym: created };
  },
});
