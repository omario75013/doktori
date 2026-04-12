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

  const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  if (!patient) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }

  const prev = patient.noShowCount;

  await db.update(patients).set({ noShowCount: 0 }).where(eq(patients.id, id));

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "patients.reset_noshow",
    resourceType: "patients",
    resourceId: id,
    before: { noShowCount: prev },
    after: { noShowCount: 0 },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
