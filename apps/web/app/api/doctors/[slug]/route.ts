import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [doctor] = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      slug: doctors.slug,
      specialty: doctors.specialty,
      city: doctors.city,
      address: doctors.address,
      photoUrl: doctors.photoUrl,
      bio: doctors.bio,
      consultationFee: doctors.consultationFee,
    })
    .from(doctors)
    .where(eq(doctors.slug, slug))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  return NextResponse.json(doctor);
}
