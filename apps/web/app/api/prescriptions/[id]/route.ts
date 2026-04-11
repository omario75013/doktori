import { NextResponse } from "next/server";
import { db, prescriptions, doctors, patients } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [result] = await db
    .select({
      id: prescriptions.id,
      content: prescriptions.content,
      createdAt: prescriptions.createdAt,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorPhone: doctors.phone,
      doctorAddress: doctors.address,
      patientName: patients.name,
      patientPhone: patients.phone,
    })
    .from(prescriptions)
    .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .where(eq(prescriptions.id, id))
    .limit(1);

  if (!result) return NextResponse.json({ error: "Ordonnance introuvable" }, { status: 404 });
  return NextResponse.json(result);
}
