import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
import { db, featureFlags } from "@doktori/db";
import { asc } from "drizzle-orm";

// GET /api/admin/system/flags — list all feature flags
export async function GET(_req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db.select().from(featureFlags).orderBy(asc(featureFlags.key));

  return NextResponse.json({ flags: rows });
}

// POST /api/admin/system/flags — create a new feature flag
export const POST = withAdminAudit<
  { flag: typeof featureFlags.$inferSelect },
  unknown
>({
  action: "create",
  resourceType: "feature_flag",
  allowedRoles: ["super_admin"],
  getResourceId: async (req) => {
    try {
      const b = (await req.clone().json()) as { key?: string };
      return typeof b.key === "string" ? b.key : "";
    } catch {
      return "";
    }
  },
  handler: async ({ tx, body }) => {
    const b = (body ?? {}) as Record<string, unknown>;
    const { key, description, enabled = false } = b;

    if (!key || typeof key !== "string" || !/^[a-z0-9_]{1,100}$/.test(key)) {
      return NextResponse.json(
        { error: "La clé doit être en minuscules, chiffres et underscores (max 100 car.)" },
        { status: 400 }
      );
    }

    const [created] = await tx
      .insert(featureFlags)
      .values({
        key,
        description: (description as string | null) ?? null,
        enabled: Boolean(enabled),
      })
      .returning();

    return { flag: created };
  },
});
