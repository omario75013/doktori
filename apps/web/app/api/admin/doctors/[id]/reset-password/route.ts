import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin", "support"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
    if (!doctor) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const temp = randomBytes(8).toString("base64url");
    const hashed = await hash(temp, 10);

    await db
      .update(doctors)
      .set({ passwordHash: hashed, updatedAt: new Date() })
      .where(eq(doctors.id, id));

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "doctors.reset_password",
      resourceType: "doctors",
      resourceId: id,
      before: null,
      after: { email: doctor.email },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true, tempPassword: temp });
  } catch (e) {
    console.error("[POST /api//admin/doctors/[id]/reset-password]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
