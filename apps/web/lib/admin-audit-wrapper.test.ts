/**
 * Tests for withAdminAudit (Gap 1 wrapper).
 *
 * Run:
 *   pnpm --filter web test admin-audit-wrapper
 *
 * Requires the shared test DB (DATABASE_URL in .env.test). We use admin_users
 * as the resource under test instead of doctors — admin_users is small and
 * its schema is stable across migrations, while the doctors table has been
 * extended in newer migrations that may not yet be applied to the shared dev DB.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import type { Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

// Mock requireAdmin so we can drive the auth path from tests without
// pulling NextAuth (which fails to resolve `next/server` under vitest).
vi.mock("./admin-auth", () => ({
  requireAdmin: vi.fn(),
  getAdminSession: vi.fn(),
  isSuperRole: (role: string) => role === "super_admin",
}));

const { db, adminAuditLogs, adminUsers } = await import("@doktori/db");
const { eq } = await import("drizzle-orm");
const { withAdminAudit } = await import("./admin-audit-wrapper");
const { requireAdmin } = await import("./admin-auth");

const mockRequireAdmin = requireAdmin as unknown as Mock;

const TEST_ADMIN = {
  id: "10000000-0000-0000-0000-000000000099",
  email: "wrapper-admin@test.local",
  name: "Wrapper Test Admin",
  role: "super_admin" as const,
};

// Resource we mutate in tests — a separate admin_users row.
let resourceUserId: string;
const RESOURCE_INITIAL_NAME = "Resource Admin Initial";

beforeAll(async () => {
  // Seed actor (idempotent)
  await db
    .insert(adminUsers)
    .values({
      id: TEST_ADMIN.id,
      email: TEST_ADMIN.email,
      name: TEST_ADMIN.name,
      role: TEST_ADMIN.role,
      passwordHash: "$2a$04$fake-hash-for-tests-only",
    })
    .onConflictDoNothing({ target: adminUsers.id });

  // Seed a separate admin row that will be the resource we mutate
  const [row] = await db
    .insert(adminUsers)
    .values({
      email: `wrapper-resource-${Date.now()}@test.local`,
      passwordHash: "$2a$04$fake",
      name: RESOURCE_INITIAL_NAME,
      role: "moderator",
    })
    .returning({ id: adminUsers.id });
  resourceUserId = row.id;
});

afterAll(async () => {
  await db.delete(adminAuditLogs).where(eq(adminAuditLogs.resourceId, resourceUserId));
  await db.delete(adminUsers).where(eq(adminUsers.id, resourceUserId));
});

beforeEach(async () => {
  vi.clearAllMocks();
  // Reset the resource name before each test for isolation
  await db
    .update(adminUsers)
    .set({ name: RESOURCE_INITIAL_NAME })
    .where(eq(adminUsers.id, resourceUserId));
});

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown): Request {
  return new Request(`http://localhost/api/admin/users/${resourceUserId}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCtx() {
  return { params: Promise.resolve({ id: resourceUserId }) };
}

async function countAuditRowsForResource(resourceId: string): Promise<number> {
  const rows = await db
    .select({ id: adminAuditLogs.id })
    .from(adminAuditLogs)
    .where(eq(adminAuditLogs.resourceId, resourceId));
  return rows.length;
}

async function getResourceName(id: string): Promise<string | null> {
  const [row] = await db
    .select({ name: adminUsers.name })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  return row?.name ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("withAdminAudit — auth", () => {
  it("returns 401 when requireAdmin returns NextResponse 401, no audit row, no mutation", async () => {
    const unauthorized = NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    mockRequireAdmin.mockResolvedValueOnce(unauthorized);

    const handler = withAdminAudit<{ ok: true }, ReturnType<typeof makeCtx>>({
      action: "users.update",
      resourceType: "admin_users",
      getResourceId: async (_req, ctx) => (await ctx.params).id,
      handler: async ({ tx, resourceId }) => {
        await tx
          .update(adminUsers)
          .set({ name: "SHOULD NOT PERSIST" })
          .where(eq(adminUsers.id, resourceId));
        return { ok: true } as const;
      },
    });

    const auditBefore = await countAuditRowsForResource(resourceUserId);

    const res = await handler(makeRequest("PATCH"), makeCtx());
    expect(res.status).toBe(401);

    expect(await countAuditRowsForResource(resourceUserId)).toBe(auditBefore);
    expect(await getResourceName(resourceUserId)).toBe(RESOURCE_INITIAL_NAME);
  });

  it("returns 403 when requireAdmin returns NextResponse 403", async () => {
    const forbidden = NextResponse.json(
      { error: "Permissions insuffisantes" },
      { status: 403 }
    );
    mockRequireAdmin.mockResolvedValueOnce(forbidden);

    const handler = withAdminAudit({
      action: "users.update",
      resourceType: "admin_users",
      allowedRoles: ["finance"],
      getResourceId: async (_req, ctx: ReturnType<typeof makeCtx>) =>
        (await ctx.params).id,
      handler: async () => ({ ok: true }) as const,
    });

    const auditBefore = await countAuditRowsForResource(resourceUserId);
    const res = await handler(makeRequest("PATCH"), makeCtx());
    expect(res.status).toBe(403);
    expect(await countAuditRowsForResource(resourceUserId)).toBe(auditBefore);
  });
});

describe("withAdminAudit — happy path", () => {
  it("commits the mutation and writes one audit row with before/after", async () => {
    mockRequireAdmin.mockResolvedValueOnce(TEST_ADMIN);

    const handler = withAdminAudit<
      { ok: true; name: string },
      ReturnType<typeof makeCtx>
    >({
      action: "users.update",
      resourceType: "admin_users",
      getResourceId: async (_req, ctx) => (await ctx.params).id,
      getBefore: async ({ tx, resourceId }) => {
        const [row] = await tx
          .select({ name: adminUsers.name })
          .from(adminUsers)
          .where(eq(adminUsers.id, resourceId))
          .limit(1);
        return row;
      },
      handler: async ({ tx, resourceId }) => {
        const [updated] = await tx
          .update(adminUsers)
          .set({ name: "Renamed By Wrapper", updatedAt: new Date() })
          .where(eq(adminUsers.id, resourceId))
          .returning({ name: adminUsers.name });
        return { ok: true, name: updated.name } as const;
      },
    });

    const auditBefore = await countAuditRowsForResource(resourceUserId);
    const res = await handler(makeRequest("PATCH"), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.name).toBe("Renamed By Wrapper");

    expect(await getResourceName(resourceUserId)).toBe("Renamed By Wrapper");
    expect(await countAuditRowsForResource(resourceUserId)).toBe(auditBefore + 1);

    const newest = (
      await db
        .select()
        .from(adminAuditLogs)
        .where(eq(adminAuditLogs.resourceId, resourceUserId))
    ).at(-1)!;
    expect(newest.action).toBe("users.update");
    expect(newest.resourceType).toBe("admin_users");
    expect(newest.actorId).toBe(TEST_ADMIN.id);
    expect((newest.before as { name?: string } | null)?.name).toBe(RESOURCE_INITIAL_NAME);
    expect((newest.after as { name?: string } | null)?.name).toBe("Renamed By Wrapper");
  });
});

describe("withAdminAudit — handler throws", () => {
  it("rolls back mutation, writes no audit row, returns 500", async () => {
    mockRequireAdmin.mockResolvedValueOnce(TEST_ADMIN);

    const auditBefore = await countAuditRowsForResource(resourceUserId);

    const handler = withAdminAudit<{ ok: true }, ReturnType<typeof makeCtx>>({
      action: "users.update",
      resourceType: "admin_users",
      getResourceId: async (_req, ctx) => (await ctx.params).id,
      handler: async ({ tx, resourceId }) => {
        await tx
          .update(adminUsers)
          .set({ name: "WILL BE ROLLED BACK", updatedAt: new Date() })
          .where(eq(adminUsers.id, resourceId));
        throw new Error("boom");
      },
    });

    const res = await handler(makeRequest("PATCH"), makeCtx());
    expect(res.status).toBe(500);

    expect(await getResourceName(resourceUserId)).toBe(RESOURCE_INITIAL_NAME);
    expect(await countAuditRowsForResource(resourceUserId)).toBe(auditBefore);
  });
});

describe("withAdminAudit — handler early-returns NextResponse", () => {
  it("returns the response, rolls back, writes no audit row", async () => {
    mockRequireAdmin.mockResolvedValueOnce(TEST_ADMIN);

    const auditBefore = await countAuditRowsForResource(resourceUserId);

    const handler = withAdminAudit<{ ok: true }, ReturnType<typeof makeCtx>>({
      action: "users.update",
      resourceType: "admin_users",
      getResourceId: async (_req, ctx) => (await ctx.params).id,
      handler: async ({ tx, resourceId }) => {
        await tx
          .update(adminUsers)
          .set({ name: "EARLY RETURN ROLLBACK", updatedAt: new Date() })
          .where(eq(adminUsers.id, resourceId));
        return NextResponse.json({ error: "validation failed" }, { status: 400 });
      },
    });

    const res = await handler(makeRequest("PATCH"), makeCtx());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("validation failed");

    expect(await getResourceName(resourceUserId)).toBe(RESOURCE_INITIAL_NAME);
    expect(await countAuditRowsForResource(resourceUserId)).toBe(auditBefore);
  });
});

describe("withAdminAudit — dynamic action + getReason", () => {
  it("resolves action + reason from the parsed body", async () => {
    mockRequireAdmin.mockResolvedValueOnce(TEST_ADMIN);

    const handler = withAdminAudit<{ ok: true }, ReturnType<typeof makeCtx>>({
      action: ({ body }) => {
        const b = body as { mode: string } | null;
        return b?.mode === "soft" ? "users.soft-action" : "users.hard-action";
      },
      resourceType: "admin_users",
      getResourceId: async (_req, ctx) => (await ctx.params).id,
      getReason: ({ body }) => (body as { note?: string } | null)?.note ?? null,
      handler: async () => ({ ok: true }) as const,
    });

    const res = await handler(
      makeRequest("PATCH", { mode: "soft", note: "test reason" }),
      makeCtx()
    );
    expect(res.status).toBe(200);

    const newest = (
      await db
        .select()
        .from(adminAuditLogs)
        .where(eq(adminAuditLogs.resourceId, resourceUserId))
    ).at(-1)!;
    expect(newest.action).toBe("users.soft-action");
    expect(newest.reason).toBe("test reason");
  });
});
