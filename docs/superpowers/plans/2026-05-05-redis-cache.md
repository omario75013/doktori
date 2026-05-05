# Doktori Phase 2 #21 — Redis cache implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin Redis caching layer in front of three hot doctor DB queries, with a hard guarantee that Redis being unavailable never produces an HTTP 5xx.

**Architecture:** Single `apps/web/lib/cache.ts` module exposing `cached(key, ttl, fn)` + `invalidate(...keys)` + `invalidateDoctor(id, slug)`. Uses `ioredis` with fail-fast settings (`commandTimeout: 200ms`, `enableOfflineQueue: false`, lazy connect). Serializes with `superjson` to preserve `Date` instances. New `redis:7-alpine` Docker service on prod, password from 1Password vault, internal-only on `dartank-network`. Wrapping is opt-in at the call site (option α — `packages/db` stays Redis-free).

**Tech Stack:** Next.js 16 App Router · Drizzle ORM · ioredis · superjson · vitest · ioredis-mock · Docker Compose · 1Password CLI (`op`).

**Spec:** `docs/superpowers/specs/2026-05-05-redis-cache-design.md` (HEAD `6e4c4d5`).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `apps/web/lib/cache.ts` | **Create** | Redis singleton + `cached` / `invalidate` / `invalidateDoctor` API. ~80 lines, `import "server-only"`. |
| `apps/web/lib/cache.test.ts` | **Create** | Vitest unit tests using `ioredis-mock`. 9 scenarios per spec. |
| `apps/web/package.json` | Modify | Add deps: `ioredis`, `superjson`. Dev dep: `ioredis-mock`. |
| `apps/web/app/(patient)/medecin/[slug]/page.tsx` | Modify | Wrap 3 query calls with `cached(...)`. |
| `apps/web/app/api/schedules/route.ts` | Modify | Add `await invalidate('doctor:schedule:' + doctorId)` after `upsertSchedule`. |
| Other doctor mutation handlers (TBD by Task 9 grep) | Modify | Call `invalidateDoctor(doctorId, slug)` after each mutation. |
| `docker-compose.prod.yml` | Modify | Add `redis` service block + wire `doktori-web.depends_on` + `REDIS_URL` env. |
| `/opt/doktori/.env.tpl` (on prod via SSH) | Modify | Add `REDIS_PASSWORD=op://Dartank-Infra/Doktori Prod/REDIS_PASSWORD`. |

---

## Pre-flight (5 min)

### Task 0: Verify Next.js 16 patterns are unchanged

`apps/web/AGENTS.md` warns: "This is NOT the Next.js you know — read the relevant guide in `node_modules/next/dist/docs/`". The patterns we rely on (`import "server-only"`, `globalThis` singleton in dev) need a quick sanity check before we lock them into the wrapper.

- [ ] **Step 1: Confirm `server-only` package is still the recommended SSR-only marker**

```bash
cd ~/dev/doktori
ls apps/web/node_modules/server-only/ 2>&1 | head -3
grep -rn '"server-only"' apps/web/node_modules/next/dist/docs/ 2>/dev/null | head -3
```
Expected: `server-only` package present; mentioned in Next.js 16 docs as the canonical way to prevent client bundling.

- [ ] **Step 2: Confirm `globalThis` singleton dev pattern still works in Next.js 16 HMR**

```bash
grep -rn "globalThis" apps/web/node_modules/next/dist/docs/ 2>/dev/null | head -5
```
Expected: pattern referenced in dev guidance, OR no contraindication. If Next.js 16 introduces a new "server module" lifecycle that makes `globalThis` redundant, capture the new idiom and update the spec before continuing.

If both checks confirm the pre-existing patterns, proceed. If anything has changed, **stop and update the spec**.

---

## Implementation tasks

### Task 1: Add dependencies

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install runtime deps**

```bash
cd ~/dev/doktori/apps/web
pnpm add ioredis superjson
```
Expected: lockfile updated, both deps appear under `dependencies` in `apps/web/package.json`.

