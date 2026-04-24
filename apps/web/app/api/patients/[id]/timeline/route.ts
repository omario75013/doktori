import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  db,
  appointments,
  consultationNotes,
  prescriptions,
  patientAttachments,
  patientTimelineEvents,
  patientMedicalProfile,
  patients,
} from "@doktori/db";
import { and, eq, desc, isNull } from "drizzle-orm";

type TimelineEvent = {
  id: string;
  kind:
    | "appointment"
    | "consultation"
    | "prescription"
    | "attachment"
    | "manual"
    | "profile_updated"
    | "medical_updated";
  title: string;
  body: string | null;
  occurredAt: string;
  meta?: Record<string, unknown>;
};

async function authorize(
  patientId: string
): Promise<{ doctorId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "doctor" && role !== "secretary") {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }
  const doctorId =
    role === "doctor" ? session.user.id : session.user.doctorId;
  if (!doctorId) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }
  const [link] = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(eq(appointments.patientId, patientId), eq(appointments.doctorId, doctorId))
    )
    .limit(1);
  if (!link) {
    return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });
  }
  return { doctorId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authz = await authorize(id);
  if (authz instanceof NextResponse) return authz;

  const events: TimelineEvent[] = [];

  // Appointments (doctor-scoped)
  const appts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      type: appointments.type,
      reason: appointments.reason,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, id),
        eq(appointments.doctorId, authz.doctorId)
      )
    )
    .orderBy(desc(appointments.startsAt));

  for (const a of appts) {
    events.push({
      id: `appt-${a.id}`,
      kind: "appointment",
      title:
        a.status === "completed"
          ? "Consultation effectuée"
          : a.status === "cancelled"
          ? "Rendez-vous annulé"
          : a.status === "no_show"
          ? "Absence (no-show)"
          : "Rendez-vous programmé",
      body: a.reason ?? null,
      occurredAt: a.startsAt.toISOString(),
      meta: { appointmentId: a.id, status: a.status, type: a.type },
    });
  }

  // Consultation notes
  const notes = await db
    .select({
      id: consultationNotes.id,
      appointmentId: consultationNotes.appointmentId,
      assessment: consultationNotes.assessment,
      plan: consultationNotes.plan,
      createdAt: consultationNotes.createdAt,
    })
    .from(consultationNotes)
    .where(
      and(
        eq(consultationNotes.patientId, id),
        eq(consultationNotes.doctorId, authz.doctorId)
      )
    );

  for (const n of notes) {
    events.push({
      id: `note-${n.id}`,
      kind: "consultation",
      title: "Note clinique (SOAP)",
      body: [n.assessment, n.plan].filter(Boolean).join("\n\n").slice(0, 600) || null,
      occurredAt: n.createdAt.toISOString(),
      meta: { noteId: n.id, appointmentId: n.appointmentId },
    });
  }

  // Prescriptions
  const rx = await db
    .select({
      id: prescriptions.id,
      createdAt: prescriptions.createdAt,
      appointmentId: prescriptions.appointmentId,
    })
    .from(prescriptions)
    .where(
      and(
        eq(prescriptions.patientId, id),
        eq(prescriptions.doctorId, authz.doctorId)
      )
    );

  for (const p of rx) {
    events.push({
      id: `rx-${p.id}`,
      kind: "prescription",
      title: "Ordonnance émise",
      body: null,
      occurredAt: p.createdAt.toISOString(),
      meta: { prescriptionId: p.id, appointmentId: p.appointmentId },
    });
  }

  // Attachments (all doctors who share care see uploads for this patient)
  const atts = await db
    .select({
      id: patientAttachments.id,
      category: patientAttachments.category,
      title: patientAttachments.title,
      filename: patientAttachments.filename,
      uploadedAt: patientAttachments.uploadedAt,
    })
    .from(patientAttachments)
    .where(
      and(
        eq(patientAttachments.patientId, id),
        isNull(patientAttachments.deletedAt)
      )
    );

  for (const a of atts) {
    events.push({
      id: `att-${a.id}`,
      kind: "attachment",
      title: `Document ajouté — ${a.title}`,
      body: `${a.category} — ${a.filename}`,
      occurredAt: a.uploadedAt.toISOString(),
      meta: { attachmentId: a.id, category: a.category },
    });
  }

  // Manual timeline entries (doctor-scoped only)
  const manual = await db
    .select({
      id: patientTimelineEvents.id,
      kind: patientTimelineEvents.kind,
      title: patientTimelineEvents.title,
      body: patientTimelineEvents.body,
      occurredAt: patientTimelineEvents.occurredAt,
    })
    .from(patientTimelineEvents)
    .where(
      and(
        eq(patientTimelineEvents.patientId, id),
        eq(patientTimelineEvents.doctorId, authz.doctorId)
      )
    );

  for (const e of manual) {
    events.push({
      id: `manual-${e.id}`,
      kind: "manual",
      title: e.title,
      body: e.body,
      occurredAt: e.occurredAt.toISOString(),
      meta: { manualKind: e.kind },
    });
  }

  // Medical profile last update
  const [med] = await db
    .select({
      updatedAt: patientMedicalProfile.updatedAt,
    })
    .from(patientMedicalProfile)
    .where(eq(patientMedicalProfile.patientId, id))
    .limit(1);

  if (med?.updatedAt) {
    events.push({
      id: `med-${id}`,
      kind: "medical_updated",
      title: "Dossier médical mis à jour",
      body: null,
      occurredAt: med.updatedAt.toISOString(),
    });
  }

  // Patient profile creation
  const [pat] = await db
    .select({ createdAt: patients.createdAt })
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);

  if (pat?.createdAt) {
    events.push({
      id: `create-${id}`,
      kind: "profile_updated",
      title: "Patient créé",
      body: null,
      occurredAt: pat.createdAt.toISOString(),
    });
  }

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return NextResponse.json({ events });
}

// POST — create a manual timeline entry (doctor-facing journal note)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authz = await authorize(id);
  if (authz instanceof NextResponse) return authz;

  const body = (await req.json().catch(() => null)) as
    | { title?: string; body?: string; kind?: string; occurredAt?: string }
    | null;

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Titre manquant" }, { status: 400 });
  }

  const [row] = await db
    .insert(patientTimelineEvents)
    .values({
      patientId: id,
      doctorId: authz.doctorId,
      kind: (body?.kind?.trim() || "note").slice(0, 40),
      title: title.slice(0, 200),
      body: body?.body?.trim() || null,
      occurredAt:
        body?.occurredAt && !isNaN(Date.parse(body.occurredAt))
          ? new Date(body.occurredAt)
          : new Date(),
    })
    .returning({
      id: patientTimelineEvents.id,
      kind: patientTimelineEvents.kind,
      title: patientTimelineEvents.title,
      body: patientTimelineEvents.body,
      occurredAt: patientTimelineEvents.occurredAt,
    });

  return NextResponse.json({ event: row });
}
