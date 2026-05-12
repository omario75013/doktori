import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getAvailableSlots } from "@/lib/queries/appointments";

// Authenticated availability endpoint for the doctor's own agenda.
// Used by the "Prendre RDV" flow under Référencements + by the "New
// RDV" modal so the doctor sees only the slots compatible with their
// schedule, breaks, days-off, and existing bookings.
//
// GET /api/doctor/availability?date=YYYY-MM-DD[&days=N][&duration=MIN][&practiceId=...]
//   default days=1, max 14
//
// Response:
//   { days: [{ date, slots: [{ startTime, endTime, practiceId }] }] }
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || user.role !== "doctor") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const daysParam = searchParams.get("days");
  const durationParam = searchParams.get("duration");
  const practiceId = searchParams.get("practiceId") ?? undefined;

  const start = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }
  start.setHours(0, 0, 0, 0);

  const days = Math.min(Math.max(parseInt(daysParam ?? "1", 10) || 1, 1), 14);
  const duration = durationParam ? Math.max(5, parseInt(durationParam, 10) || 0) : undefined;

  const result: Array<{
    date: string;
    slots: Array<{ startTime: string; endTime: string; practiceId: string }>;
  }> = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const slots = await getAvailableSlots(user.id, dateStr, duration, practiceId);
    result.push({ date: dateStr, slots });
  }

  return NextResponse.json({ days: result });
}