- [ ] **Step 2: Install dev dep for tests**

```bash
pnpm add -D ioredis-mock @types/ioredis-mock
```
Expected: both appear under `devDependencies`. `@types/ioredis-mock` may not exist on npm — if `pnpm add` fails for the types package, drop it; `ioredis-mock` ships its own types since v8.

- [ ] **Step 3: Confirm versions**

```bash
grep -E '"ioredis"|"superjson"|"ioredis-mock"' apps/web/package.json
```
Expected: three lines, modern versions (`ioredis ^5.x`, `superjson ^2.x`, `ioredis-mock ^8.x`).

- [ ] **Step 4: Commit**

```bash
git -C ~/dev/doktori add apps/web/package.json pnpm-lock.yaml
git -C ~/dev/doktori commit -m "$(cat <<'EOF'
chore(web): add ioredis, superjson, ioredis-mock for cache layer

Phase 2 #21 — Redis cache wrapper deps. ioredis for client (fail-fast
config), superjson for Date round-trip, ioredis-mock for unit tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Write failing tests for `cached` (TDD red)

**Files:**
- Create: `apps/web/lib/cache.test.ts`

- [ ] **Step 1: Write the test file**

Create `apps/web/lib/cache.test.ts` with the contents below. Vitest config picks up `lib/**/*.test.ts` in `apps/web/vitest.config.ts`. Note: we mock `ioredis` at module level so the wrapper's import of `Redis from "ioredis"` resolves to the mock.

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import RedisMock from "ioredis-mock";

// Mock ioredis with ioredis-mock so cache.ts uses the in-memory impl.
vi.mock("ioredis", () => ({ default: RedisMock }));

// Set REDIS_URL before importing cache.ts (which reads process.env.REDIS_URL eagerly).
process.env.REDIS_URL = "redis://localhost:6379";

// Late import so the mock is in place.
const cacheModule = await import("./cache");
const { cached, invalidate, invalidateDoctor, redis } = cacheModule;

beforeEach(async () => {
  await redis.flushall();
});

describe("cached", () => {
  it("calls fn on miss and stores the result", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "1", name: "Dr. X" });
    const v = await cached("doctor:slug:x", 60, fn);
    expect(v).toEqual({ id: "1", name: "Dr. X" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns cached value on hit without calling fn", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "1", name: "Dr. X" });
    await cached("doctor:slug:x", 60, fn);
    fn.mockClear();
    const v = await cached("doctor:slug:x", 60, fn);
    expect(v).toEqual({ id: "1", name: "Dr. X" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("falls through to fn when redis read throws", async () => {
    const spy = vi.spyOn(redis, "get").mockRejectedValueOnce(new Error("boom"));
    const fn = vi.fn().mockResolvedValue({ id: "fallback" });
    const v = await cached("doctor:slug:x", 60, fn);
    expect(v).toEqual({ id: "fallback" });
    expect(fn).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("returns fn result even when redis write throws", async () => {
    const spy = vi.spyOn(redis, "setex").mockRejectedValueOnce(new Error("boom"));
    const fn = vi.fn().mockResolvedValue({ id: "ok" });
    const v = await cached("doctor:slug:x", 60, fn);
    expect(v).toEqual({ id: "ok" });
    spy.mockRestore();
  });

  it("passes the correct ttl to setex", async () => {
    const spy = vi.spyOn(redis, "setex");
    await cached("doctor:slug:x", 300, async () => ({ id: "1" }));
    expect(spy).toHaveBeenCalledWith("doctor:slug:x", 300, expect.any(String));
    spy.mockRestore();
  });

  it("round-trips Date instances via superjson", async () => {
    const created = new Date("2026-05-05T10:00:00.000Z");
    const fn = vi.fn().mockResolvedValue({ id: "1", createdAt: created });

    await cached("doctor:slug:x", 60, fn);
    fn.mockClear();
    const v = await cached<{ id: string; createdAt: Date }>("doctor:slug:x", 60, fn);

    expect(v.createdAt).toBeInstanceOf(Date);
    expect(v.createdAt.getTime()).toBe(created.getTime());
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("invalidate", () => {
  it("removes a single key", async () => {
    await cached("doctor:slug:a", 60, async () => "A");
    await invalidate("doctor:slug:a");
    const fn = vi.fn().mockResolvedValue("re-fetched");
    const v = await cached("doctor:slug:a", 60, fn);
    expect(v).toBe("re-fetched");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("removes multiple keys at once", async () => {
    await cached("a", 60, async () => "A");
    await cached("b", 60, async () => "B");
    await invalidate("a", "b");
    expect(await redis.get("a")).toBeNull();
    expect(await redis.get("b")).toBeNull();
  });
});

describe("invalidateDoctor", () => {
  it("purges slug, schedule, and apptTypes keys for a doctor", async () => {
    await cached("doctor:slug:smith", 60, async () => "slug");
    await cached("doctor:schedule:doc-1", 60, async () => "sched");
    await cached("doctor:apptTypes:doc-1", 60, async () => "types");

    await invalidateDoctor("doc-1", "smith");

    expect(await redis.get("doctor:slug:smith")).toBeNull();
    expect(await redis.get("doctor:schedule:doc-1")).toBeNull();
    expect(await redis.get("doctor:apptTypes:doc-1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests, expect fail**

```bash
cd ~/dev/doktori/apps/web
pnpm test cache.test
```
Expected: ALL tests fail with module resolution error: `Cannot find module './cache'` or similar. This is the "red" state of TDD.

---

### Task 3: Implement `cache.ts` (TDD green)

**Files:**
- Create: `apps/web/lib/cache.ts`

- [ ] **Step 1: Write the implementation**

Create `apps/web/lib/cache.ts`:

```ts
import "server-only";
import Redis from "ioredis";
import superjson from "superjson";

