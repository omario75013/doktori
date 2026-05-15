import { db, clinicAuditLog } from "@doktori/db";

type ActorType = "clinic" | "secretary" | "doctor" | "admin";

/**
 * Append-only audit ledger for every clinic-side write. Never throws —
 * a failed audit insert must never block the user action that caused it.
 * Use dotted action keys: e.g. `doctor.invite`, `note.delete`, `rdv.status_change`.
 */
export async function logClinicAudit(input: {
  clinicId: string;
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(clinicAuditLog).values({
      clinicId: input.clinicId,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (e) {
    console.error("[audit] insert failed", e);
  }
}
