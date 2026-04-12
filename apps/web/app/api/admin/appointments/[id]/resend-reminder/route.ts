import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, appointments } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [row] = await db
    .select({ id: appointments.id, status: appointments.status, patientId: appointments.patientId })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 });
  }

  const { ip, userAgent } = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "appointments.resend_reminder",
    resourceType: "appointments",
    resourceId: id,
    after: { patientId: row.patientId, status: row.status },
    ip,
    userAgent,
  });

  // SMS infrastructure not yet wired — logged for now.
  return NextResponse.json({ success: true, message: "Rappel enregistré (SMS à implémenter)" });
}
