import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, appointments, patients, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";

// RFC 5545 requires CRLF line endings in .ics files
const CRLF = "\r\n";

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  const { id } = await params;

  // Single JOIN query replaces 3 sequential queries
  const [row] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      type: appointments.type,
      reason: appointments.reason,
      patientName: patients.name,
      doctorAddress: doctors.address,
      doctorCity: doctors.city,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(and(eq(appointments.id, id), eq(appointments.doctorId, doctor.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
  }

  const appt = row;
  const patient = { name: row.patientName };
  const doctorRow = { address: row.doctorAddress, city: row.doctorCity };

  const patientName = patient?.name ?? "Patient";
  // Redact PII: use initials only in the .ics file (synced to third-party calendar services)
  const initials = patientName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join(".");

  const location =
    appt.type === "teleconsult"
      ? "Téléconsultation Doktori"
      : doctorRow
        ? escapeICSText(`${doctorRow.address}, ${doctorRow.city}`)
        : "Cabinet médical";

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

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Doktori//Appointments//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appt.id}@doktori.tn`,
    `DTSTART:${formatICSDate(appt.startsAt)}`,
    `DTEND:${formatICSDate(appt.endsAt)}`,
    `SUMMARY:${escapeICSText(summary)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:CONFIRMED`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join(CRLF) + CRLF;

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rdv-doktori-${id.slice(0, 8)}.ics"`,
    },
  });
}
