import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, secretaryNotifications, appointments, patients } from "@doktori/db";
import { and, eq, gte, lte, desc, isNull, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "secretary") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const doctorId = session.user.doctorId;
  if (!doctorId) return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });

  // Raw feed (bells + messages + past events)
  const feed = await db
    .select()
    .from(secretaryNotifications)
    .where(eq(secretaryNotifications.secretaryId, session.user.id))
    .orderBy(desc(secretaryNotifications.createdAt))
    .limit(30);

  // Upcoming appointments (next 24h) — synthesized, not stored
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcoming = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      patientName: patients.name,
      patientPhone: patients.phone,
      status: appointments.status,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, now),
        lte(appointments.startsAt, soon)
      )
    )
    .orderBy(appointments.startsAt)
    .limit(10);

  const unread = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(secretaryNotifications)
    .where(
      and(
        eq(secretaryNotifications.secretaryId, session.user.id),
        isNull(secretaryNotifications.readAt)
      )
    );

  return NextResponse.json({
    unreadCount: Number(unread[0]?.c ?? 0),
    feed,
    upcoming,
  });
}

export async function PATCH() {
  // Mark all as read
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "secretary") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  await db
    .update(secretaryNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(secretaryNotifications.secretaryId, session.user.id),
        isNull(secretaryNotifications.readAt)
      )
    );
  return NextResponse.json({ ok: true });
}
