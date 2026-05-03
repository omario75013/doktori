/**
 * logTemplateAudit — bilateral audit helper (BLOCKER B5).
 *
 * Fire-and-forget: errors are logged to console.error but never thrown,
 * so an audit failure cannot block a successful mutation.
 */

import { db, templateAuditLogs } from "@doktori/db";

export interface TemplateAuditParams {
  actorType: "doctor" | "secretary" | "admin";
  actorId: string;
  templateId: string;
  action: "create" | "update" | "delete" | "clone" | "apply" | "view";
  before?: unknown;
  after?: unknown;
  context?: unknown;
}

/**
 * Persist a template audit log row.
 * Never throws — errors are swallowed and logged to console.error.
 */
export async function logTemplateAudit(params: TemplateAuditParams): Promise<void> {
  try {
    await db.insert(templateAuditLogs).values({
      actorType: params.actorType,
      actorId: params.actorId,
      templateId: params.templateId,
      action: params.action,
      before: (params.before ?? null) as Record<string, unknown> | null,
      after: (params.after ?? null) as Record<string, unknown> | null,
      context: (params.context ?? null) as Record<string, unknown> | null,
    });
  } catch (e) {
    console.error("[template-audit] failed to persist audit log:", e);
  }
}
