import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db, doctorSchedules, doctors, doctorPractices } from "@doktori/db";
import { eq, asc } from "drizzle-orm";

type SlotInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive?: boolean;
  practiceId?: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const rows = await db
    .select()
    .from(doctorSchedules)
    .where(eq(doctorSchedules.doctorId, id))
    .orderBy(asc(doctorSchedules.dayOfWeek), asc(doctorSchedules.startTime));

  return NextResponse.json({ schedule: rows });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = (await req.json()) as { slots: SlotInput[] };
    if (!Array.isArray(body.slots)) {
      return NextResponse.json({ error: "slots requis" }, { status: 400 });
    }

    for (const s of body.slots) {
      if (
        typeof s.dayOfWeek !== "number" ||
        s.dayOfWeek < 0 ||
        s.dayOfWeek > 6 ||
        typeof s.startTime !== "string" ||
        typeof s.endTime !== "string" ||
        typeof s.slotDuration !== "number"
      ) {
        return NextResponse.json({ error: "Créneau invalide" }, { status: 400 });
      }
    }

    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
    if (!doctor) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    // Resolve default practiceId for slots that don't specify one
    const [defaultPractice] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(eq(doctorPractices.doctorId, id))
      .limit(1);
    if (!defaultPractice) {
      return NextResponse.json({ error: "Aucun cabinet trouvé pour ce médecin" }, { status: 422 });
    }

    const before = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, id));

    await db.delete(doctorSchedules).where(eq(doctorSchedules.doctorId, id));
    const rows = body.slots.map((s) => ({
      doctorId: id,
      practiceId: s.practiceId ?? defaultPractice.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDuration: s.slotDuration,
      isActive: s.isActive ?? true,
    }));
    const after = rows.length
      ? await db.insert(doctorSchedules).values(rows).returning()
      : [];

    const meta = extractRequestMeta(req);
    await logAudit({
      actor: admin,
      action: "doctors.schedule.update",
      resourceType: "doctors",
      resourceId: id,
      before: { slots: before.length },
      after: { slots: after.length },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ ok: true, schedule: after });
  } catch (e) {
    console.error("[PUT /api//admin/doctors/[id]/schedule]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
