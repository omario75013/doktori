import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, appointments } from "@doktori/db";
import { eq } from "drizzle-orm";

const VALID_STATUSES = ["pending", "confirmed", "completed", "no_show", "cancelled"] as const;
type AppointmentStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = (await req.json()) as { status?: unknown; reason?: unknown };

  const newStatus = body.status as string;
  if (!VALID_STATUSES.includes(newStatus as AppointmentStatus)) {
    return NextResponse.json(
      { error: `Statut invalide. Valeurs acceptées: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const [before] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  if (!before) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }

  const now = new Date();
  const updates: Record<string, unknown> = {
    status: newStatus,
    updatedAt: now,
  };

  if (newStatus === "confirmed") {
    updates.confirmedAt = now;
  } else if (newStatus === "cancelled") {
    updates.cancelledAt = now;
  }

  const [after] = await db
    .update(appointments)
    .set(updates)
    .where(eq(appointments.id, id))
    .returning();

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: `appointments.status.${newStatus}`,
    resourceType: "appointments",
    resourceId: id,
    before: { status: before.status, confirmedAt: before.confirmedAt, cancelledAt: before.cancelledAt },
    after: { status: after.status, confirmedAt: after.confirmedAt, cancelledAt: after.cancelledAt },
    reason: typeof body.reason === "string" ? body.reason : null,
    ip,
    userAgent,
  });

  return NextResponse.json({
    appointment: {
      id: after.id,
      status: after.status,
      confirmedAt: after.confirmedAt?.toISOString() ?? null,
      cancelledAt: after.cancelledAt?.toISOString() ?? null,
      updatedAt: after.updatedAt.toISOString(),
    },
  });
}
