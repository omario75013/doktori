import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, clinicDoctors, doctors } from "@doktori/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; doctorId: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id, doctorId } = await params;

    const [existing] = await db
      .select()
      .from(clinicDoctors)
      .where(and(eq(clinicDoctors.clinicId, id), eq(clinicDoctors.doctorId, doctorId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Association introuvable" }, { status: 404 });
    }

    const [doctor] = await db.select({ name: doctors.name }).from(doctors).where(eq(doctors.id, doctorId)).limit(1);

    await db
      .delete(clinicDoctors)
      .where(and(eq(clinicDoctors.clinicId, id), eq(clinicDoctors.doctorId, doctorId)));

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "clinics.remove_doctor",
      resourceType: "clinics",
      resourceId: id,
      before: { doctorId, doctorName: doctor?.name ?? doctorId, role: existing.role },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api//admin/clinics/[id]/doctors/[doctorId]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
