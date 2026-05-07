import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, meilisearchSynonyms } from "@doktori/db";
import { meili, DOCTORS_INDEX, CLINICS_INDEX } from "@/lib/meilisearch";
import { eq } from "drizzle-orm";

// POST /api/admin/catalog/synonymes/resync
// Push all active rows in `meilisearch_synonyms` to Meilisearch settings on
// both doctors + clinics indexes.
export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select()
    .from(meilisearchSynonyms)
    .where(eq(meilisearchSynonyms.isActive, true));

  // Meilisearch synonyms format: { "term": ["syn1", "syn2"] }
  const synonyms: Record<string, string[]> = {};
  for (const r of rows) {
    const list = (r.synonyms as unknown as string[]) ?? [];
    if (Array.isArray(list) && list.length > 0) {
      synonyms[r.term] = list;
    }
  }

  const tasks: Array<{ index: string; taskUid: number | null; error?: string }> = [];

  for (const idx of [DOCTORS_INDEX, CLINICS_INDEX]) {
    try {
      const task = await meili.index(idx).updateSynonyms(synonyms);
      tasks.push({ index: idx, taskUid: task.taskUid });
    } catch (e) {
      tasks.push({
        index: idx,
        taskUid: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "catalog.synonymes.resync",
    resourceType: "meilisearch_synonyms",
    resourceId: "all",
    after: { count: rows.length, tasks },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true, count: rows.length, tasks });
}
