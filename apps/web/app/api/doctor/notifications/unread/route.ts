import { NextResponse } from "next/server";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";
import { db, appointments, patients } from "@doktori/db";
import { and, eq, gte, desc } from "drizzle-orm";

// GET /api/doctor/notifications/unread
// Returns count of appointments booked by patients in the last 24 hours,
// plus the last 5 for the dropdown. "Seen" state is managed client-side
// via localStorage (lastSeenAt).
export async function GET() {
  const actor = await requireDoctorOrSecretary();
  if (actor instanceof NextResponse) return actor;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recent = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      createdAt: appointments.createdAt,
      patientName: patients.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, actor.doctorId),
        gte(appointments.createdAt, since),
      )
    )
    .orderBy(desc(appointments.createdAt))
    .limit(5);

  // Total count in the last 24h (the latest 5 rows cover it since we limit to 5,
  // but count is returned separately for the badge — we count within the fetched rows
  // because the caller uses localStorage to determine "unseen". The API just returns
  // total within 24h so the badge can be computed client-side with lastSeenAt.)
  const countRows = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, actor.doctorId),
        gte(appointments.createdAt, since),
      )
    );

  return NextResponse.json({
    count: countRows.length,
    latest: recent.map((r) => ({
      id: r.id,
      startsAt: r.startsAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      patientName: r.patientName,
    })),
  });
}
