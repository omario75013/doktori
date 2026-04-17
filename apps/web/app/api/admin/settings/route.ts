import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, platformSettings } from "@doktori/db";
import { eq, asc } from "drizzle-orm";
import { invalidateSettingsCache } from "@/lib/platform-settings";

/** Mask secret values: show only last 4 chars, padded with bullets. */
function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `••••••••${value.slice(-4)}`;
}

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  try {
    const rows = await db.select().from(platformSettings).orderBy(asc(platformSettings.category), asc(platformSettings.key));

    // Group by category and mask secrets
    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      const masked = row.type === "secret"
        ? { ...row, value: maskSecret(row.value) }
        : row;
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(masked);
    }

    return NextResponse.json({ settings: grouped });
  } catch (err) {
    console.error("[admin/settings] GET error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  let body: { key?: string; value?: string };
  try {
    body = (await req.json()) as { key?: string; value?: string };
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { key, value } = body;

  if (!key || value === undefined) {
    return NextResponse.json({ error: "Paramètres manquants: key et value requis" }, { status: 400 });
  }

  try {
    // Fetch current row
    const [current] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "Paramètre introuvable" }, { status: 404 });
    }

    // Update value and bump updated_at
    await db
      .update(platformSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(platformSettings.key, key));

    // Audit: mask secrets in the log
    const isSecret = current.type === "secret";
    const { ip, userAgent } = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "update",
      resourceType: "platform_settings",
      resourceId: key,
      before: { key, value: isSecret ? maskSecret(current.value) : current.value },
      after: { key, value: isSecret ? maskSecret(value) : value },
      ip,
      userAgent,
    });

    // Invalidate in-memory cache
    invalidateSettingsCache();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/settings] PUT error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