// Singleton: prevent connection leaks during Next.js HMR in dev.
// In production each Node process imports this once; the global cache is
// a no-op there, so we skip storing it. Comment kept for future maintainers.
const globalForRedis = globalThis as unknown as { _redis?: Redis };

function makeClient(): Redis {
  return new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false, // commands fail fast when offline → fall-through
    connectTimeout: 1000,
    commandTimeout: 200,
  });
}

export const redis = globalForRedis._redis ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForRedis._redis = redis;

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
```

- [ ] **Step 2: Run tests, expect pass**

```bash
cd ~/dev/doktori/apps/web
pnpm test cache.test
```
Expected: all 9 tests pass. If a test fails, fix the implementation — DO NOT lower the bar of the test.

- [ ] **Step 3: Commit**

```bash
git -C ~/dev/doktori add apps/web/lib/cache.ts apps/web/lib/cache.test.ts
git -C ~/dev/doktori commit -m "$(cat <<'EOF'
feat(web): add cache.ts wrapper with fail-fast Redis client

Phase 2 #21 — exposes cached(key, ttl, fn) + invalidate(...) +
invalidateDoctor(id, slug). Uses superjson for Date round-trip.
ioredis with commandTimeout 200ms + enableOfflineQueue:false guarantees
Redis-down never produces 5xx — falls through to fn() silently.

9 unit tests covering hit/miss, fail-soft on read+write errors, ttl
arg correctness, Date round-trip regression, and invalidation paths.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wrap the read site

**Files:**
- Modify: `apps/web/app/(patient)/medecin/[slug]/page.tsx`

- [ ] **Step 1: Read current file to identify the three calls**

```bash
grep -n "getDoctorBySlug\|getDoctorSchedule\|getDoctorAppointmentTypes" \
  apps/web/app/\(patient\)/medecin/\[slug\]/page.tsx
```
Expected: at least 4 matches. `getDoctorBySlug` is called **twice** in this file — once in `generateMetadata` (around line 138) and once in the page component (around line 173). **Both calls must be wrapped** — wrapping only one defeats half the cache benefit and is a common copy-paste oversight.

- [ ] **Step 2: Edit the file**

