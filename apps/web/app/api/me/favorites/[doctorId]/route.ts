import { NextRequest, NextResponse } from "next/server";
import { db, patientFavorites } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ doctorId: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { doctorId } = await params;

  const [row] = await db
    .select({ id: patientFavorites.id })
    .from(patientFavorites)
    .where(
      and(eq(patientFavorites.patientId, patient.id), eq(patientFavorites.doctorId, doctorId)),
    )
    .limit(1);

  return NextResponse.json({ favorited: !!row });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ doctorId: string }> }) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { doctorId } = await params;

  await db
    .delete(patientFavorites)
    .where(
      and(eq(patientFavorites.patientId, patient.id), eq(patientFavorites.doctorId, doctorId)),
    );

  return NextResponse.json({ ok: true });
}
