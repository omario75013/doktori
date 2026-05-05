import "server-only";
import Redis from "ioredis";
import superjson from "superjson";

// In dev, Next.js HMR re-imports this module on every edit which leaks Redis
// clients — each new client opens its own connection. Keep a single instance
// per process. (Same pattern as packages/db/src/client.ts for postgres.)
const globalForRedis = globalThis as unknown as { __doktoriRedis?: Redis };

function makeClient(): Redis {
  return new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false, // commands fail fast when offline → fall-through
    connectTimeout: 1000,
    commandTimeout: 200,
  });
}

export const redis = globalForRedis.__doktoriRedis ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForRedis.__doktoriRedis = redis;

const debug = process.env.CACHE_DEBUG === "1";

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit !== null) {
      if (debug) console.log(`[cache] HIT key=${key}`);
      return superjson.parse<T>(hit);
    }
    if (debug) console.log(`[cache] MISS key=${key}`);
  } catch (e) {
    console.warn(`[cache] read fail for ${key}:`, e);
    return fn(); // fall-through, do not even attempt to write
  }

  const value = await fn();
  try {
    await redis.setex(key, ttlSeconds, superjson.stringify(value));
  } catch (e) {
    console.warn(`[cache] write fail for ${key}:`, e);
  }
  return value;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (e) {
    console.warn(`[cache] invalidate fail for ${keys.join(",")}:`, e);
  }
}

export async function invalidateDoctor(
  doctorId: string,
  slug: string,
): Promise<void> {
  await invalidate(
    `doctor:slug:${slug}`,
    `doctor:schedule:${doctorId}`,
    `doctor:apptTypes:${doctorId}`,
  );
}