For each `await getDoctorBySlug(slug)` call, replace with:
```ts
const doctor = await cached(`doctor:slug:${slug}`, 300, () => getDoctorBySlug(slug));
```

For each `await getDoctorSchedule(doctorId)` call, replace with:
```ts
const schedule = await cached(`doctor:schedule:${doctorId}`, 3600, () => getDoctorSchedule(doctorId));
```

For each `await getDoctorAppointmentTypes(doctorId)` call:
```ts
const apptTypes = await cached(`doctor:apptTypes:${doctorId}`, 3600, () => getDoctorAppointmentTypes(doctorId));
```

Add the import at the top of the file (after existing imports):
```ts
import { cached } from "@/lib/cache";
```

- [ ] **Step 3: Run typecheck on web**

```bash
cd ~/dev/doktori/apps/web
pnpm tsc --noEmit 2>&1 | head -20
```
Expected: zero errors related to `cache.ts` or the wrapped calls.

- [ ] **Step 4: Commit**

```bash
git -C ~/dev/doktori add apps/web/app/\(patient\)/medecin/\[slug\]/page.tsx
git -C ~/dev/doktori commit -m "$(cat <<'EOF'
perf(patient): cache 3 doctor queries on /medecin/[slug] page

Wraps getDoctorBySlug (5min), getDoctorSchedule (1h), and
getDoctorAppointmentTypes (1h) with the new cache layer. All three
queries originate from the same page; a single file change covers them.

Phase 2 #21.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Wire schedule invalidation

**Files:**
- Modify: `apps/web/app/api/schedules/route.ts`

- [ ] **Step 1: Read current file**

```bash
grep -n "upsertSchedule\|export" apps/web/app/api/schedules/route.ts
```
Expected: a `PUT` (or `POST`) handler that calls `await upsertSchedule(t.id, slots, practiceId)` (per spec, this is the only schedule mutation entry point).

- [ ] **Step 2: Edit handler**

After the `upsertSchedule` call succeeds, add:
```ts
import { invalidate } from "@/lib/cache";
// ...inside the handler, after upsertSchedule resolves:
// IMPORTANT: use the actual variable name from the handler — confirm via Step 1 grep.
// As of 2026-05-05 the variable holding the doctor id is `user.id` (after the requireAuth call),
// not `t.id` as a placeholder might suggest:
await invalidate(`doctor:schedule:${user.id}`);
```

- [ ] **Step 3: Typecheck**

```bash
cd ~/dev/doktori/apps/web
pnpm tsc --noEmit 2>&1 | head -10
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git -C ~/dev/doktori add apps/web/app/api/schedules/route.ts
git -C ~/dev/doktori commit -m "$(cat <<'EOF'
fix(api/schedules): invalidate cached schedule after upsert

Without this, doctors see up-to-1h-stale schedule on /medecin/[slug]
after editing their hours. Direct key invalidation per spec strategy A.

Phase 2 #21.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Discover and wire remaining mutation sites

The spec confirmed one mutation site (Task 5). Four others are flagged but not located: doctor portal "Mon profil", doctor portal "Mes consultations" (apptTypes), admin doctor edit, admin doctor verify. **DO NOT skip this task** — missing invalidation = stale data up to 5 min/1 h.

**Files:**
- Modify: 1-4 additional handler files (paths to be discovered).

- [ ] **Step 1: Locate doctor profile mutations**

```bash
cd ~/dev/doktori
# Search for handlers that mutate the doctors table
grep -rln "db\.update(doctors)\|db\.update(schema\.doctors)" apps/web --include="*.ts" --include="*.tsx" 2>/dev/null
# Also: actions/server actions touching doctor profile
grep -rln "update.*doctor\|updateDoctorProfile\|verifyDoctor" apps/web/app --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules
```
Expected: a handful of files under `apps/web/app/(medecin)/profil/`, `apps/web/app/(admin)/admin/medecins/`, possibly `apps/web/app/api/doctor/...`.

- [ ] **Step 2: Locate appointment-type mutations**

