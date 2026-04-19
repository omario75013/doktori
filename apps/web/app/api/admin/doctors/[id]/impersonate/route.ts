import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.id, id))
      .limit(1);

    if (!doctor) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const token = await new SignJWT({
      id: doctor.id,
      email: doctor.email,
      name: doctor.name,
      role: "doctor",
      impersonatedBy: admin.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .setIssuedAt()
      .sign(secret);

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "doctors.impersonation_start",
      resourceType: "doctors",
      resourceId: id,
      before: null,
      after: {
        impersonatedBy: admin.email,
        doctorId: doctor.id,
        expiresAt: expiresAt.toISOString(),
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        slug: doctor.slug,
        email: doctor.email,
      },
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("[POST /api//admin/doctors/[id]/impersonate]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
