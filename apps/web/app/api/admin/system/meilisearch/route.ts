import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { meili } from "@/lib/meilisearch";

// GET /api/admin/system/meilisearch — list indexes + counts + settings
export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  try {
    const indexesResp = await meili.getIndexes({ limit: 100 });
    const list = indexesResp.results ?? [];

    const indexes = await Promise.all(
      list.map(async (idx) => {
        const uid = idx.uid;
        const stats = await meili.index(uid).getStats().catch(() => null);
        const settings = await meili.index(uid).getSettings().catch(() => null);
        return {
          uid,
          primaryKey: idx.primaryKey,
          numberOfDocuments: stats?.numberOfDocuments ?? null,
          isIndexing: stats?.isIndexing ?? null,
          fieldDistribution: stats?.fieldDistribution ?? null,
          settings: settings
            ? {
                searchableAttributes: settings.searchableAttributes ?? null,
                filterableAttributes: settings.filterableAttributes ?? null,
                sortableAttributes: settings.sortableAttributes ?? null,
                synonymsCount: settings.synonyms ? Object.keys(settings.synonyms).length : 0,
                stopWordsCount: Array.isArray(settings.stopWords) ? settings.stopWords.length : 0,
              }
            : null,
        };
      })
    );

    let version: string | null = null;
    let health: { status: string } | null = null;
    try {
      const v = await meili.getVersion();
      version = v.pkgVersion ?? null;
    } catch {
      version = null;
    }
    try {
      health = await meili.health();
    } catch {
      health = null;
    }

    return NextResponse.json({
      version,
      health,
      indexes,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Erreur Meilisearch",
        version: null,
        health: null,
        indexes: [],
      },
      { status: 502 }
    );
  }
}
