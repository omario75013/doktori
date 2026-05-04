import { NextRequest, NextResponse } from "next/server";
import { db, patientFavorites, doctors } from "@doktori/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getPatientFromRequest } from "@/lib/patient-auth";

export async function GET(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const rows = await db
    .select({
      id: patientFavorites.id,
      createdAt: patientFavorites.createdAt,
      doctorId: doctors.id,
      doctorName: doctors.name,
      doctorSlug: doctors.slug,
      doctorSpecialty: doctors.specialty,
      doctorAddress: doctors.address,
      doctorPhotoUrl: doctors.photoUrl,
    })
    .from(patientFavorites)
    .innerJoin(doctors, eq(patientFavorites.doctorId, doctors.id))
    .where(eq(patientFavorites.patientId, patient.id))
    .orderBy(desc(patientFavorites.createdAt));

  return NextResponse.json({ items: rows });
}

const postSchema = z.object({ doctorId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "doctorId requis" }, { status: 400 });
  }

  const { doctorId } = parsed.data;

  // Idempotent: ignore duplicate
  const [existing] = await db
    .select({ id: patientFavorites.id })
    .from(patientFavorites)
    .where(
      and(
        eq(patientFavorites.patientId, patient.id),
        eq(patientFavorites.doctorId, doctorId),
      ),
    )
    .limit(1);

  if (existing) return NextResponse.json({ ok: true, id: existing.id });

  const [row] = await db
    .insert(patientFavorites)
    .values({ patientId: patient.id, doctorId })
    .returning({ id: patientFavorites.id });

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
