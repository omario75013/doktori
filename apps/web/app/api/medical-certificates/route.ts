import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import {
  db,
  medicalCertificates,
  appointments,
  prescriptionTemplates,
} from "@doktori/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { logTemplateAudit } from "@/lib/templates/audit";
import { renderPrescriptionContent } from "@/lib/prescription-render";

// Doctor-side list of certificates the doctor has issued for a given
// patient. Mirrors GET /api/prescriptions exactly so the patient-fiche
// "Certificats" tab can fetch with the same query shape.
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
        id: medicalCertificates.id,
        title: medicalCertificates.title,
        content: medicalCertificates.content,
        createdAt: medicalCertificates.createdAt,
        appointmentId: medicalCertificates.appointmentId,
        verificationToken: medicalCertificates.verificationToken,
      })
      .from(medicalCertificates)
      .where(
        and(
          eq(medicalCertificates.patientId, patientId),
          eq(medicalCertificates.doctorId, user.id),
        ),
      )
      .orderBy(desc(medicalCertificates.createdAt));

    return NextResponse.json(rows);
  } catch (e) {
    console.error("[GET /api/medical-certificates]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const {
      appointmentId,
      patientId: rawPatientId,
      title,
      content,
      templateId,
    } = await req.json();

    if (typeof title !== "string" || title.length < 3 || title.length > 160) {
      return NextResponse.json(
        { error: "Titre invalide (3-160 caractères)" },
        { status: 400 },
      );
    }
    if (typeof content !== "string" || content.length < 3 || content.length > 8000) {
      return NextResponse.json(
        { error: "Contenu invalide (3-8000 caractères)" },
        { status: 400 },
      );
    }
    if (!appointmentId && !rawPatientId) {
      return NextResponse.json(
        { error: "appointmentId ou patientId requis" },
        { status: 400 },
      );
    }

    let resolvedPatientId: string;
    if (appointmentId) {
      const [appt] = await db
        .select()
        .from(appointments)
        .where(
          and(eq(appointments.id, appointmentId), eq(appointments.doctorId, user.id)),
        )
        .limit(1);
      if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });
      if (!appt.patientId) {
        return NextResponse.json(
          { error: "RDV sans patient identifié" },
          { status: 400 },
        );
      }
      resolvedPatientId = appt.patientId;
    } else {
      const [link] = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, user.id),
            eq(appointments.patientId, rawPatientId),
          ),
        )
        .limit(1);
      if (!link) {
        return NextResponse.json({ error: "Patient non lié au médecin" }, { status: 403 });
      }
      resolvedPatientId = rawPatientId;
    }

    const verificationToken = randomBytes(32).toString("hex");

    // Reuse the prescription render context — the variables are the
    // same (doctor info, patient info, date_today, etc.). Resolving at
    // POST time means the stored row no longer contains placeholders.
    const resolvedContent = await renderPrescriptionContent(
      content,
      user.id,
      resolvedPatientId,
      appointmentId ?? null,
    );

    const [created] = await db
      .insert(medicalCertificates)
      .values({
        appointmentId: appointmentId ?? null,
        doctorId: user.id,
        patientId: resolvedPatientId,
        title: title.trim(),
        content: resolvedContent,
        verificationToken,
        templateId: templateId ?? null,
      })
      .returning();

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
            eq(prescriptionTemplates.doctorId, user.id),
          ),
        );

      await logTemplateAudit({
        actorType: "doctor",
        actorId: user.id,
        templateId,
        action: "applied",
        context: {
          certificateId: created.id,
          appointmentId: appointmentId ?? null,
        },
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[POST /api/medical-certificates]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
