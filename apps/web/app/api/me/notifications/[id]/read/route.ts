import { NextRequest, NextResponse } from "next/server";
import { db, patientNotifications } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const [row] = await db
    .update(patientNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(patientNotifications.id, id), eq(patientNotifications.patientId, patient.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