```bash
grep -rln "appointmentTypes\|appointment_types" apps/web/app --include="*.ts" --include="*.tsx" 2>/dev/null | xargs grep -l "db\.update\|db\.insert\|upsert" 2>/dev/null
```

- [ ] **Step 3: For each handler found, add invalidation after the mutation**

Pattern: at the end of the mutation block (after the DB write succeeds), add:
```ts
import { invalidateDoctor } from "@/lib/cache";
// ...
await invalidateDoctor(doctorId, slug); // both id and slug must be in scope
```

If only `doctorId` is available (e.g. admin verify), and the slug requires a separate lookup, prefer the cheaper:
```ts
import { invalidate } from "@/lib/cache";
await invalidate(`doctor:schedule:${doctorId}`, `doctor:apptTypes:${doctorId}`);
```
…and let the `doctor:slug:` key TTL out (5 min) rather than fetching the slug just to invalidate.

- [ ] **Step 4: Document discovered sites**

Add a short comment block at the top of `apps/web/lib/cache.ts` listing the call sites that invalidate, so future maintainers can audit:
```ts
/**
 * Cached queries (read sites):
 * - apps/web/app/(patient)/medecin/[slug]/page.tsx
 *
 * Invalidation call sites (mutation sites):
 * - apps/web/app/api/schedules/route.ts (PUT)
 * - <list discovered files here>
 */
```

- [ ] **Step 5: Typecheck + run tests**

```bash
cd ~/dev/doktori/apps/web
pnpm tsc --noEmit && pnpm test
```
Expected: zero TS errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git -C ~/dev/doktori add apps/web/
git -C ~/dev/doktori commit -m "$(cat <<'EOF'
fix(web): invalidate doctor cache on N additional mutation sites

Wires invalidateDoctor / invalidate calls into the doctor profile,
appointment-type, and admin doctor handlers discovered via grep.
Documented exhaustive call-site list at top of lib/cache.ts.

Phase 2 #21.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Add `redis` service to `docker-compose.prod.yml`

**Files:**
- Modify: `docker-compose.prod.yml`

- [ ] **Step 1: Read current file**

```bash
cat ~/dev/doktori/docker-compose.prod.yml
```
Expected: single `doktori-web` service block + `dartman-network` external network. Note exact indentation style (2 spaces in Doktori repo).

- [ ] **Step 2: Add the `redis` service block and update `doktori-web`**

Replace the file contents with the version below. **Preserve any existing fields on `doktori-web` that aren't shown here** — only add `depends_on` and the `REDIS_URL` env var.

```yaml
services:
  doktori-web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: doktori-web
    ports:
      - "3005:3000"
    env_file: .env
    environment:
      - TZ=Africa/Tunis
      - REDIS_URL=redis://:${REDIS_PASSWORD}@doktori-redis:6379
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - dartank-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://0.0.0.0:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

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

networks:
  dartank-network:
    external: true

volumes:
  redis-data:
```

- [ ] **Step 3: Validate YAML locally**

```bash
cd ~/dev/doktori
docker compose -f docker-compose.prod.yml config 2>&1 | head -40
```
Expected: parses without error and prints the rendered config. The `${REDIS_PASSWORD}` substitution will warn (variable not set on Mac) — that's fine, it's set on prod via `.env`.

- [ ] **Step 4: Commit**

```bash
git -C ~/dev/doktori add docker-compose.prod.yml
git -C ~/dev/doktori commit -m "$(cat <<'EOF'
feat(infra): add redis:7-alpine service to prod compose

256mb LRU eviction, AOF persistence, internal-only on dartank-network.
doktori-web waits for redis healthcheck before starting.

Phase 2 #21.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Local validation — full build + tests

**Files:** none modified.

- [ ] **Step 1: Run unit tests**

```bash
cd ~/dev/doktori/apps/web
pnpm test
```
Expected: all tests pass, no warnings about Redis (the mock should handle everything).

- [ ] **Step 2: Run full typecheck across the workspace**

```bash
cd ~/dev/doktori
pnpm --filter web tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Run a production build to catch SSR/server-only issues**

