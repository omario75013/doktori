import { NextResponse } from "next/server";
import { db, clinics, clinicDoctors, doctors } from "@doktori/db";
import { eq, inArray, and } from "drizzle-orm";
import { getAvailableSlots } from "@/lib/queries/appointments";

/**
 * Returns the set of dates within [from, to] where at least one doctor of the
 * clinic has ≥1 available slot. Caller uses this to grey-out days in the
 * calendar so the patient can only request days where the clinic can fulfill.
 *
 * Query params:
 *   from=YYYY-MM-DD (default today)
 *   to=YYYY-MM-DD   (default today + 30 days)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = fromStr ? new Date(fromStr) : today;
  const to = toStr ? new Date(toStr) : new Date(today.getTime() + 30 * 86400000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
  }
  if (to < from) {
    return NextResponse.json({ error: "Plage de dates invalide" }, { status: 400 });
  }
  // Hard cap range to 60 days
  const maxTo = new Date(from.getTime() + 60 * 86400000);
  const effectiveTo = to > maxTo ? maxTo : to;

  const [clinic] = await db
    .select({ id: clinics.id })
    .from(clinics)
    .where(eq(clinics.slug, slug))
    .limit(1);
  if (!clinic) {
    return NextResponse.json({ error: "Clinique introuvable" }, { status: 404 });
  }

  const cdRows = await db
    .select({ doctorId: clinicDoctors.doctorId })
    .from(clinicDoctors)
    .where(eq(clinicDoctors.clinicId, clinic.id));
  const doctorIds = cdRows.map((r) => r.doctorId);
  if (doctorIds.length === 0) {
    return NextResponse.json({ availableDates: [] });
  }

  const activeDoctors = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(and(inArray(doctors.id, doctorIds), eq(doctors.isActive, true)));
  const activeIds = activeDoctors.map((d) => d.id);
  if (activeIds.length === 0) {
    return NextResponse.json({ availableDates: [] });
  }

  // Iterate days; for each day, short-circuit as soon as one doctor has a slot.
  const availableDates: string[] = [];
  const cursor = new Date(from);
  while (cursor <= effectiveTo) {
    const dateStr = cursor.toISOString().slice(0, 10);
    let foundForDay = false;
    for (const doctorId of activeIds) {
      const slots = await getAvailableSlots(doctorId, dateStr);
      if (slots.some((s) => s.available)) {
        foundForDay = true;
        break;
      }
    }
    if (foundForDay) availableDates.push(dateStr);
    cursor.setDate(cursor.getDate() + 1);
  }

  return NextResponse.json({ availableDates });
}
