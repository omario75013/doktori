import { NextRequest, NextResponse } from "next/server";
import { db, clinicRdvRequests, clinicDoctors, doctors } from "@doktori/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";
import { getAvailableSlots } from "@/lib/queries/appointments";
import { SPECIALTIES } from "@doktori/shared";

// GET /api/clinique/rdv-requests/[id]/slots?date=YYYY-MM-DD&range=morning|afternoon|evening|any
// Returns: { doctors: [{ id, name, specialty, slots: [{ startTime, endTime }] }] }
// Slots are limited to the requested time range when provided.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireClinic();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  const [reqRow] = await db
    .select()
    .from(clinicRdvRequests)
    .where(
      and(eq(clinicRdvRequests.id, id), eq(clinicRdvRequests.clinicId, ctx.id)),
    )
    .limit(1);
  if (!reqRow) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? reqRow.preferredDate;
  const range =
    (url.searchParams.get("range") as
      | "morning"
      | "afternoon"
      | "evening"
      | "any"
      | null) ?? reqRow.preferredTimeRange;

  // Time-range bounds in HH:MM
  const bounds: Record<string, [string, string]> = {
    morning: ["08:00", "12:00"],
    afternoon: ["12:00", "17:00"],
    evening: ["17:00", "20:00"],
    any: ["00:00", "23:59"],
  };
  const [minTime, maxTime] = bounds[range ?? "any"] ?? bounds.any;

  // Resolve clinic doctors
  const memberRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, ctx.id));
  const doctorIds = memberRows.map((r) => r.doctorId);
  if (doctorIds.length === 0) {
    return NextResponse.json({ doctors: [] });
  }

  const doctorRows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
      consultationFee: doctors.consultationFee,
    })
    .from(doctors)
    .where(and(inArray(doctors.id, doctorIds), eq(doctors.isActive, true)));

  const results = await Promise.all(
    doctorRows.map(async (d) => {
      const slots = await getAvailableSlots(d.id, date);
      const available = slots
        .filter((s) => s.available && s.startTime >= minTime && s.startTime < maxTime)
        .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
      return {
        id: d.id,
        name: d.name,
        specialty:
          SPECIALTIES.find((sp) => sp.id === d.specialty)?.label ?? d.specialty,
        consultationFee: d.consultationFee,
        slots: available,
      };
    }),
  );

  return NextResponse.json({ doctors: results, date, range });
}
