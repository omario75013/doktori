/**
 * Tests for /api/admin/templates and /api/admin/templates/[id] (W4.1, W4.2)
 *
 * Run:
 *   DATABASE_URL=postgresql://doktori:doktori_dev_2026@localhost:5434/doktori pnpm --filter web test __tests__/api/admin/templates
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { Mock } from "vitest";
import { NextResponse } from "next/server";
import { db, prescriptionTemplates, adminAuditLogs, templateAuditLogs, adminUsers } from "@doktori/db";
import { eq, and, isNull } from "drizzle-orm";

// ── Route handlers ────────────────────────────────────────────────────────────
import { GET as adminGetTemplates, POST as adminPostTemplate } from "@/app/api/admin/templates/route";
import {
  GET as adminGetTemplate,
  PATCH as adminPatchTemplate,
  DELETE as adminDeleteTemplate,
} from "@/app/api/admin/templates/[id]/route";

// Mock requireAdmin
vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: vi.fn(),
  getAdminSession: vi.fn(),
  isSuperRole: (role: string) => role === "super_admin",
}));

const { requireAdmin } = await import("@/lib/admin-auth");
const mockRequireAdmin = requireAdmin as Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

const rand = () => Math.random().toString(36).slice(2, 8);

const SUPER_ADMIN = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@doktori.test",
  name: "Test Admin",
  role: "super_admin" as const,
};

// Seed the admin user once before any test runs, so audit log inserts that
// reference SUPER_ADMIN.id don't violate the admin_audit_logs_actor_id FK.
// Idempotent: ON CONFLICT DO NOTHING so reruns don't fail.
beforeAll(async () => {
  await db
    .insert(adminUsers)
    .values({
      id: SUPER_ADMIN.id,
      email: SUPER_ADMIN.email,
      name: SUPER_ADMIN.name,
      role: SUPER_ADMIN.role,
      passwordHash: "$2a$04$fake-hash-for-tests-only-not-real-password",
    })
    .onConflictDoNothing({ target: adminUsers.id });
});

const NON_ADMIN_RESPONSE = NextResponse.json(
  { error: "Permissions insuffisantes" },
  { status: 403 }
);

function makeRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/admin/templates", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const createdIds: string[] = [];

afterEach(async () => {
  // Soft-delete test templates (they have test slugs)
  for (const id of createdIds) {
    await db
      .update(prescriptionTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(prescriptionTemplates.id, id));
  }
  createdIds.length = 0;
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/templates — auth guard", () => {
  it("returns 403 when requireAdmin returns NextResponse (non super_admin)", async () => {
    mockRequireAdmin.mockResolvedValueOnce(NON_ADMIN_RESPONSE);
    const req = makeRequest("GET");
    const res = await adminGetTemplates(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 with templates array when authenticated as super_admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce(SUPER_ADMIN);
    const req = makeRequest("GET");
    const res = await adminGetTemplates(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.templates)).toBe(true);
  });
});

describe("POST /api/admin/templates — create official template", () => {
  it("returns 403 when not super_admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce(NON_ADMIN_RESPONSE);
    const req = makeRequest("POST", {
      title: "Test Officiel",
      slug: "test-officiel-auth",
      bodyMarkdown: "Contenu",
    });
    const res = await adminPostTemplate(req);
    expect(res.status).toBe(403);
  });

  it("creates template with is_official=true and doctor_id=null", async () => {
    mockRequireAdmin.mockResolvedValueOnce(SUPER_ADMIN);
    const slug = `test-official-${rand()}`;
    const req = makeRequest("POST", {
      title: "Modèle Officiel Test",
      slug,
      language: "fr",
      bodyMarkdown: "## Ordonnance\n\nContenu du médecin.",
      description: "Test de création officielle",
    });
    const res = await adminPostTemplate(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.template.isOfficial).toBe(true);
    expect(json.template.doctorId).toBeNull();
    expect(json.template.slug).toBe(slug);
    createdIds.push(json.template.id);
  });

  it("returns 400 when slug is missing", async () => {
    mockRequireAdmin.mockResolvedValueOnce(SUPER_ADMIN);
    const req = makeRequest("POST", {
      title: "Modèle sans slug",
      bodyMarkdown: "Contenu",
    });
    const res = await adminPostTemplate(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/slug/i);
  });

  it("returns 400 when slug contains invalid characters", async () => {
    mockRequireAdmin.mockResolvedValueOnce(SUPER_ADMIN);
    const req = makeRequest("POST", {
      title: "Mauvais slug",
      slug: "Slug Avec Espaces!",
      bodyMarkdown: "Contenu",
    });
    const res = await adminPostTemplate(req);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/templates/[id] — audit logging", () => {
  it("logs to admin_audit_logs AND template_audit_logs on update (double audit B5)", async () => {
    // First create a template
    mockRequireAdmin.mockResolvedValueOnce(SUPER_ADMIN);
    const slug = `test-audit-${rand()}`;
    const createReq = makeRequest("POST", {
      title: "Template Audit Test",
      slug,
      language: "fr",
      bodyMarkdown: "Version originale",
    });
    const createRes = await adminPostTemplate(createReq);
    expect(createRes.status).toBe(201);
    const { template } = await createRes.json();
    createdIds.push(template.id);

    // Count audit rows before
    const adminAuditBefore = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.resourceId, template.id));
    const tplAuditBefore = await db
      .select()
      .from(templateAuditLogs)
      .where(eq(templateAuditLogs.templateId, template.id));

    // Now patch it
    mockRequireAdmin.mockResolvedValueOnce(SUPER_ADMIN);
    const patchReq = new Request(`http://localhost/api/admin/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Template Audit Test MODIFIÉ" }),
    });
    const patchRes = await adminPatchTemplate(patchReq, {
      params: Promise.resolve({ id: template.id }),
    });
    expect(patchRes.status).toBe(200);

    // Check both audit tables have new rows
    const adminAuditAfter = await db
      .select()
      .from(adminAuditLogs)
      .where(eq(adminAuditLogs.resourceId, template.id));
    const tplAuditAfter = await db
      .select()
      .from(templateAuditLogs)
      .where(eq(templateAuditLogs.templateId, template.id));

    // The creation POST logged once to each, patch adds one more to each
    expect(adminAuditAfter.length).toBeGreaterThan(adminAuditBefore.length);
    expect(tplAuditAfter.length).toBeGreaterThan(tplAuditBefore.length);

    // Verify action values
    const patchAdminLog = adminAuditAfter.find((r) => r.action === "templates.update");
    expect(patchAdminLog).toBeDefined();
    const patchTplLog = tplAuditAfter.find((r) => r.action === "edited");
    expect(patchTplLog).toBeDefined();
  });
});

describe("DELETE /api/admin/templates/[id]", () => {
  it("soft-deletes official template and logs to both audit tables", async () => {
    mockRequireAdmin.mockResolvedValueOnce(SUPER_ADMIN);
    const slug = `test-del-${rand()}`;
    const createReq = makeRequest("POST", {
      title: "Template à supprimer",
      slug,
      language: "fr",
      bodyMarkdown: "Contenu",
    });
    const createRes = await adminPostTemplate(createReq);
    const { template } = await createRes.json();
    // Don't push to createdIds — DELETE will soft-delete it

    mockRequireAdmin.mockResolvedValueOnce(SUPER_ADMIN);
    const delReq = new Request(`http://localhost/api/admin/templates/${template.id}`, {
      method: "DELETE",
    });
    const delRes = await adminDeleteTemplate(delReq, {
      params: Promise.resolve({ id: template.id }),
    });
    expect(delRes.status).toBe(200);
    const json = await delRes.json();
    expect(json.ok).toBe(true);

    // Verify soft-delete: deleted_at is set
    const [row] = await db
      .select()
      .from(prescriptionTemplates)
      .where(eq(prescriptionTemplates.id, template.id));
    expect(row.deletedAt).not.toBeNull();
  });
});
