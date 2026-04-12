import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, featureFlags } from "@doktori/db";
import { asc } from "drizzle-orm";

// GET /api/admin/system/flags — list all feature flags
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select()
    .from(featureFlags)
    .orderBy(asc(featureFlags.key));

  return NextResponse.json({ flags: rows });
}

// POST /api/admin/system/flags — create a new feature flag
export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json();
  const { key, description, enabled = false } = body;

  if (!key || typeof key !== "string" || !/^[a-z0-9_]{1,100}$/.test(key)) {
    return NextResponse.json(
      { error: "La clé doit être en minuscules, chiffres et underscores (max 100 car.)" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(featureFlags)
    .values({
      key,
      description: description ?? null,
      enabled: Boolean(enabled),
    })
    .returning();

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "create",
    resourceType: "feature_flag",
    resourceId: key,
    after: created,
    ip,
    userAgent,
  });

  return NextResponse.json({ flag: created }, { status: 201 });
}
