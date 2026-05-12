import { NextResponse } from "next/server";
import { requireDoctorOrSecretary } from "@/lib/secretary-auth";
import { db, appointments, patients, doctors, doctorNotifications } from "@doktori/db";
import { and, eq, gte, desc, or, inArray } from "drizzle-orm";

// GET /api/doctor/notifications/unread
//
// Surfaces two streams in one feed for the topbar bell:
//   (a) Appointments booked in the last 24h (legacy "new bookings" signal,
//       counted for both doctor and secretary).
//   (b) Unread doctor_notifications rows (connection_request, patient
//       cancel/reschedule, referral events). Doctor-only — secretaries
//       don't see peer-network events on their bell.
//
// "Seen" state for stream (a) is still client-side via the
// `doktori_notif_last_seen` localStorage key. Stream (b) is server-tracked
// via doctor_notifications.read_at.
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
      ),
    )
    .orderBy(desc(appointments.createdAt))
    .limit(5);

  type FeedEntry = {
    id: string;
    kind: "booking" | "doctor_event";
    type?: string;
    patientName?: string | null;
    requesterName?: string | null;
    startsAt?: string;
    createdAt: string;
    href: string;
  };

  const feed: FeedEntry[] = recent.map((r) => ({
    id: r.id,
    kind: "booking",
    patientName: r.patientName,
    createdAt: r.createdAt.toISOString(),
    startsAt: r.startsAt.toISOString(),
    href: "/rendez-vous",
  }));

  let unreadCount = recent.length;

  if (actor.role === "doctor") {
    const events = await db
      .select({
        id: doctorNotifications.id,
        type: doctorNotifications.type,
        payload: doctorNotifications.payload,
        readAt: doctorNotifications.readAt,
        createdAt: doctorNotifications.createdAt,
      })
      .from(doctorNotifications)
      .where(
        and(
          eq(doctorNotifications.doctorId, actor.doctorId),
          gte(doctorNotifications.createdAt, since),
        ),
      )
      .orderBy(desc(doctorNotifications.createdAt))
      .limit(20);

    // Resolve any peer-doctor UUID embedded in the payload — requesterId
    // (connection_request), byDoctorId (connection_accepted), senderId
    // (peer_message). Any value matching a doctor row will be displayed.
    const peerIdFields = ["requesterId", "byDoctorId", "senderId", "fromDoctorId"] as const;
    const peerIds = events
      .flatMap((e) => {
        const p = (e.payload ?? {}) as Record<string, unknown>;
        return peerIdFields
          .map((k) => p[k])
          .filter((v): v is string => typeof v === "string");
      });
    const nameById = new Map<string, string>();
    if (peerIds.length > 0) {
      const rows = await db
        .select({ id: doctors.id, name: doctors.name })
        .from(doctors)
        .where(inArray(doctors.id, peerIds));
      for (const r of rows) nameById.set(r.id, r.name);
    }

    for (const e of events) {
      const p = (e.payload ?? {}) as Record<string, unknown>;
      const requesterId = typeof p.requesterId === "string" ? p.requesterId : null;
      const byDoctorId = typeof p.byDoctorId === "string" ? p.byDoctorId : null;
      const senderId = typeof p.senderId === "string" ? p.senderId : null;
      const fromDoctorId = typeof p.fromDoctorId === "string" ? p.fromDoctorId : null;
      const peerId = requesterId ?? byDoctorId ?? senderId ?? fromDoctorId;
      const patientName = typeof p.patientName === "string" ? p.patientName : null;
      const conversationId =
        typeof p.conversationId === "string" ? p.conversationId : null;
      const href =
        e.type === "connection_request" || e.type === "connection_accepted"
          ? "/reseau"
          : e.type === "peer_message"
            ? `/messagerie${conversationId ? `?conv=${conversationId}` : ""}`
            : e.type === "appointment_cancelled_by_patient" ||
                e.type === "appointment_rescheduled_by_patient" ||
                e.type === "appointment_booked"
              ? "/rendez-vous"
              : e.type?.startsWith("referral")
                ? "/reseau/referencements"
                : "/dashboard";
      feed.push({
        id: e.id,
        kind: "doctor_event",
        type: e.type,
        patientName,
        requesterName: peerId ? (nameById.get(peerId) ?? null) : null,
        createdAt: (e.createdAt instanceof Date
          ? e.createdAt
          : new Date(e.createdAt as unknown as string)
        ).toISOString(),
        href,
      });
      if (!e.readAt) unreadCount += 1;
    }
  }

  // Newest first, cap dropdown at 10 entries.
  feed.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({
    count: unreadCount,
    latest: feed.slice(0, 10),
  });
}
