import { describe, it, expect, beforeEach, vi } from "vitest";
import RedisMock from "ioredis-mock";

// "server-only" throws outside of an RSC build pipeline; stub it in tests.
vi.mock("server-only", () => ({}));

// Mock ioredis with ioredis-mock so cache.ts uses the in-memory impl.
vi.mock("ioredis", () => ({ default: RedisMock }));

// Set REDIS_URL before importing cache.ts (which reads process.env.REDIS_URL eagerly).
process.env.REDIS_URL = "redis://localhost:6379";

// Late import so the mock is in place.
const cacheModule = await import("./cache");
const { cached, invalidate, invalidateDoctor, redis } = cacheModule;

// ioredis-mock honors lazyConnect+enableOfflineQueue, so we must connect
// explicitly before issuing commands in the test environment. (Real ioredis
// auto-connects on first command, but the mock does not.)
await redis.connect();

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
