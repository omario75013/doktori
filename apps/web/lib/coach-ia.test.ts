import { describe, it, expect, beforeEach, vi } from "vitest";
import RedisMock from "ioredis-mock";

// "server-only" throws outside of an RSC build pipeline; stub it in tests.
vi.mock("server-only", () => ({}));

// Mock ioredis with ioredis-mock so cache.ts (transitively imported by
// coach-ia.ts) uses the in-memory impl.
vi.mock("ioredis", () => ({ default: RedisMock }));

// Set env vars BEFORE importing the module under test (env is read eagerly
// in some helpers).
process.env.REDIS_URL = "redis://localhost:6379";
process.env.OPENROUTER_MAX_DAILY_COST_USD = "5";

// Late import so the mocks + env are in place.
const coachIa = await import("./coach-ia");
const cache = await import("./cache");
const {
  buildSystemPrompt,
  checkRateLimit,
  checkGlobalRateLimit,
  checkCostCap,
  estimateCost,
} = coachIa;
const { redis } = cache;

beforeEach(async () => {
  await redis.flushall();
});

describe("buildSystemPrompt", () => {
  it("contains SAMU 190 + pompiers 198 redirect", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("190");
    expect(prompt).toContain("198");
  });

  it("contains the available specialties (cardiologue, pediatre, ...)", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("cardiologue");
    expect(prompt).toContain("pediatre");
  });

  it("contains the diagnosis prohibition verbatim", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Ne jamais poser de diagnostic");
  });

  it("contains the medication prohibition verbatim", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Ne jamais conseiller de médicament");
  });
});

describe("checkRateLimit (per patient)", () => {
  it("allows the first 10 calls within 24h for the same patient", async () => {
    for (let i = 0; i < 10; i++) {
      const ok = await checkRateLimit("patient-1");
      expect(ok).toBe(true);
    }
  });

  it("rejects the 11th call within 24h for the same patient", async () => {
    for (let i = 0; i < 10; i++) {
      await checkRateLimit("patient-1");
    }
    const eleventh = await checkRateLimit("patient-1");
    expect(eleventh).toBe(false);
  });

  it("isolates counters per patient", async () => {
    for (let i = 0; i < 10; i++) {
      await checkRateLimit("patient-1");
    }
    // Different patient — fresh counter, must succeed.
    const ok = await checkRateLimit("patient-2");
    expect(ok).toBe(true);
  });
});

describe("checkGlobalRateLimit", () => {
  it("returns true while under 1000 messages today", async () => {
    for (let i = 0; i < 5; i++) {
      const ok = await checkGlobalRateLimit();
      expect(ok).toBe(true);
    }
  });

  it("returns false once the global cap is exceeded", async () => {
    // Simulate 1000 prior calls by setting the counter directly.
    const today = new Date().toISOString().slice(0, 10);
    await redis.set(`coach_ia:rate:global:${today}`, "1000");

    const next = await checkGlobalRateLimit();
    expect(next).toBe(false);
  });
});

describe("estimateCost", () => {
  it("computes Kimi K2 pricing for 1000 input + 500 output tokens", () => {
    const cost = estimateCost(1000, 500);
    // 1000 * 0.0000004 + 500 * 0.000002 = 0.0004 + 0.001 = 0.0014
    expect(cost).toBeCloseTo(0.0014, 6);
  });

  it("returns 0 for (0, 0)", () => {
    expect(estimateCost(0, 0)).toBe(0);
  });
});

describe("checkCostCap", () => {
  it("returns true while daily cost counter is below cap", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await redis.set(`coach_ia:cost:${today}`, "1.50");
    const ok = await checkCostCap();
    expect(ok).toBe(true);
  });

  it("returns false once daily cost counter reaches cap", async () => {
    const today = new Date().toISOString().slice(0, 10);
    // OPENROUTER_MAX_DAILY_COST_USD=5
    await redis.set(`coach_ia:cost:${today}`, "5.01");
    const ok = await checkCostCap();
    expect(ok).toBe(false);
  });
});
