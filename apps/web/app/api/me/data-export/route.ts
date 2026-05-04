import { NextRequest, NextResponse } from "next/server";
import {
  db,
  patients,
  appointments,
  prescriptions,
  messages,
  conversations,
  patientNotifications,
  patientConsents,
} from "@doktori/db";
import { eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { buildExportZip } from "@/lib/data-export";
import { format } from "date-fns";

export async function POST(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const patientId = session.id;

  // 1. Profile
  const [patient] = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      bloodType: patients.bloodType,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!patient) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // 2. Appointments
  const appts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      doctorId: appointments.doctorId,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(eq(appointments.patientId, patientId));

  // 3. Prescriptions
  const rxList = await db
    .select({
      id: prescriptions.id,
      appointmentId: prescriptions.appointmentId,
      content: prescriptions.content,
      createdAt: prescriptions.createdAt,
    })
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId));

  // 4. Messages (via conversations)
  const convs = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.patientId, patientId));

  let msgRows: Record<string, unknown>[] = [];
  if (convs.length > 0) {
    const convIds = convs.map((c) => c.id);
    // Build messages by querying each conversation individually (MVP approach)
    msgRows = [];
    for (const convId of convIds) {
      const convMessages = await db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderType: messages.senderType,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, convId));
      msgRows.push(...convMessages.map((m) => ({ ...m, createdAt: m.createdAt?.toISOString() ?? "" })));
    }
  }

  // 5. Notifications
  const notifs = await db
    .select()
    .from(patientNotifications)
    .where(eq(patientNotifications.patientId, patientId));

  // 6. Consents
  const consents = await db
    .select()
    .from(patientConsents)
    .where(eq(patientConsents.patientId, patientId));

  const zip = buildExportZip({
    profile: { ...patient, dateOfBirth: patient.dateOfBirth ?? null, createdAt: patient.createdAt?.toISOString() },
    appointments: appts.map((a) => ({
      ...a,
      startsAt: a.startsAt?.toISOString() ?? "",
      endsAt: a.endsAt?.toISOString() ?? "",
      createdAt: a.createdAt?.toISOString() ?? "",
    })),
    prescriptions: rxList.map((r) => ({
      ...r,
      createdAt: r.createdAt?.toISOString() ?? "",
    })),
    messages: msgRows,
    notifications: notifs.map((n) => ({
      ...n,
      createdAt: n.createdAt?.toISOString() ?? "",
      readAt: n.readAt?.toISOString() ?? null,
    })),
    consents: consents.map((c) => ({
      ...c,
      grantedAt: c.grantedAt?.toISOString() ?? "",
    })),
  });

  const dateStr = format(new Date(), "yyyy-MM-dd");

  return new NextResponse(zip, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="doktori-export-${dateStr}.zip"`,
      "Content-Length": String(zip.byteLength),
    },
  });
}
