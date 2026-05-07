import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, platformSettings } from "@doktori/db";
import { eq, asc } from "drizzle-orm";
import { invalidateSettingsCache } from "@/lib/platform-settings";

/** Mask secret values: show only last 4 chars, padded with bullets. */
function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `••••••••${value.slice(-4)}`;
}

export async function GET(_req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  try {
    const rows = await db
      .select()
      .from(platformSettings)
      .orderBy(asc(platformSettings.category), asc(platformSettings.key));

    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      const masked = row.type === "secret" ? { ...row, value: maskSecret(row.value) } : row;
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(masked);
    }

    return NextResponse.json({ settings: grouped });
  } catch (err) {
    console.error("[admin/settings] GET error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export const PUT = withAdminAudit<{ success: true }, unknown>({
  action: "update",
  resourceType: "platform_settings",
  allowedRoles: ["super_admin"],
  getResourceId: async (req) => {
    try {
      const b = (await req.clone().json()) as { key?: string };
      return typeof b.key === "string" ? b.key : "";
    } catch {
      return "";
    }
  },
  getBefore: async ({ tx, resourceId }) => {
    if (!resourceId) return null;
    const [row] = await tx
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, resourceId))
      .limit(1);
    if (!row) return null;
    return {
      key: row.key,
      value: row.type === "secret" ? maskSecret(row.value) : row.value,
    };
  },
  handler: async ({ tx, body }) => {
    const b = (body ?? {}) as { key?: string; value?: string };
    const { key, value } = b;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Paramètres manquants: key et value requis" },
        { status: 400 }
      );
    }

    const [current] = await tx
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: "Paramètre introuvable" }, { status: 404 });
    }

    await tx
      .update(platformSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(platformSettings.key, key));

    // Invalidate in-memory cache
    invalidateSettingsCache();

    return { success: true } as const;
  },
});
