import { NextResponse } from "next/server";
import { db, apiKeys } from "@doktori/db";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { generateApiKey } from "@/lib/api-keys";
import type { AdminSession } from "@/lib/admin-auth";

const ALLOWED_SCOPES = [
  "read:doctors",
  "read:specialties",
  "read:cities",
  "read:availability",
] as const;

/**
 * GET /api/admin/api-keys
 * List all API keys (no raw keys — only prefix shown).
 */
export async function GET() {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select({
      id: apiKeys.id,
      prefix: apiKeys.prefix,
      name: apiKeys.name,
      ownerEmail: apiKeys.ownerEmail,
      scopes: apiKeys.scopes,
      rateLimitPerMinute: apiKeys.rateLimitPerMinute,
      active: apiKeys.active,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt));

  return NextResponse.json({ keys: rows });
}

/**
 * POST /api/admin/api-keys
 * Create a new API key. Returns the raw key ONCE — admin must save it.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Body JSON requis" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Nom requis (max 120 caractères)" }, { status: 400 });
  }

  const ownerEmail =
    typeof body.ownerEmail === "string" && body.ownerEmail.trim()
      ? body.ownerEmail.trim().toLowerCase()
      : null;
  if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const requestedScopes = Array.isArray(body.scopes) ? body.scopes : [];
  const scopes = (requestedScopes as unknown[])
    .filter((s): s is string => typeof s === "string")
    .filter((s) => (ALLOWED_SCOPES as readonly string[]).includes(s));
  if (scopes.length === 0) {
    return NextResponse.json(
      { error: `Au moins un scope requis parmi: ${ALLOWED_SCOPES.join(", ")}` },
      { status: 400 }
    );
  }

  const rateLimitPerMinute =
    typeof body.rateLimitPerMinute === "number" && body.rateLimitPerMinute > 0
      ? Math.min(Math.floor(body.rateLimitPerMinute), 1000)
      : 60;

  let expiresAt: Date | null = null;
  if (typeof body.expiresAt === "string" && body.expiresAt.trim()) {
    const d = new Date(body.expiresAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Date d'expiration invalide" }, { status: 400 });
    }
    expiresAt = d;
  }

  const generated = generateApiKey();

  const [created] = await db
    .insert(apiKeys)
    .values({
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      name,
      ownerEmail,
      scopes,
      rateLimitPerMinute,
      active: true,
      expiresAt,
      createdByAdmin: (admin as AdminSession).id,
    })
    .returning({
      id: apiKeys.id,
      prefix: apiKeys.prefix,
      name: apiKeys.name,
      ownerEmail: apiKeys.ownerEmail,
      scopes: apiKeys.scopes,
      rateLimitPerMinute: apiKeys.rateLimitPerMinute,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    });

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin as AdminSession,
    action: "api_keys.create",
    resourceType: "api_key",
    resourceId: created.id,
    before: null,
    after: { name, ownerEmail, scopes, rateLimitPerMinute, prefix: created.prefix },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json(
    {
      key: created,
      // The raw key is shown ONCE — admin UI must persist/copy it.
      rawKey: generated.rawKey,
      warning: "Save this key now. It will not be shown again.",
    },
    { status: 201 }
  );
}
