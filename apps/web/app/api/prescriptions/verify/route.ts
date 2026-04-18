import { NextResponse } from "next/server";
import { db, prescriptions, doctors, patients } from "@doktori/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || token.length < 10) {
    return NextResponse.json({ valid: false, error: "Token manquant ou invalide." }, { status: 400 });
  }

  const [result] = await db
    .select({
      id: prescriptions.id,
      content: prescriptions.content,
      createdAt: prescriptions.createdAt,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      patientName: patients.name,
    })
    .from(prescriptions)
    .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .where(eq(prescriptions.verificationToken, token))
    .limit(1);

  if (!result) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    doctorName: result.doctorName,
    doctorSpecialty: result.doctorSpecialty,
    patientName: result.patientName,
    date: result.createdAt.toISOString(),
    content: result.content,
  });
}
