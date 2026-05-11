import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, prescriptions, appointments, prescriptionTemplates } from "@doktori/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { logTemplateAudit } from "@/lib/templates/audit";
import { renderPrescriptionContent } from "@/lib/prescription-render";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    if (!patientId) {
      return NextResponse.json({ error: "patientId requis" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: prescriptions.id,
        content: prescriptions.content,
        createdAt: prescriptions.createdAt,
        appointmentId: prescriptions.appointmentId,
        verificationToken: prescriptions.verificationToken,
      })
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.patientId, patientId),
          eq(prescriptions.doctorId, user.id),
        ),
      )
      .orderBy(desc(prescriptions.createdAt));

    return NextResponse.json(rows);
  } catch (e) {
    console.error("[GET /api/prescriptions]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { appointmentId, patientId: rawPatientId, content, templateId } = await req.json();
    if (typeof content !== "string" || content.length < 3 || content.length > 5000) {
      return NextResponse.json({ error: "Contenu invalide (3-5000 caractères)" }, { status: 400 });
    }
    if (!appointmentId && !rawPatientId) {
      return NextResponse.json({ error: "appointmentId ou patientId requis" }, { status: 400 });
    }

    let resolvedPatientId: string;
    if (appointmentId) {
      // Verify doctor owns the appointment
      const [appt] = await db.select().from(appointments)
        .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, user.id)))
        .limit(1);
      if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
      resolvedPatientId = appt.patientId;
    } else {
      // No appointment: doctor must have at least one prior appointment with this patient
      const [link] = await db.select().from(appointments)
        .where(and(eq(appointments.doctorId, user.id), eq(appointments.patientId, rawPatientId)))
        .limit(1);
      if (!link) return NextResponse.json({ error: "Patient non lié au médecin" }, { status: 403 });
      resolvedPatientId = rawPatientId;
    }

    const verificationToken = randomBytes(32).toString("hex");

    // Resolve any {{...}} placeholders before insert so the row is stored
    // with real values (defends against clients that POST raw template
    // markup). Display layers also re-render defensively.
    const resolvedContent = await renderPrescriptionContent(
      content,
      user.id,
      resolvedPatientId,
      appointmentId ?? null,
    );

    const [created] = await db.insert(prescriptions).values({
      appointmentId: appointmentId ?? null,
      doctorId: user.id,
      patientId: resolvedPatientId,
      content: resolvedContent,
      verificationToken,
      // B4: store templateId if provided
      templateId: templateId ?? null,
    }).returning();

    // B3 + B4: if templateId provided, increment applyCount + lastUsedAt on own template
    if (templateId) {
      await db
        .update(prescriptionTemplates)
        .set({
          applyCount: sql`${prescriptionTemplates.applyCount} + 1`,
          lastUsedAt: new Date(),
        })
        .where(
          and(
            eq(prescriptionTemplates.id, templateId),
            eq(prescriptionTemplates.doctorId, user.id)
          )
        );

      // B5 audit bilateral
      await logTemplateAudit({
        actorType: "doctor",
        actorId: user.id,
        templateId,
        action: "applied",
        context: { prescriptionId: created.id, appointmentId: appointmentId ?? null },
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[POST /api/prescriptions]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
