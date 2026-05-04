import { db, featureFlags } from "@doktori/db";
import { eq } from "drizzle-orm";

const cache = new Map<string, { enabled: boolean; expiresAt: number }>();
const CACHE_TTL = 60_000; // 60 seconds

export async function isEnabled(key: string): Promise<boolean> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.enabled;

  const [flag] = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1);

  const enabled = flag?.enabled ?? false;
  cache.set(key, { enabled, expiresAt: Date.now() + CACHE_TTL });
  return enabled;
}

/**
 * Check if a feature is enabled, optionally for a specific doctor.
 *
 * Logic:
 *   - If `enabledDoctorIds` is non-empty → pilot mode: feature is enabled only
 *     for doctors in that list (doctorId required to benefit).
 *   - If `enabledDoctorIds` is empty → fall back to the `enabled` boolean.
 *
 * Cache is intentionally NOT used here because per-doctor checks must be
 * accurate for access-control decisions.
 */
export async function isFeatureEnabled(key: string, doctorId?: string): Promise<boolean> {
  const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
  if (!flag) return false;
  if (doctorId && Array.isArray(flag.enabledDoctorIds) && flag.enabledDoctorIds.length > 0) {
    return flag.enabledDoctorIds.includes(doctorId);
  }
  return flag.enabled;
}
