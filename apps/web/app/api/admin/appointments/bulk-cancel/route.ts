import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, appointments } from "@doktori/db";
import { eq } from "drizzle-orm";

const BodySchema = z.object({
  appointmentIds: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().min(10).max(500),
});

const SKIPPABLE_STATUSES = new Set(["completed", "cancelled"]);

export async function POST(req: Request) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { appointmentIds, reason } = parsed.data;
  const { ip, userAgent } = extractRequestMeta(req);
  const now = new Date();

  let cancelled = 0;
  let skipped = 0;
  const errors: { id: string; error: string }[] = [];

  for (const id of appointmentIds) {
    try {
      const [before] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id))
        .limit(1);
      if (!before) {
        errors.push({ id, error: "Introuvable" });
        continue;
      }
      if (SKIPPABLE_STATUSES.has(before.status)) {
        skipped++;
        continue;
      }
      const [after] = await db
        .update(appointments)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancellationReason: reason,
          updatedAt: now,
        })
        .where(eq(appointments.id, id))
        .returning();

      cancelled++;
      await logAudit({
        actor: admin,
        action: "appointments.bulk_cancel",
        resourceType: "appointments",
        resourceId: id,
        before: {
          status: before.status,
          cancelledAt: before.cancelledAt,
          cancellationReason: before.cancellationReason,
        },
        after: {
          status: after.status,
          cancelledAt: after.cancelledAt,
          cancellationReason: after.cancellationReason,
        },
        reason,
        ip,
        userAgent,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      errors.push({ id, error: msg });
    }
  }

  return NextResponse.json({
    cancelled,
    skipped,
    errors,
    total: appointmentIds.length,
  });
}