```bash
cd ~/dev/doktori
pnpm --filter web build 2>&1 | tail -30
```
Expected: build succeeds; no errors about importing `server-only` from a client component.

If the build fails because a client component accidentally imported something from `lib/cache.ts`, the failure is the desired safety net — fix the offending import to use only what's needed (server actions only, etc.) and rerun.

---

### Task 9: Snyk scan

Per global CLAUDE.md: any new code in a Snyk-supported language must be scanned and remediated.

- [ ] **Step 1: Scan modified TypeScript files**

```bash
# Use the snyk_code_scan tool with arguments:
# absolute_path: /Users/omario/dev/doktori
# Optionally narrow with paths to the new/modified files.
```

In Claude Code, invoke `mcp__Snyk__snyk_code_scan` against `/Users/omario/dev/doktori` (or the specific files if the tool supports it).
Expected: clean, or only Low-severity issues that the team accepts.

- [ ] **Step 2: Fix any High/Critical findings**

If the scanner flags anything in `cache.ts` or the wrapped call sites, fix it before the deploy. Common false positives (no-op): "use of `process.env` directly". Real concerns to address: anything around `superjson` deserialization that touches user input.

- [ ] **Step 3: Re-scan to confirm clean**

Re-run the scan. Commit only after the result is acceptable.

---

### Task 10: Generate `REDIS_PASSWORD` and store in 1Password

This task is performed on the local Mac (which has `op` configured) and requires write access to the `Dartank-Infra` vault.

- [ ] **Step 1: Generate URL-safe password**

```bash
NEW_PWD=$(openssl rand -hex 32)
echo "Generated: $NEW_PWD"   # 64 hex chars, all URL-safe
```
Expected: 64-character hexadecimal string. **Do not** use `-base64`; `+/=` chars break the `redis://` URL.

- [ ] **Step 2: Add as a field on the existing `Doktori Prod` 1Password item**

```bash
op item edit "Doktori Prod" --vault Dartank-Infra "REDIS_PASSWORD[password]=$NEW_PWD"
```
Expected: confirmation that the item was updated. (If the item ID differs, use `op item list --vault Dartank-Infra | grep -i doktori` first.)

- [ ] **Step 3: Verify retrieval**

```bash
op read "op://Dartank-Infra/Doktori Prod/REDIS_PASSWORD"
```
Expected: prints the same 64-char hex string. **Clear your terminal scrollback after** to avoid persisting the password in shell history files.

---

### Task 11: Update prod `.env.tpl` to reference REDIS_PASSWORD

**Files:**
- Modify: `/opt/doktori/.env.tpl` (on prod via SSH).

- [ ] **Step 1: Add the line on prod**

```bash
ssh root@157.90.152.204 'echo "REDIS_PASSWORD=op://Dartank-Infra/Doktori Prod/REDIS_PASSWORD" >> /opt/doktori/.env.tpl && tail -3 /opt/doktori/.env.tpl'
```
Expected: last line confirms the new entry. The other entries follow the same `op://Dartank-Infra/Doktori Prod/...` convention.

- [ ] **Step 2: Inject to materialize the new `.env`**

```bash
ssh root@157.90.152.204 '
  source /etc/profile.d/op-service-account.sh
  op inject -i /opt/doktori/.env.tpl -o /opt/doktori/.env
  chmod 600 /opt/doktori/.env
  grep -c REDIS_PASSWORD /opt/doktori/.env
'
```
Expected: `1` (one line containing REDIS_PASSWORD now in `.env`). The actual password value should not be printed.

- [ ] **Step 3: Sync .env.tpl change back to local repo**

The Mac copy of `.env.tpl` (if checked in) should match. Verify whether `.env.tpl` is tracked locally:

```bash
cd ~/dev/doktori
git ls-files | grep env.tpl
```

If tracked, mirror the prod change locally and commit. If not tracked (likely the case — `.env*` patterns are usually gitignored), skip this step.

---

