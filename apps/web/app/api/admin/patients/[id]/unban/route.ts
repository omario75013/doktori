import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, patients } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin", "support"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    if (!patient) {
      return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
    }
    if (!patient.isSuspended) {
      return NextResponse.json({ error: "Patient non suspendu" }, { status: 409 });
    }

    const prevReason = patient.suspensionReason;

    await db
      .update(patients)
      .set({ isSuspended: false, suspensionReason: null, suspendedAt: null })
      .where(eq(patients.id, id));

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "patients.unban",
      resourceType: "patients",
      resourceId: id,
      before: { isSuspended: true, suspensionReason: prevReason },
      after: { isSuspended: false, suspensionReason: null },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api//admin/patients/[id]/unban]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
