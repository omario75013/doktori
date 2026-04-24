import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, prescriptions, appointments } from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

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

    const { appointmentId, content } = await req.json();
    if (!appointmentId || typeof content !== "string" || content.length < 3 || content.length > 5000) {
      return NextResponse.json({ error: "Contenu invalide (3-5000 caractères)" }, { status: 400 });
    }

    // Verify doctor owns the appointment
    const [appt] = await db.select().from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, user.id)))
      .limit(1);

    if (!appt) return NextResponse.json({ error: "RDV introuvable" }, { status: 404 });

    const verificationToken = randomBytes(32).toString("hex");

    const [created] = await db.insert(prescriptions).values({
      appointmentId,
      doctorId: user.id,
      patientId: appt.patientId,
      content,
      verificationToken,
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[POST /api/prescriptions]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