### Task 12: Deploy to prod

Per session learning: `/opt/doktori` is **not a git repo**. Deploy = rsync from Mac + `docker compose build && up -d`. Do NOT use `git pull`. The Jenkinsfile's `git pull` step is broken; ignore it.

- [ ] **Step 1: Backup current prod tree**

```bash
ssh root@157.90.152.204 'mv /opt/doktori /opt/doktori-prev6 && mkdir -p /opt/doktori && chown 501:staff /opt/doktori'
```
Expected: rotation succeeds; `ls /opt/ | grep doktori-prev` includes `doktori-prev6`.

- [ ] **Step 2: Rsync code (excluding build artefacts and prod-only files we'll restore)**

```bash
rsync -avz \
  --exclude=node_modules --exclude=.next --exclude=.git \
  --exclude='tmp-*.png' --exclude='tmp-*.log' --exclude='tmp-*.sql' --exclude='tmp-*.txt' --exclude='tmp-*.jsx' \
  --exclude='bugreport-*.zip' --exclude=cookies.txt --exclude=.DS_Store \
  --exclude=.playwright-mcp --exclude=.claire --exclude=.claude-flow \
  --exclude=docs/lighthouse-reports \
  ~/dev/doktori/ root@157.90.152.204:/opt/doktori/ 2>&1 | tail -5
```
Expected: ~1500-2000 files transferred, ~20MB total, completes within ~1 min.

- [ ] **Step 3: Restore prod-only files**

```bash
ssh root@157.90.152.204 '
  cp /opt/doktori-prev6/.env /opt/doktori/.env
  cp /opt/doktori-prev6/.env.tpl /opt/doktori/.env.tpl
  chmod 600 /opt/doktori/.env
  cp -r /opt/doktori-prev6/backups /opt/doktori/
  if [ -f /opt/doktori-prev6/apply-migrations-prod.sh ]; then
    cp /opt/doktori-prev6/apply-migrations-prod.sh /opt/doktori/
    chmod +x /opt/doktori/apply-migrations-prod.sh
  fi
  ls -la /opt/doktori/.env /opt/doktori/.env.tpl /opt/doktori/backups | head -10
'
```
Expected: `.env` (mode 600), `.env.tpl`, `backups/` all present in `/opt/doktori/`.

- [ ] **Step 4: Build + up**

```bash
ssh root@157.90.152.204 '
  cd /opt/doktori
  docker compose -f docker-compose.prod.yml build 2>&1 | tail -20
  echo "===BUILD_DONE==="
  docker compose -f docker-compose.prod.yml up -d 2>&1 | tail -10
'
```
Expected: build completes (~10-15 min, can monitor with @Monitor). `up -d` shows `doktori-redis Started` and `doktori-web Started`. Be patient: the new `doktori-web` container waits on the redis healthcheck (up to ~30s after redis is up).

- [ ] **Step 5: Confirm container state**

```bash
ssh root@157.90.152.204 'docker ps --filter name=doktori --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"'
```
Expected: both `doktori-web` and `doktori-redis` show `Up X seconds (healthy)`.

---

### Task 13: Post-deploy verification

- [ ] **Step 1: Sanity-check page response**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}, time=%{time_total}s\n" https://doktori.tn/medecin/<some-real-slug>
```
Replace `<some-real-slug>` with a known doctor slug. First call: cold cache → expect ~250ms+. Hit it again immediately: warm cache → expect <100ms server time. Run 3-5 times to feel the difference.

- [ ] **Step 2: Confirm cache keys exist in Redis**

```bash
ssh root@157.90.152.204 '
  PWD=$(grep REDIS_PASSWORD /opt/doktori/.env | cut -d= -f2)
  docker exec doktori-redis redis-cli -a "$PWD" KEYS "doctor:*" 2>/dev/null
