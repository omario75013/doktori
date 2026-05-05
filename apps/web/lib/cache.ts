import "server-only";
/**
 * Cached queries (read sites):
 * - apps/web/app/(patient)/medecin/[slug]/page.tsx
 *   - doctor:slug:{slug}      (TTL 5min)  via getDoctorBySlug
 *   - doctor:schedule:{id}    (TTL 1h)    via getDoctorSchedule
 *   - doctor:apptTypes:{id}   (TTL 1h)    via getDoctorAppointmentTypes
 *
 * Invalidation call sites (mutation sites):
 * Schedule:
 * - apps/web/app/api/schedules/route.ts (PUT)
 * Doctor profile (slug + schedule + apptTypes):
 * - apps/web/app/api/doctor/profile/route.ts (PATCH — name/bio/fees/mode/languages/expertise/yoe)
 * - apps/web/app/api/doctor/profile/parcours/route.ts (POST — educations/experiences/languages/expertise/yoe)
 * - apps/web/app/api/doctor/teleconsult-settings/route.ts (PUT — consultationMode/teleconsultFee)
 * - apps/web/app/api/doctors/photo/route.ts (POST — photoUrl, doctor self)
 * - apps/web/app/api/admin/doctors/[id]/route.ts (PATCH — admin profile edit incl. slug)
 * - apps/web/app/api/admin/doctors/[id]/photo/route.ts (POST + DELETE — photoUrl, admin)
 * Appointment types only:
 * - apps/web/app/api/appointment-types/route.ts (POST — doctor creates motif)
 * - apps/web/app/api/appointment-types/[id]/route.ts (PATCH + DELETE — doctor edits/soft-deletes motif)
 * - apps/web/app/api/admin/doctors/[id]/appointment-types/route.ts (POST — admin creates motif)
 * - apps/web/app/api/admin/doctors/[id]/appointment-types/[typeId]/route.ts (PATCH + DELETE — admin edits/soft-deletes motif)
 */
import Redis from "ioredis";
import superjson from "superjson";

// In dev, Next.js HMR re-imports this module on every edit which leaks Redis
// clients — each new client opens its own connection. Keep a single instance
// per process. (Same pattern as packages/db/src/client.ts for postgres.)
const globalForRedis = globalThis as unknown as { __doktoriRedis?: Redis };

function makeClient(): Redis {
  // No lazyConnect: with `enableOfflineQueue: false`, a command issued before
  // the TCP handshake completes throws "Stream isn't writeable" — the read
  // path then falls through to the DB on every request until the pool warms
  // up. Auto-connect at construction time avoids this; the cost is one
  // handshake at boot. (Discovered in prod 2026-05-05.)
  return new Redis(process.env.REDIS_URL!, {
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
