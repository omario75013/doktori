import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, clinics, clinicDoctors, doctors } from "@doktori/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
  if (!clinic) return NextResponse.json({ error: "Clinique introuvable" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const { doctorId, role } = body;

  if (!doctorId || typeof doctorId !== "string") {
    return NextResponse.json({ error: "doctorId requis" }, { status: 400 });
  }

  const validRole = role === "admin" || role === "member" ? role : "member";

  const [doctor] = await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);
  if (!doctor) return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });

  // Check for existing association
  const [existing] = await db
    .select()
    .from(clinicDoctors)
    .where(and(eq(clinicDoctors.clinicId, id), eq(clinicDoctors.doctorId, doctorId)))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Ce médecin est déjà dans la clinique" }, { status: 409 });
  }

  const [inserted] = await db
    .insert(clinicDoctors)
    .values({ clinicId: id, doctorId, role: validRole })
    .returning();

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "clinics.add_doctor",
    resourceType: "clinics",
    resourceId: id,
    after: { doctorId, doctorName: doctor.name, role: validRole },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ clinicDoctor: { ...inserted, createdAt: inserted.createdAt.toISOString() } }, { status: 201 });
}
