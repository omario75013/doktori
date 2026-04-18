import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { db, appointments, patients } from "@doktori/db";
import { eq, and, gte } from "drizzle-orm";

// RFC 5545 requires CRLF line endings
const CRLF = "\r\n";

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required");
  return new TextEncoder().encode(secret);
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// POST — generate a signed subscribe URL for the authenticated doctor
// The doctor calls this once from their agenda page to get the feed URL.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const sessionToken = authHeader.slice(7);

  // Validate the session token to extract doctor ID
  let doctorId: string;
  try {
    const { payload } = await jwtVerify(sessionToken, getSecret());
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }
    doctorId = sub;
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  // Generate a feed token valid for 90 days — doctor can revoke by regenerating
  const feedToken = await new SignJWT({ sub: doctorId, type: "calendar_feed" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(getSecret());

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://doktori.tn";
  const feedUrl = `${baseUrl}/api/doctor/calendar/feed?token=${feedToken}`;

  return NextResponse.json({ feedUrl });
}

// GET — serve the .ics feed (called by Google Calendar server-to-server, no session)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 401 });
  }

  let doctorId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.type !== "calendar_feed" || !payload.sub || typeof payload.sub !== "string") {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }
    doctorId = payload.sub;
  } catch {
    return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
  }

  const now = new Date();

  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      type: appointments.type,
      reason: appointments.reason,
      status: appointments.status,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.startsAt, now),
        eq(appointments.status, "confirmed"),
      ),
    )
    .limit(500);

  const events = rows.map((appt) => {
    // Redact PII: use initials only in the .ics file (calendar reminders, synced to third-party services)
    const initials = (appt.patientName ?? "")
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join(".");

    const summary =
      appt.type === "teleconsult"
        ? `RDV Vidéo Doktori - ${initials}`
        : `RDV Doktori - ${initials}`;

    const description = [
      // Phone intentionally omitted — PII must not be written to calendar files
      appt.reason ? `Motif: ${appt.reason}` : null,
    ]
      .filter(Boolean)
      .join("\\n");

    const location =
      appt.type === "teleconsult" ? "Téléconsultation Doktori" : "Cabinet médical";

    return [
      "BEGIN:VEVENT",
      `UID:${appt.id}@doktori.tn`,
      `DTSTART:${formatICSDate(appt.startsAt)}`,
      `DTEND:${formatICSDate(appt.endsAt)}`,
      `SUMMARY:${escapeICSText(summary)}`,
      description ? `DESCRIPTION:${description}` : "DESCRIPTION:",
      `LOCATION:${escapeICSText(location)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ].join(CRLF);
  });

  const ics =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Doktori//Appointments//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Mes RDV Doktori",
      "X-WR-TIMEZONE:Africa/Tunis",
      ...events,
      "END:VCALENDAR",
    ].join(CRLF) + CRLF;

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
