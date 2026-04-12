import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, patients } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = (await req.json()) as { reason?: string };

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "La raison de suspension est requise" }, { status: 422 });
  }

  const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }
  if (patient.isSuspended) {
    return NextResponse.json({ error: "Patient déjà suspendu" }, { status: 409 });
  }

  const now = new Date();
  await db
    .update(patients)
    .set({ isSuspended: true, suspensionReason: reason, suspendedAt: now })
    .where(eq(patients.id, id));

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "patients.suspend",
    resourceType: "patients",
    resourceId: id,
    before: { isSuspended: false },
    after: { isSuspended: true, suspensionReason: reason, suspendedAt: now.toISOString() },
    reason,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
