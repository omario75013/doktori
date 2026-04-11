import { NextResponse } from "next/server";
import { db, doctors, appointmentTypes } from "@doktori/db";
import { getAvailableSlots } from "@/lib/queries/appointments";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/doctors/by-slug/[slug]/availability?start=YYYY-MM-DD&days=14&typeId=...
 *
 * Returns a 14-day (or `days`) availability matrix for a doctor, Doctolib-style.
 * Response shape:
 *   {
 *     days: [
 *       { date: "2026-04-12", slots: [{ startTime: "09:00", endTime: "09:20" }, ...] },
 *       ...
 *     ]
 *   }
 *
 * Only AVAILABLE slots are returned (booked / past slots are filtered out server-side).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get("start");
  const daysParam = searchParams.get("days");
  const typeId = searchParams.get("typeId");

  const days = Math.min(Math.max(parseInt(daysParam ?? "14", 10) || 14, 1), 28);

  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.slug, slug))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  // Optional: honour appointment type duration
  let duration: number | undefined;
  if (typeId) {
    const [type] = await db
      .select({ durationMinutes: appointmentTypes.durationMinutes })
      .from(appointmentTypes)
      .where(
        and(
          eq(appointmentTypes.id, typeId),
          eq(appointmentTypes.doctorId, doctor.id),
        ),
      )
      .limit(1);
    if (type) duration = type.durationMinutes;
  }

  // Start date: either ?start=YYYY-MM-DD or today (local)
  const start = startParam ? new Date(`${startParam}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);

  const result: Array<{
    date: string;
    slots: Array<{ startTime: string; endTime: string }>;
  }> = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const slots = await getAvailableSlots(doctor.id, dateStr, duration);
    result.push({
      date: dateStr,
      slots: slots
        .filter((s) => s.available)
        .map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
    });
  }

  return NextResponse.json({ days: result });
}
