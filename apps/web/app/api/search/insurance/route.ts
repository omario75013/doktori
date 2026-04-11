import { NextResponse } from "next/server";
import { db, doctors, doctorInsurance } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  if (!type) return NextResponse.json({ error: "type requis" }, { status: 400 });

  const results = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      slug: doctors.slug,
      specialty: doctors.specialty,
      city: doctors.city,
      consultationFee: doctors.consultationFee,
    })
    .from(doctors)
    .innerJoin(doctorInsurance, eq(doctorInsurance.doctorId, doctors.id))
    .where(and(
      eq(doctorInsurance.insuranceType, type),
      eq(doctorInsurance.isConventioned, true),
      eq(doctors.isActive, true),
    ));

  return NextResponse.json(results);
}
