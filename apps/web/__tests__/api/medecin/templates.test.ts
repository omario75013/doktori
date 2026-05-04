/**
 * Integration tests for /api/medecin/templates (W1.10, W1.11, W1.12)
 *
 * Uses a real dev DB. Each test inserts with unique markers and cleans up after itself.
 * NEVER truncates or deletes non-test data.
 *
 * Run with:
 *   DATABASE_URL=postgresql://doktori:doktori_dev_2026@localhost:5434/doktori pnpm --filter web test __tests__/api/medecin/templates
 *
 * Note: Uses raw SQL for doctor inserts because dev DB is on an older migration
 * than the current schema.ts (missing columns like is_visible, totp_*, etc.).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Mock } from "vitest";
import { NextRequest } from "next/server";
import {
  db,
  prescriptionTemplates,
  templateAuditLogs,
} from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import postgres from "postgres";

// ── Route handlers ────────────────────────────────────────────────────────────
import { GET as getTemplates, POST as postTemplate } from "@/app/api/medecin/templates/route";
import {
  GET as getTemplate,
  PATCH as patchTemplate,
  DELETE as deleteTemplate,
} from "@/app/api/medecin/templates/[id]/route";
import { POST as cloneTemplate } from "@/app/api/medecin/templates/[id]/clone/route";

// Mock requireAuth to return our test doctor
vi.mock("@/lib/require-auth", () => ({
  requireAuth: vi.fn(),
  requireDoctorOrSecretaryUnified: vi.fn(),
}));

const { requireAuth } = await import("@/lib/require-auth");
const mockRequireAuth = requireAuth as Mock;

// Raw postgres client for inserting test data — uses only columns that exist in dev DB
const rawPg = postgres(process.env.DATABASE_URL!);

// ── Test data helpers ─────────────────────────────────────────────────────────

const rand = () => Math.random().toString(36).slice(2, 8);

async function createTestDoctor(suffix: string): Promise<{ id: string }> {
  const email = `test-w110-${suffix}-${Date.now()}@dev.local`;
  const slug = `test-dr-${suffix}-${Date.now()}`;
  const hash = hashSync("test-password", 4);
  // Use raw SQL with only the columns that exist in this dev DB migration state
  const rows = await rawPg`
    INSERT INTO doctors (name, slug, email, password_hash, phone, specialty, city, address)
    VALUES (${`Test Doctor ${suffix}`}, ${slug}, ${email}, ${hash}, ${'00000000'}, ${'generaliste'}, ${'Tunis'}, ${'Test Address'})
    RETURNING id
  `;
  return { id: rows[0].id as string };
}

async function createTestTemplate(
  doctorId: string | null,
  title: string,
  opts?: { isOfficial?: boolean; language?: string; deletedAt?: Date | null }
) {
  const [template] = await db
    .insert(prescriptionTemplates)
    .values({
      doctorId: doctorId,
      title,
      bodyMarkdown: `# Test template body for ${title}`,
      language: opts?.language ?? "fr",
      isOfficial: opts?.isOfficial ?? false,
      deletedAt: opts?.deletedAt ?? null,
    })
    .returning();
  return template;
}

async function cleanupDoctorData(doctorId: string) {
  const templates = await db
    .select({ id: prescriptionTemplates.id })
    .from(prescriptionTemplates)
    .where(eq(prescriptionTemplates.doctorId, doctorId));

  for (const t of templates) {
    await db.delete(templateAuditLogs).where(eq(templateAuditLogs.templateId, t.id));
  }
  await db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.doctorId, doctorId));
  await rawPg`DELETE FROM doctors WHERE id = ${doctorId}::uuid`;
}

async function cleanupOfficialTemplate(id: string) {
  await db.delete(templateAuditLogs).where(eq(templateAuditLogs.templateId, id));
  await db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.id, id));
}

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, init);
}

// ── W1.10: GET /api/medecin/templates ─────────────────────────────────────────

describe("W1.10 GET /api/medecin/templates", () => {
  let doctor1: { id: string };
  let doctor2: { id: string };
  let officialTemplate: Awaited<ReturnType<typeof createTestTemplate>>;

  beforeEach(async () => {
    const s = rand();
    doctor1 = await createTestDoctor(`g-${s}-1`);
    doctor2 = await createTestDoctor(`g-${s}-2`);
    officialTemplate = await createTestTemplate(null, `[TEST-W110-OFF-${s}]`, { isOfficial: true });
  });

  afterEach(async () => {
    await cleanupOfficialTemplate(officialTemplate.id);
    await cleanupDoctorData(doctor1.id);
    await cleanupDoctorData(doctor2.id);
  });

  it("GET 200: returns own templates + official templates", async () => {
    const t1 = await createTestTemplate(doctor1.id, `[TEST-W110] own-template-${rand()}`);
    const d2Template = await createTestTemplate(doctor2.id, `[TEST-W110] doctor2-template-${rand()}`);

    mockRequireAuth.mockResolvedValue({ id: doctor1.id, role: "doctor", doctorId: doctor1.id, source: "cookie" });

    const req = makeRequest("GET", "http://localhost/api/medecin/templates");
    const res = await getTemplates(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    const ids = data.map((t: { id: string }) => t.id);
    expect(ids).toContain(t1.id);
    expect(ids).toContain(officialTemplate.id);
    // Should NOT include doctor2's personal template
    expect(ids).not.toContain(d2Template.id);

    // cleanup extras (main cleanup handles doctor1/doctor2 templates)
    await db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.id, d2Template.id));
    await db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.id, t1.id));
  });

  it("GET 401: unauthenticated returns 401", async () => {
    mockRequireAuth.mockResolvedValue(null);

    const req = makeRequest("GET", "http://localhost/api/medecin/templates");
    const res = await getTemplates(req);

    expect(res.status).toBe(401);
  });

  it("GET 200: filter by language returns only matching templates", async () => {
    const frTemplate = await createTestTemplate(doctor1.id, `[TEST-W110] fr-template-${rand()}`, { language: "fr" });
    const arTemplate = await createTestTemplate(doctor1.id, `[TEST-W110] ar-template-${rand()}`, { language: "ar" });

    mockRequireAuth.mockResolvedValue({ id: doctor1.id, role: "doctor", doctorId: doctor1.id, source: "cookie" });

    const req = makeRequest("GET", "http://localhost/api/medecin/templates?language=ar");
    const res = await getTemplates(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    const ids = data.map((t: { id: string }) => t.id);
    expect(ids).toContain(arTemplate.id);
    expect(ids).not.toContain(frTemplate.id);

    await db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.id, frTemplate.id));
    await db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.id, arTemplate.id));
  });
});

// ── W1.10: POST /api/medecin/templates ────────────────────────────────────────

describe("W1.10 POST /api/medecin/templates", () => {
  let doctor: { id: string };

  beforeEach(async () => {
    doctor = await createTestDoctor(`p-${rand()}`);
    mockRequireAuth.mockResolvedValue({ id: doctor.id, role: "doctor", doctorId: doctor.id, source: "cookie" });
  });

  afterEach(async () => {
    await cleanupDoctorData(doctor.id);
  });

  it("POST 201: creates template and returns it", async () => {
    const body = {
      title: `[TEST-W110] New Template ${rand()}`,
      bodyMarkdown: "# Hello doctor\n\nThis is a **template**.",
      language: "fr",
    };

    const req = makeRequest("POST", "http://localhost/api/medecin/templates", body);
    const res = await postTemplate(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe(body.title);
    expect(data.doctorId).toBe(doctor.id);
    expect(data.isOfficial).toBe(false);
  });

  it("POST 400: rejects empty body markdown", async () => {
    const req = makeRequest("POST", "http://localhost/api/medecin/templates", {
      title: `[TEST-W110] test`,
      bodyMarkdown: "",
    });
    const res = await postTemplate(req);
    expect(res.status).toBe(400);
  });

  it("POST 400: rejects XSS/unsafe content (B1)", async () => {
    const req = makeRequest("POST", "http://localhost/api/medecin/templates", {
      title: `[TEST-W110] XSS test`,
      bodyMarkdown: '<script>alert("xss")</script>',
    });
    const res = await postTemplate(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/non autorisés/i);
  });

  it("POST 400: rejects title longer than 120 chars", async () => {
    const req = makeRequest("POST", "http://localhost/api/medecin/templates", {
      title: "A".repeat(121),
      bodyMarkdown: "# Valid body",
    });
    const res = await postTemplate(req);
    expect(res.status).toBe(400);
  });

  it("POST 422: rejects when limit of 200 templates is reached", async () => {
    // Insert 200 templates to hit the limit
    const inserts = Array.from({ length: 200 }, (_, i) => ({
      doctorId: doctor.id,
      title: `[TEST-W110] bulk-${i}-${rand()}`,
      bodyMarkdown: "# Body",
      language: "fr" as const,
      isOfficial: false,
    }));

    for (let i = 0; i < inserts.length; i += 50) {
      await db.insert(prescriptionTemplates).values(inserts.slice(i, i + 50));
    }

    const req = makeRequest("POST", "http://localhost/api/medecin/templates", {
      title: `[TEST-W110] one more`,
      bodyMarkdown: "# Body",
    });
    const res = await postTemplate(req);
    expect(res.status).toBe(422);
  });

  it("POST: audit log is inserted on creation (B5)", async () => {
    const title = `[TEST-W110] audit-test-${rand()}`;
    const req = makeRequest("POST", "http://localhost/api/medecin/templates", {
      title,
      bodyMarkdown: "# Audit test body",
    });
    const res = await postTemplate(req);
    expect(res.status).toBe(201);
    const created = await res.json();

    const [auditRow] = await db
      .select()
      .from(templateAuditLogs)
      .where(
        and(
          eq(templateAuditLogs.templateId, created.id),
          eq(templateAuditLogs.action, "created")
        )
      )
      .limit(1);

    expect(auditRow).toBeDefined();
    expect(auditRow.actorId).toBe(doctor.id);
    expect(auditRow.actorType).toBe("doctor");
  });
});

// ── W1.11: GET /api/medecin/templates/[id] ────────────────────────────────────

describe("W1.11 GET /api/medecin/templates/[id]", () => {
  let doctor1: { id: string };
  let doctor2: { id: string };
  let officialTemplate: Awaited<ReturnType<typeof createTestTemplate>>;
  let ownTemplate: Awaited<ReturnType<typeof createTestTemplate>>;
  let otherTemplate: Awaited<ReturnType<typeof createTestTemplate>>;

  beforeEach(async () => {
    const s = rand();
    doctor1 = await createTestDoctor(`g11-${s}-1`);
    doctor2 = await createTestDoctor(`g11-${s}-2`);
    officialTemplate = await createTestTemplate(null, `[TEST-W110-OFF-${s}]`, { isOfficial: true });
    ownTemplate = await createTestTemplate(doctor1.id, `[TEST-W110] own-${s}`);
    otherTemplate = await createTestTemplate(doctor2.id, `[TEST-W110] other-${s}`);
    mockRequireAuth.mockResolvedValue({ id: doctor1.id, role: "doctor", doctorId: doctor1.id, source: "cookie" });
  });

  afterEach(async () => {
    await cleanupOfficialTemplate(officialTemplate.id);
    await cleanupDoctorData(doctor1.id);
    await cleanupDoctorData(doctor2.id);
  });

  it("GET 200: returns own template", async () => {
    const req = makeRequest("GET", `http://localhost/api/medecin/templates/${ownTemplate.id}`);
    const res = await getTemplate(req, { params: Promise.resolve({ id: ownTemplate.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(ownTemplate.id);
  });

  it("GET 403: returns 403 for another doctor's template (IDOR)", async () => {
    const req = makeRequest("GET", `http://localhost/api/medecin/templates/${otherTemplate.id}`);
    const res = await getTemplate(req, { params: Promise.resolve({ id: otherTemplate.id }) });
    expect(res.status).toBe(403);
  });

  it("GET 200: returns official template (read-only access)", async () => {
    const req = makeRequest("GET", `http://localhost/api/medecin/templates/${officialTemplate.id}`);
    const res = await getTemplate(req, { params: Promise.resolve({ id: officialTemplate.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isOfficial).toBe(true);
  });
});

// ── W1.11: PATCH /api/medecin/templates/[id] ──────────────────────────────────

describe("W1.11 PATCH /api/medecin/templates/[id]", () => {
  let doctor1: { id: string };
  let doctor2: { id: string };
  let officialTemplate: Awaited<ReturnType<typeof createTestTemplate>>;
  let ownTemplate: Awaited<ReturnType<typeof createTestTemplate>>;
  let otherTemplate: Awaited<ReturnType<typeof createTestTemplate>>;

  beforeEach(async () => {
    const s = rand();
    doctor1 = await createTestDoctor(`p11-${s}-1`);
    doctor2 = await createTestDoctor(`p11-${s}-2`);
    officialTemplate = await createTestTemplate(null, `[TEST-W110-OFF-${s}]`, { isOfficial: true });
    ownTemplate = await createTestTemplate(doctor1.id, `[TEST-W110] own-patch-${s}`);
    otherTemplate = await createTestTemplate(doctor2.id, `[TEST-W110] other-patch-${s}`);
    mockRequireAuth.mockResolvedValue({ id: doctor1.id, role: "doctor", doctorId: doctor1.id, source: "cookie" });
  });

  afterEach(async () => {
    await cleanupOfficialTemplate(officialTemplate.id);
    await cleanupDoctorData(doctor1.id);
    await cleanupDoctorData(doctor2.id);
  });

  it("PATCH 200: updates own template", async () => {
    const newTitle = `[TEST-W110] updated-${rand()}`;
    const req = makeRequest("PATCH", `http://localhost/api/medecin/templates/${ownTemplate.id}`, {
      title: newTitle,
    });
    const res = await patchTemplate(req, { params: Promise.resolve({ id: ownTemplate.id }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe(newTitle);
  });

  it("PATCH 403: cannot edit another doctor's template (IDOR)", async () => {
    const req = makeRequest("PATCH", `http://localhost/api/medecin/templates/${otherTemplate.id}`, {
      title: "[TEST-W110] hacked",
    });
    const res = await patchTemplate(req, { params: Promise.resolve({ id: otherTemplate.id }) });
    expect(res.status).toBe(403);
  });

  it("PATCH 403: cannot edit official template", async () => {
    const req = makeRequest("PATCH", `http://localhost/api/medecin/templates/${officialTemplate.id}`, {
      title: "[TEST-W110] modified official",
    });
    const res = await patchTemplate(req, { params: Promise.resolve({ id: officialTemplate.id }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("OFFICIAL_TEMPLATE_READ_ONLY");
  });
});

// ── W1.11: DELETE /api/medecin/templates/[id] ─────────────────────────────────

describe("W1.11 DELETE /api/medecin/templates/[id]", () => {
  let doctor1: { id: string };
  let officialTemplate: Awaited<ReturnType<typeof createTestTemplate>>;
  let ownTemplate: Awaited<ReturnType<typeof createTestTemplate>>;

  beforeEach(async () => {
    const s = rand();
    doctor1 = await createTestDoctor(`d11-${s}`);
    officialTemplate = await createTestTemplate(null, `[TEST-W110-OFF-${s}]`, { isOfficial: true });
    ownTemplate = await createTestTemplate(doctor1.id, `[TEST-W110] own-delete-${s}`);
    mockRequireAuth.mockResolvedValue({ id: doctor1.id, role: "doctor", doctorId: doctor1.id, source: "cookie" });
  });

  afterEach(async () => {
    await cleanupOfficialTemplate(officialTemplate.id);
    await cleanupDoctorData(doctor1.id);
  });

  it("DELETE 204: soft-deletes own template (sets deleted_at)", async () => {
    const req = makeRequest("DELETE", `http://localhost/api/medecin/templates/${ownTemplate.id}`);
    const res = await deleteTemplate(req, { params: Promise.resolve({ id: ownTemplate.id }) });
    expect(res.status).toBe(204);

    const [deleted] = await db
      .select()
      .from(prescriptionTemplates)
      .where(eq(prescriptionTemplates.id, ownTemplate.id))
      .limit(1);
    expect(deleted.deletedAt).not.toBeNull();
  });

  it("DELETE 403: cannot delete official template", async () => {
    const req = makeRequest("DELETE", `http://localhost/api/medecin/templates/${officialTemplate.id}`);
    const res = await deleteTemplate(req, { params: Promise.resolve({ id: officialTemplate.id }) });
    expect(res.status).toBe(403);
  });
});

// ── W1.12: POST /api/medecin/templates/[id]/clone ─────────────────────────────

describe("W1.12 POST /api/medecin/templates/[id]/clone", () => {
  let doctor1: { id: string };
  let doctor2: { id: string };
  let officialTemplate: Awaited<ReturnType<typeof createTestTemplate>>;
  let otherPersonalTemplate: Awaited<ReturnType<typeof createTestTemplate>>;

  beforeEach(async () => {
    const s = rand();
    doctor1 = await createTestDoctor(`c12-${s}-1`);
    doctor2 = await createTestDoctor(`c12-${s}-2`);
    officialTemplate = await createTestTemplate(null, `[TEST-W110-OFF-${s}]`, { isOfficial: true });
    otherPersonalTemplate = await createTestTemplate(doctor2.id, `[TEST-W110] other-personal-${s}`);
    mockRequireAuth.mockResolvedValue({ id: doctor1.id, role: "doctor", doctorId: doctor1.id, source: "cookie" });
  });

  afterEach(async () => {
    await cleanupOfficialTemplate(officialTemplate.id);
    await cleanupDoctorData(doctor1.id);
    await cleanupDoctorData(doctor2.id);
  });

  it("Clone official: creates personal copy with clonedFromId + isOfficial=false", async () => {
    const req = makeRequest("POST", `http://localhost/api/medecin/templates/${officialTemplate.id}/clone`);
    const res = await cloneTemplate(req, { params: Promise.resolve({ id: officialTemplate.id }) });
    expect(res.status).toBe(201);

    const cloned = await res.json();
    expect(cloned.clonedFromId).toBe(officialTemplate.id);
    expect(cloned.isOfficial).toBe(false);
    expect(cloned.doctorId).toBe(doctor1.id);
    expect(cloned.title).toContain("(copie)");

    // Cleanup cloned template — cleanupDoctorData will handle it for doctor1
  });

  it("Clone: source cloneCount is incremented (B3)", async () => {
    const [before] = await db
      .select({ cloneCount: prescriptionTemplates.cloneCount })
      .from(prescriptionTemplates)
      .where(eq(prescriptionTemplates.id, officialTemplate.id))
      .limit(1);
    const beforeCount = before.cloneCount;

    const req = makeRequest("POST", `http://localhost/api/medecin/templates/${officialTemplate.id}/clone`);
    const res = await cloneTemplate(req, { params: Promise.resolve({ id: officialTemplate.id }) });
    expect(res.status).toBe(201);

    const [updated] = await db
      .select()
      .from(prescriptionTemplates)
      .where(eq(prescriptionTemplates.id, officialTemplate.id))
      .limit(1);

    expect(updated.cloneCount).toBe(beforeCount + 1);
  });

  it("Clone deleted template: returns 404", async () => {
    const s = rand();
    const deletedTemplate = await createTestTemplate(null, `[TEST-W110-OFF-DELETED-${s}]`, {
      isOfficial: true,
      deletedAt: new Date(),
    });

    const req = makeRequest("POST", `http://localhost/api/medecin/templates/${deletedTemplate.id}/clone`);
    const res = await cloneTemplate(req, { params: Promise.resolve({ id: deletedTemplate.id }) });
    expect(res.status).toBe(404);

    await db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.id, deletedTemplate.id));
  });

  it("Clone another doctor's personal template: returns 403 (IDOR)", async () => {
    const req = makeRequest(
      "POST",
      `http://localhost/api/medecin/templates/${otherPersonalTemplate.id}/clone`
    );
    const res = await cloneTemplate(req, {
      params: Promise.resolve({ id: otherPersonalTemplate.id }),
    });
    expect(res.status).toBe(403);
  });
});
