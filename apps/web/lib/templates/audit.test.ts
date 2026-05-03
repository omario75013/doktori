import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";

// ── Mock @doktori/db before importing the module under test ───────────────────

const mockValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock("@doktori/db", () => ({
  db: { insert: mockInsert },
  templateAuditLogs: { _tableName: "template_audit_logs" },
}));

// Import AFTER mocking to ensure the mock is active
const { logTemplateAudit } = await import("./audit");

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_PARAMS = {
  actorType: "doctor" as const,
  actorId: "doc-uuid-001",
  templateId: "tpl-uuid-001",
  action: "created" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockValues.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── W1.9-T1: inserts an audit row with required fields ────────────────────────

describe("logTemplateAudit", () => {
  it("calls db.insert with templateAuditLogs table", async () => {
    await logTemplateAudit(BASE_PARAMS);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledTimes(1);
  });

  it("maps actorType to the inserted row", async () => {
    await logTemplateAudit(BASE_PARAMS);
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.actorType).toBe("doctor");
  });

  it("maps actorId to the inserted row", async () => {
    await logTemplateAudit(BASE_PARAMS);
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.actorId).toBe("doc-uuid-001");
  });

  it("maps templateId to the inserted row", async () => {
    await logTemplateAudit(BASE_PARAMS);
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.templateId).toBe("tpl-uuid-001");
  });

  it("maps action to the inserted row", async () => {
    await logTemplateAudit(BASE_PARAMS);
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.action).toBe("created");
  });

  it("passes before snapshot when provided", async () => {
    const before = { title: "old title" };
    await logTemplateAudit({ ...BASE_PARAMS, before });
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.before).toEqual(before);
  });

  it("passes after snapshot when provided", async () => {
    const after = { title: "new title" };
    await logTemplateAudit({ ...BASE_PARAMS, after });
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.after).toEqual(after);
  });

  it("passes context when provided", async () => {
    const context = { ip: "127.0.0.1", userAgent: "test" };
    await logTemplateAudit({ ...BASE_PARAMS, context });
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.context).toEqual(context);
  });

  it("sets before/after/context to null when omitted", async () => {
    await logTemplateAudit(BASE_PARAMS);
    const insertedValues = mockValues.mock.calls[0][0];
    expect(insertedValues.before).toBeNull();
    expect(insertedValues.after).toBeNull();
    expect(insertedValues.context).toBeNull();
  });
});

// ── W1.9-T2: fire-and-forget — does NOT throw on insert error (B5) ───────────

describe("logTemplateAudit — fire-and-forget (BLOCKER B5)", () => {
  it("does not throw when db.insert throws", async () => {
    mockValues.mockRejectedValueOnce(new Error("DB connection lost"));
    await expect(logTemplateAudit(BASE_PARAMS)).resolves.toBeUndefined();
  });

  it("does not throw when db.insert rejects", async () => {
    mockInsert.mockImplementationOnce(() => {
      throw new Error("unexpected sync error");
    });
    await expect(logTemplateAudit(BASE_PARAMS)).resolves.toBeUndefined();
  });

  it("logs to console.error on insert failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockValues.mockRejectedValueOnce(new Error("DB down"));
    await logTemplateAudit(BASE_PARAMS);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });
});
