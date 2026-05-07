import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { withAdminAudit } from "@/lib/admin-audit-wrapper";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
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

export const PUT = withAdminAudit<
  { ok: true; schedule: (typeof doctorSchedules.$inferSelect)[] },
  RouteContext
>({
  action: "doctors.schedule.update",
  resourceType: "doctors",
  getResourceId: async (_req, ctx) => (await ctx.params).id,
  getBefore: async ({ tx, resourceId }) => {
    const rows = await tx
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.doctorId, resourceId));
    return { slots: rows.length };
  },
  handler: async ({ tx, resourceId, body }) => {
    const b = (body ?? {}) as { slots?: SlotInput[] };
    if (!Array.isArray(b.slots)) {
      return NextResponse.json({ error: "slots requis" }, { status: 400 });
    }

    for (const s of b.slots) {
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

    const [doctor] = await tx.select().from(doctors).where(eq(doctors.id, resourceId)).limit(1);
    if (!doctor) {
      return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
    }

    const [defaultPractice] = await tx
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(eq(doctorPractices.doctorId, resourceId))
      .limit(1);
    if (!defaultPractice) {
      return NextResponse.json(
        { error: "Aucun cabinet trouvé pour ce médecin" },
        { status: 422 }
      );
    }

    await tx.delete(doctorSchedules).where(eq(doctorSchedules.doctorId, resourceId));
    const rows = b.slots.map((s) => ({
      doctorId: resourceId,
      practiceId: s.practiceId ?? defaultPractice.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDuration: s.slotDuration,
      isActive: s.isActive ?? true,
    }));
    const after = rows.length
      ? await tx.insert(doctorSchedules).values(rows).returning()
      : [];

    return { ok: true, schedule: after } as const;
  },
});
