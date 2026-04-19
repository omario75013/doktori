import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, clinics, clinicDoctors, doctors, appointments } from "@doktori/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
  if (!clinic) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const clinicDoctorRows = await db
    .select({
      id: clinicDoctors.id,
      role: clinicDoctors.role,
      createdAt: clinicDoctors.createdAt,
      doctorId: doctors.id,
      doctorName: doctors.name,
      doctorEmail: doctors.email,
      doctorSpecialty: doctors.specialty,
    })
    .from(clinicDoctors)
    .innerJoin(doctors, eq(clinicDoctors.doctorId, doctors.id))
    .where(eq(clinicDoctors.clinicId, id));

  // Appointment count for clinic doctors this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [{ apptCount }] = await db
    .select({ apptCount: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      sql`${appointments.doctorId} IN (
        SELECT doctor_id FROM clinic_doctors WHERE clinic_id = ${id}
      ) AND ${appointments.startsAt} >= ${monthStart}`
    );

  return NextResponse.json({
    clinic: {
      ...clinic,
      createdAt: clinic.createdAt.toISOString(),
    },
    doctors: clinicDoctorRows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    apptCountThisMonth: Number(apptCount ?? 0),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(["super_admin"]);
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const [existing] = await db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const allowed = ["name", "address", "city", "phone", "email", "plan", "logoUrl"] as const;
    const updates: Partial<typeof clinics.$inferInsert> = {};

    for (const key of allowed) {
      if (key in body && body[key] !== undefined) {
        (updates as Record<string, unknown>)[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
    }

    const [updated] = await db
      .update(clinics)
      .set(updates)
      .where(eq(clinics.id, id))
      .returning();

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "clinics.update",
      resourceType: "clinics",
      resourceId: id,
      before: { name: existing.name, plan: existing.plan },
      after: updates,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ clinic: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (e) {
    console.error("[PATCH /api//admin/clinics/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
