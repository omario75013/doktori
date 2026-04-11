import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { doctorRegistrationSchema } from "@doktori/validation";
import { generateSlug } from "@doktori/shared";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = doctorRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(doctors)
    .where(eq(doctors.email, parsed.data.email))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
  }

  const slug = generateSlug(parsed.data.name, parsed.data.specialty, parsed.data.city);
  const passwordHash = await hash(parsed.data.password, 12);

  const [doctor] = await db
    .insert(doctors)
    .values({
      name: parsed.data.name,
      slug,
      email: parsed.data.email,
      passwordHash,
      phone: parsed.data.phone,
      specialty: parsed.data.specialty,
      city: parsed.data.city,
      address: parsed.data.address,
      consultationFee: parsed.data.consultationFee ? parsed.data.consultationFee * 1000 : null,
      bio: parsed.data.bio,
    })
    .returning({ id: doctors.id, slug: doctors.slug });

  return NextResponse.json({ id: doctor.id, slug: doctor.slug }, { status: 201 });
}
