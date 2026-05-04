import { NextRequest, NextResponse } from "next/server";
import { db, appointments, doctors, doctorPractices } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// Format Date as iCal UTC: YYYYMMDDTHHMMSSZ
function toIcsUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

// Escape iCal text per RFC 5545
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [row] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      type: appointments.type,
      reason: appointments.reason,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorAddress: doctors.address,
      practiceAddress: doctorPractices.address,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(doctorPractices, eq(appointments.practiceId, doctorPractices.id))
    .where(and(eq(appointments.id, id), eq(appointments.patientId, patient.id)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const summary = `RDV avec Dr. ${row.doctorName}`;
  const location =
    row.type === "teleconsult"
      ? "Téléconsultation Doktori"
      : row.practiceAddress ?? row.doctorAddress ?? "";
  const description = [
    `Médecin : Dr. ${row.doctorName}${row.doctorSpecialty ? ` (${row.doctorSpecialty})` : ""}`,
    row.reason ? `Motif : ${row.reason}` : null,
    "Géré sur Doktori — https://doktori.tn",
  ]
    .filter(Boolean)
    .join("\n");

  const dtstamp = toIcsUtc(new Date());
  const dtstart = toIcsUtc(row.startsAt);
  const dtend = toIcsUtc(row.endsAt);
  const uid = `appointment-${row.id}@doktori.tn`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Doktori//RDV//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    location ? `LOCATION:${esc(location)}` : null,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel rendez-vous",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];

  // RFC 5545: lines should be CRLF-terminated
  const body = lines.join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="doktori-${row.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
