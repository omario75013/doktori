import { NextRequest, NextResponse } from "next/server";
import { cancelAppointment } from "@/lib/queries/appointments";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  // patientId comes from verified JWT, not from request body (IDOR protection)
  const result = await cancelAppointment(id, patient.id);
  if (!result) return NextResponse.json({ error: "RDV introuvable ou déjà annulé" }, { status: 404 });

  return NextResponse.json(result);
}
