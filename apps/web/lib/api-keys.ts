import { db, apiKeys, apiRequestLogs, type ApiKey } from "@doktori/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { NextResponse } from "next/server";

/**
 * API key auth for the public read-only API (Phase 1 — Stream C, item #27).
 *
 * Keys are stored hashed (sha256 hex). Raw keys (`dok_<32hex>`) are only
 * returned ONCE on creation. Verification looks up by hash for O(1) match.
 *
 * Rate limit: simple in-memory rolling window (per process). For multi-node
 * deployments, swap for Redis later.
 */

export type GeneratedApiKey = {
  rawKey: string;
  keyHash: string;
  prefix: string;
};

/** Hash a raw key with sha256 hex (no salt — keys are already 128-bit random). */
function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generate a new API key.
 * Format: `dok_<32hex>` (16 random bytes hex-encoded).
 * Returns the raw key (show once), the hash (store), and the prefix (display).
 */
export function generateApiKey(): GeneratedApiKey {
  const random = crypto.randomBytes(16).toString("hex"); // 32 hex chars
  const rawKey = `dok_${random}`;
  const keyHash = hashKey(rawKey);
  const prefix = rawKey.slice(0, 12); // "dok_xxxxxxxx" — safe to display
  return { rawKey, keyHash, prefix };
}

/**
 * Verify a raw API key. Returns the key record if found, active, and not expired.
 * Returns null otherwise.
 */
export async function verifyApiKey(rawKey: string): Promise<ApiKey | null> {
  if (!rawKey || !rawKey.startsWith("dok_")) return null;
  const keyHash = hashKey(rawKey);

  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row) return null;
  if (!row.active) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

// ── Rate limiting (per-key, rolling 1-minute window) ─────────────────────────

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(keyId: string, limit: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(keyId);
  if (!bucket || now > bucket.resetAt) {
    const resetAt = now + 60_000;
    rateBuckets.set(keyId, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count++;
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

// ── Request guard ─────────────────────────────────────────────────────────────

export type ApiKeyContext = {
  key: ApiKey;
  rateLimitRemaining: number;
  rateLimitResetAt: number;
};

/**
 * Extract Authorization: Bearer dok_xxx, verify, check scope, enforce rate limit.
 * Returns either a NextResponse (401/403/429) or the verified key context.
 *
 * Usage:
 *   const ctx = await requireApiKey(req, "read:doctors");
 *   if (ctx instanceof NextResponse) return ctx;
 *   // ctx.key is the ApiKey record
 */
export async function requireApiKey(
  req: Request,
  requiredScope: string
): Promise<ApiKeyContext | NextResponse> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header. Use: Authorization: Bearer dok_xxx" },
      { status: 401 }
    );
  }
  const rawKey = authHeader.slice(7).trim();
  const key = await verifyApiKey(rawKey);
  if (!key) {
    return NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 });
  }

  // Scope check
  if (!Array.isArray(key.scopes) || !key.scopes.includes(requiredScope)) {
    return NextResponse.json(
      { error: `API key missing required scope: ${requiredScope}` },
      { status: 403 }
    );
  }

  // Rate limit
  const rl = checkRateLimit(key.id, key.rateLimitPerMinute);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a few seconds." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(key.rateLimitPerMinute),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(rl.resetAt / 1000)),
        },
      }
    );
  }

  // Best-effort: update lastUsedAt asynchronously (do not block)
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .catch(() => {});

  return { key, rateLimitRemaining: rl.remaining, rateLimitResetAt: rl.resetAt };
}

/**
 * Log an API request. Best-effort, fire-and-forget.
 */
export function logApiRequest(params: {
  apiKeyId: string | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
}): void {
  void db
    .insert(apiRequestLogs)
    .values({
      apiKeyId: params.apiKeyId,
      method: params.method,
      path: params.path.slice(0, 255),
      statusCode: params.statusCode,
      durationMs: params.durationMs,
      ip: params.ip?.slice(0, 50) ?? null,
      userAgent: params.userAgent?.slice(0, 500) ?? null,
    })
    .catch(() => {});
}

/** Helper: extract IP + UA from a Request. */
export function extractClientMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ip, userAgent };
}

/** Helper: build standard rate-limit response headers. */
export function rateLimitHeaders(ctx: ApiKeyContext): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(ctx.key.rateLimitPerMinute),
    "X-RateLimit-Remaining": String(ctx.rateLimitRemaining),
    "X-RateLimit-Reset": String(Math.floor(ctx.rateLimitResetAt / 1000)),
  };
}
