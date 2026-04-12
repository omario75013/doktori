import { NextRequest, NextResponse } from "next/server";
import { db, conversations, doctors } from "@doktori/db";
import { eq, desc } from "drizzle-orm";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const results = await db
    .select({
      id: conversations.id,
      status: conversations.status,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      doctorId: conversations.doctorId,
      doctorName: doctors.name,
      doctorSpecialty: doctors.specialty,
      doctorPhotoUrl: doctors.photoUrl,
    })
    .from(conversations)
    .innerJoin(doctors, eq(conversations.doctorId, doctors.id))
    .where(eq(conversations.patientId, patient.id))
    .orderBy(desc(conversations.lastMessageAt));

  return NextResponse.json(results);
}