'
```
Expected: 1-3 keys per recently-visited doctor, e.g. `doctor:slug:dr-smith`, `doctor:schedule:abc-123`, `doctor:apptTypes:abc-123`.

- [ ] **Step 3: Chaos test — kill Redis, confirm app still serves**

```bash
ssh root@157.90.152.204 'docker stop doktori-redis'
sleep 5
curl -s -o /dev/null -w "HTTP %{http_code}, time=%{time_total}s\n" https://doktori.tn/medecin/<some-real-slug>
ssh root@157.90.152.204 'docker start doktori-redis'
```
Expected: page responds **HTTP 200**, perhaps slightly slower (no cache, falls through to DB). If you see HTTP 5xx, the fail-soft guarantee is broken — investigate `cache.ts` immediately, do not roll forward.

- [ ] **Step 4: Re-run Lighthouse on `/medecin/[slug]`**

```bash
mkdir -p ~/dev/doktori/docs/lighthouse-reports/2026-05-05-redis-cache
cd ~/dev/doktori/docs/lighthouse-reports/2026-05-05-redis-cache
SLUG=<real-slug>
lighthouse "https://doktori.tn/medecin/$SLUG" \
  --output=json \
  --output-path=./medecin.json \
  --quiet \
  --chrome-flags="--headless=new --disable-gpu --no-sandbox"

node -e "
const r = require('./medecin.json');
console.log('Perf score:', r.categories.performance.score);
console.log('FCP:', r.audits['first-contentful-paint'].displayValue);
console.log('LCP:', r.audits['largest-contentful-paint'].displayValue);
console.log('TTFB:', r.audits['server-response-time'].displayValue);
"
```
Expected: TTFB drops measurably vs the baseline Lighthouse run from earlier today. Capture the numbers in the eventual session-end note.

- [ ] **Step 5: Update the spec status**

```bash
sed -i.bak "s/Status\*\* : Spec validated, awaiting review and implementation plan/Status** : Implemented and deployed/" \
  ~/dev/doktori/docs/superpowers/specs/2026-05-05-redis-cache-design.md
rm ~/dev/doktori/docs/superpowers/specs/2026-05-05-redis-cache-design.md.bak
git -C ~/dev/doktori add docs/superpowers/specs/2026-05-05-redis-cache-design.md
git -C ~/dev/doktori commit -m "$(cat <<'EOF'
docs(phase-2): mark redis cache spec as implemented

Phase 2 #21 deployed to prod, chaos test passed, Lighthouse re-run
captured improvement.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Push to origin/main**

```bash
git -C ~/dev/doktori push origin main
```
Expected: clean push (no rebase needed if no one else committed in the meantime).

---

## Rollback procedure (if anything goes south)

1. `ssh root@157.90.152.204 'cd /opt/doktori && docker compose -f docker-compose.prod.yml down'`
2. `ssh root@157.90.152.204 'mv /opt/doktori /opt/doktori-failed-redis && mv /opt/doktori-prev6 /opt/doktori'`
3. `ssh root@157.90.152.204 'cd /opt/doktori && docker compose -f docker-compose.prod.yml up -d'`
4. Confirm prev image is back up: `docker ps --filter name=doktori-web`.
5. `git -C ~/dev/doktori revert HEAD~N..HEAD` for the deploy commits, push.

The redis container can be left running on prod even after rollback — it's harmless without app traffic.

---

## Acceptance — close the loop

When all 13 tasks are checked off and Task 13 Step 6 has been pushed, the spec's Verification Criteria are met:

| Criterion | Met by |
|---|---|
| `cache.ts` API present | Task 3 |
| 3 calls wrapped on /medecin/[slug] | Task 4 |
| Mutation handlers invalidate | Tasks 5, 6 |
| `redis` in `docker-compose.prod.yml` | Task 7 |
| `REDIS_PASSWORD` in 1P + `.env.tpl` | Tasks 10, 11 |
| 9 unit tests pass | Task 3 |
| Snyk clean | Task 9 |
| Lighthouse perf gain | Task 13 Step 4 |
| Chaos test 0×5xx | Task 13 Step 3 |

Total estimated effort: **4–5 hours** (Tasks 0–13 sequential, no parallel runs available because each task gates the next via commits).
