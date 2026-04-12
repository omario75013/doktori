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
