import { NextResponse } from "next/server";
import { db, medicalCertificates, doctors, patients } from "@doktori/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || token.length < 10) {
    return NextResponse.json(
      { valid: false, error: "Token manquant ou invalide." },
      { status: 400 },
    );
  }

  const [result] = await db
    .select({
      id: medicalCertificates.id,
      title: medicalCertificates.title,
      content: medicalCertificates.content,
      createdAt: medicalCertificates.createdAt,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      patientName: patients.name,
    })
    .from(medicalCertificates)
    .innerJoin(doctors, eq(medicalCertificates.doctorId, doctors.id))
    .innerJoin(patients, eq(medicalCertificates.patientId, patients.id))
    .where(eq(medicalCertificates.verificationToken, token))
    .limit(1);

  if (!result) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    title: result.title,
    doctorName: result.doctorName,
    doctorSpecialty: result.doctorSpecialty,
    patientName: result.patientName,
    date: result.createdAt.toISOString(),
    content: result.content,
  });
}
