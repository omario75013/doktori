# Doktori Phase 2 #21 — Redis cache

**Date** : 2026-05-05
**Status** : Spec validated, awaiting review and implementation plan
**Author** : Omar (brainstorm with Claude)
**Phase** : Phase 2 Session 1 (Pass A — code-only items)
**Effort estimate** : 4–5h

## Goal

Reduce p95 latency on Doktori's hot read paths (doctor profile, schedule, appointment types) by introducing a thin Redis caching layer in front of three known DB queries. Target: 200ms → 20ms on cached hits, with a strict guarantee that **Redis being unavailable never produces an HTTP 5xx**.

## Non-goals

- Caching `getCatalogSpecialties` / `getCatalogCities` — these are static TS constants in `packages/shared/src/constants.ts`, no DB hit, caching adds zero value.
- Caching `searchDoctors` — search goes through Meilisearch, which already provides sub-50ms latency. Layering Redis above it adds operational complexity for marginal gain.
- Caching `getAllDoctorSlugs` — used only by sitemap generation, infrequent.
- Generic key-pattern delete / SCAN-based invalidation — three keys are enough to handle by direct invalidation.
- Cache stampede protection (singleflight, lock keys) — the three queries are cheap enough that a brief stampede on cold cache is acceptable.
- Edge / CDN caching — handled separately by Cloudflare (Phase 2 #20).

## Scope

### Cached queries (3)

| Query (location) | Key pattern | TTL | Invalidation triggers |
|---|---|---|---|
| `getDoctorBySlug(slug)` (`packages/db/src/queries/doctors.ts`) | `doctor:slug:{slug}` | 300s (5 min) | admin doctor edit, doctor portal "Mon profil", admin verify doctor |
| `getDoctorSchedule(doctorId)` (`packages/db/src/queries/doctors.ts`) | `doctor:schedule:{doctorId}` | 3600s (1 h) | doctor portal "Mes horaires", admin schedule edit |
| `getDoctorAppointmentTypes(doctorId)` (`packages/db/src/queries/doctors.ts`) | `doctor:apptTypes:{doctorId}` | 3600s (1 h) | doctor portal "Mes consultations", admin appointment-type edit |

### Wrapping pattern: at the call site (option α)

The cache wrapper lives in `apps/web/lib/cache.ts`. The DB queries layer (`packages/db/`) stays framework-agnostic — it is callable from CLI/cron jobs without Redis. Pages and route handlers in `apps/web/app/` opt in explicitly:

```ts
// before — apps/web/app/(patient)/medecin/[slug]/page.tsx
const doctor = await getDoctorBySlug(slug);

// after
import { cached } from "@/lib/cache";
const doctor = await cached(`doctor:slug:${slug}`, 300, () => getDoctorBySlug(slug));
```

Trade-off: each call site must remember to wrap. Mitigated by (a) only three queries are cached, (b) helper constants for keys and TTLs centralised in `lib/cache.ts`.

### Library: ioredis

Selected over `node-redis@v4`:
- More mature retry/reconnect behaviour
- `lazyConnect`, `commandTimeout`, `enableOfflineQueue: false` work as expected for fail-fast semantics
- De-facto choice for Next.js production deployments

### Public API

```ts
// apps/web/lib/cache.ts
import "server-only";

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T>;

export async function invalidate(...keys: string[]): Promise<void>;

export async function invalidateDoctor(doctorId: string, slug: string): Promise<void>;
```

`invalidateDoctor` is a convenience helper that purges all three doctor-related keys at once, since most mutation handlers know both `id` and `slug`.

### Failure mode (hard guarantee)

```ts
export async function cached<T>(key, ttl, fn) {
  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch (e) {
    console.warn(`[cache] read fail for ${key}:`, e);
    return fn(); // fall-through, do not even attempt to write
  }
  const value = await fn();
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (e) {
    console.warn(`[cache] write fail for ${key}:`, e);
  }
  return value;
}
```

When Redis is unreachable:
- `commandTimeout: 200ms` → reads / writes fail fast, never block the request beyond 200ms
- `enableOfflineQueue: false` → no commands queue while disconnected
- Catch + `console.warn` → no error propagates, no Sentry noise
- Application serves all traffic via DB, latency rises but availability is preserved

### Connection lifecycle

```ts
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { _redis?: Redis };

function makeClient(): Redis {
  return new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 1000,
    commandTimeout: 200,
  });
}

export const redis = globalForRedis._redis ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForRedis._redis = redis;
```

The `globalThis` cache prevents connection leaks during Next.js HMR in development. `import "server-only"` guarantees this module never reaches the client bundle.

### Instrumentation

- `CACHE_DEBUG=1` env var → log `[cache] HIT key=...` / `[cache] MISS key=...` to stdout. Off in production by default.
- Exit metrics planned for Phase 2.5: integrate hit/miss counters into the existing `monitor.dartank.com` dashboard.

## Infrastructure

### Docker Compose

Add to `/opt/doktori/docker-compose.prod.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: doktori-redis
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
    restart: unless-stopped
    networks:
      - dartank-network
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3

  doktori-web:
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://:${REDIS_PASSWORD}@doktori-redis:6379

volumes:
  redis-data:
```

- Container is internal-only (no `ports:` exposure). Reachable only by `doktori-web` over the `dartank-network` Docker bridge.
- `maxmemory 256mb` + `allkeys-lru` = LRU eviction if saturated, no risk of OOM kill.
- `appendonly yes` = AOF persistence (recovery on restart).
- `depends_on … service_healthy` ensures `doktori-web` waits for Redis healthcheck before starting.

### Secrets — REDIS_PASSWORD via 1Password

1. Generate: `openssl rand -base64 32`
2. Store: `op://Dartank-Infra/Doktori Prod - REDIS_PASSWORD/password`
3. Add reference to `/opt/doktori/.env.tpl`:
   ```
   REDIS_PASSWORD=op://Dartank-Infra/Doktori Prod - REDIS_PASSWORD/password
   ```
4. `op inject` will populate `/opt/doktori/.env` at deploy time, same flow as existing secrets.
5. `docker compose` reads `${REDIS_PASSWORD}` from `.env` at start.

## Tests

TDD per global CLAUDE.md. Required test files:

### `apps/web/lib/cache.test.ts` (unit)

Using `ioredis-mock` (lighter than spinning a real container in unit tests):

- `cached` returns cached value on hit
- `cached` calls `fn` and stores result on miss
- `cached` returns same value on second call (verifies set worked)
- `cached` falls through to `fn` if Redis read throws
- `cached` returns `fn` value even if Redis write throws
- `cached` respects TTL (advance time + miss)
- `invalidate` removes a single key
- `invalidate` removes multiple keys atomically
- `invalidateDoctor` purges all three doctor keys

### Integration verification (manual, post-deploy)

```bash
# On prod after deploy:
docker exec -it doktori-redis redis-cli -a "$REDIS_PASSWORD" KEYS 'doctor:*'
# Expected: list of doctor:slug:* keys after a few page hits

# Cache miss/hit count via grep:
docker logs doktori-web --since 5m 2>&1 | grep -c '\[cache\] HIT'
docker logs doktori-web --since 5m 2>&1 | grep -c '\[cache\] MISS'
```

## Verification criteria

Spec is satisfied when:

1. `apps/web/lib/cache.ts` exposes `cached`, `invalidate`, `invalidateDoctor` with the signatures above and `import "server-only"`.
2. The three pages/handlers using `getDoctorBySlug`, `getDoctorSchedule`, `getDoctorAppointmentTypes` wrap their calls with `cached(...)`.
3. The five identified mutation handlers (admin doctor edit, doctor portal profile, doctor portal schedule, doctor portal apptTypes, admin verify doctor) call `invalidateDoctor` or `invalidate` with the correct keys.
4. `docker-compose.prod.yml` declares the `redis` service per spec, with healthcheck and `depends_on` wiring.
5. `REDIS_PASSWORD` is generated, stored in 1Password, and referenced in `.env.tpl`.
6. `cache.test.ts` covers the nine scenarios above and passes.
7. Lighthouse re-run on `/medecin/[slug]` after deploy shows perf gain (target: warm cache hit < 100ms server response, vs ~250ms uncached).
8. Killing the Redis container with `docker stop doktori-redis` for 60s does not produce any 5xx — only logs and slower responses.

## Out of scope (explicitly deferred)

- Per-entity versioned keys / SCAN-based invalidation — current scope handles three keys, no need.
- Singleflight / stampede protection — accepted risk for cold cache.
- Edge caching via Cloudflare — Phase 2 #20.
- Hit/miss metrics in monitor.dartank.com dashboard — Phase 2.5.
- Caching mutation responses or computed availability slots — explicitly excluded; availability includes live appointment data and must not be cached.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Mutation handler forgets to invalidate → user sees stale data | TTL bounds staleness (5 min for profile, 1 h for schedule). Acceptable. |
| Redis container OOM | `maxmemory 256mb` + `allkeys-lru` cap memory and evict gracefully. |
| Redis password leak in env logs | `.env` is `chmod 600 root:root` on prod, never committed. |
| Cache key collision across environments | Each environment has its own Redis instance (prod-only for now). If staging is added, prefix keys with `${ENV}:doctor:slug:...`. Out of current scope. |
| Connection pool exhaustion in dev HMR | `globalThis` singleton pattern prevents this. Verified. |
| Old data shape after schema migration | Drizzle migrations infrequent for these three tables. Manual cache flush script (`redis-cli FLUSHDB` from inside the container) is acceptable for emergencies. |

## Implementation order (preview, full plan in writing-plans skill output)

1. Add `ioredis` + `ioredis-mock` to `apps/web` dependencies
2. Write `cache.test.ts` (TDD red)
3. Write `cache.ts` (TDD green)
4. Add `redis` service to `docker-compose.prod.yml`
5. Update `.env.tpl` with `REDIS_PASSWORD` reference
6. Wrap the three queries at their call sites
7. Wire `invalidateDoctor` / `invalidate` into the five mutation handlers
8. Local validation: `pnpm test`, `pnpm --filter web build`
9. Generate REDIS_PASSWORD, store in 1Password
10. Deploy to prod (rsync + docker compose build && up -d)
11. Post-deploy verification per "Verification criteria" above
12. Re-run Lighthouse on `/medecin/[slug]` for perf evidence
