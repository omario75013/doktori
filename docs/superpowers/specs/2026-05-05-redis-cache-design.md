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

### Serialization (Date round-trip)

Drizzle returns rows containing `Date` instances (`createdAt`, `updatedAt`, etc.). Plain `JSON.stringify` → `JSON.parse` loses the `Date` type — it becomes an ISO string, and consumers calling `.getTime()` or comparing with `<` break silently.

Two acceptable approaches:

- **Recommended**: use [`superjson`](https://github.com/blitz-js/superjson) for serialization. Drop-in replacement for JSON, preserves `Date`, `Map`, `Set`, `BigInt`, `undefined`. Adds ~7 KB to the server bundle. Already a common dep in tRPC/Next.js stacks.
- Alternative: hand-write a `revive` step that walks known fields and re-hydrates `new Date(value)`. Brittle — drops the moment we add a new Date column.

**Decision**: superjson. The cache wrapper uses `superjson.stringify` / `superjson.parse` instead of plain JSON.

### Failure mode (hard guarantee)

```ts
import superjson from "superjson";

export async function cached<T>(key, ttl, fn) {
  try {
    const hit = await redis.get(key);
    if (hit !== null) return superjson.parse<T>(hit);
  } catch (e) {
    console.warn(`[cache] read fail for ${key}:`, e);
    return fn(); // fall-through, do not even attempt to write
  }
  const value = await fn();
  try {
    await redis.setex(key, ttl, superjson.stringify(value));
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

The existing `/opt/doktori/.env.tpl` follows the convention `KEY=op://Dartank-Infra/Doktori Prod/FIELD_NAME` (a single "Doktori Prod" item with multiple fields). Verified at session time against `/opt/doktori/.env.tpl` content.

1. Generate **URL-safe** password: `openssl rand -hex 32` (64 hex chars).
   - **Do not use `-base64`**: it produces `+` `/` `=` characters which break the connection URL `redis://:${REDIS_PASSWORD}@doktori-redis:6379`.
2. Add a `REDIS_PASSWORD` field to the existing 1Password item `op://Dartank-Infra/Doktori Prod`.
3. Add to `/opt/doktori/.env.tpl`:
   ```
   REDIS_PASSWORD=op://Dartank-Infra/Doktori Prod/REDIS_PASSWORD
   ```
4. `op inject` populates `/opt/doktori/.env` at deploy time, same flow as `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.
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
- `cached` round-trips a `Date` field correctly via superjson (regression guard against the JSON-only Date-loss bug)
- `invalidate` removes a single key
- `invalidate` removes multiple keys atomically
- `invalidateDoctor` purges all three doctor keys

**TTL note**: `ioredis-mock` does not integrate with Vitest fake timers, so the classic "advance time → key expired" pattern won't work in unit tests. Verify TTL behaviour in integration (manual `redis-cli TTL key` after a `cached` call) rather than in `cache.test.ts`. The unit test suite asserts that the wrapper *passes* the right TTL value to `setex`, not that `setex` actually expires.

### Integration verification (manual, post-deploy)

```bash
# On prod after deploy:
docker exec -it doktori-redis redis-cli -a "$REDIS_PASSWORD" KEYS 'doctor:*'
# Expected: list of doctor:slug:* keys after a few page hits

# Cache miss/hit count via grep:
docker logs doktori-web --since 5m 2>&1 | grep -c '\[cache\] HIT'
docker logs doktori-web --since 5m 2>&1 | grep -c '\[cache\] MISS'
```

## Implementation guidance for the planner

### Confirmed read site (single file)

All three cached queries are called from exactly **one file**:

- `apps/web/app/(patient)/medecin/[slug]/page.tsx` — calls `getDoctorBySlug`, `getDoctorSchedule`, `getDoctorAppointmentTypes`

This means cache wrapping reduces to wrapping three calls in one location. Verified via:
```
grep -rln "getDoctorBySlug\|getDoctorSchedule\|getDoctorAppointmentTypes" apps/web --include="*.ts" --include="*.tsx"
```

### Confirmed mutation sites (planner must verify and complete)

- **Schedule mutation**: `apps/web/app/api/schedules/route.ts` — `PUT` handler calls `upsertSchedule(doctorId, slots, practiceId)`. Add `await invalidate('doctor:schedule:' + doctorId)` after the upsert.

The planner must locate and wire invalidation in these additional sites:
- Doctor portal "Mon profil" — likely under `apps/web/app/(medecin)/profil/`
- Doctor portal "Mes consultations" (appointment types editing)
- Admin doctor edit — likely under `apps/web/app/(admin)/admin/medecins/`
- Admin doctor verify — likely under `apps/web/app/(admin)/admin/medecins/...verification...`

For each, after the DB mutation, call `invalidateDoctor(doctorId, slug)` (the helper purges all three keys at once).

## Verification criteria

Spec is satisfied when:

1. `apps/web/lib/cache.ts` exposes `cached`, `invalidate`, `invalidateDoctor` with the signatures above and `import "server-only"`.
2. The three calls in `apps/web/app/(patient)/medecin/[slug]/page.tsx` are wrapped with `cached(...)`.
3. Mutation handlers (schedule PUT route + the four doctor/admin profile mutation sites the planner identifies) call `invalidateDoctor` or `invalidate` with the correct keys.
4. `docker-compose.prod.yml` declares the `redis` service per spec, with healthcheck and `depends_on` wiring.
5. `REDIS_PASSWORD` is generated, stored in 1Password, and referenced in `.env.tpl`.
6. `cache.test.ts` covers the nine scenarios above and passes.
7. **Snyk scan** (`snyk_code_scan`) passes on `cache.ts` and any modified call site, per global CLAUDE.md.
8. Lighthouse re-run on `/medecin/[slug]` after deploy shows perf gain (target: warm cache hit < 100ms server response, vs ~250ms uncached).
9. Killing the Redis container with `docker stop doktori-redis` for 60s does not produce any 5xx — only logs and slower responses.

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

1. Add `ioredis`, `ioredis-mock`, `superjson` to `apps/web` dependencies
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
