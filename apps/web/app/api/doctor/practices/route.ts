import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctorPractices } from "@doktori/db";
import { eq, and, asc, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const practices = await db
    .select()
    .from(doctorPractices)
    .where(eq(doctorPractices.doctorId, session.user.id))
    .orderBy(desc(doctorPractices.isPrimary), asc(doctorPractices.createdAt));

  return NextResponse.json(practices);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { name, address, city, latitude, longitude, phone, isPrimary } = body;

    if (!name || typeof name !== "string" || name.trim().length < 1 || name.length > 100) {
      return NextResponse.json({ error: "Nom invalide (1-100 caractères)" }, { status: 400 });
    }
    if (!address || typeof address !== "string" || address.trim().length < 1) {
      return NextResponse.json({ error: "Adresse requise" }, { status: 400 });
    }
    if (!city || typeof city !== "string" || city.trim().length < 1 || city.length > 100) {
      return NextResponse.json({ error: "Ville requise" }, { status: 400 });
    }

    // Check if doctor already has any practice (to force isPrimary when first)
    const existing = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(eq(doctorPractices.doctorId, session.user.id))
      .limit(1);

    const shouldBePrimary = existing.length === 0 ? true : !!isPrimary;

    const result = await db.transaction(async (tx) => {
      // If this practice should be primary, demote all others first
      if (shouldBePrimary) {
        await tx
          .update(doctorPractices)
          .set({ isPrimary: false })
          .where(
            and(
              eq(doctorPractices.doctorId, session.user.id),
              eq(doctorPractices.isPrimary, true),
            )
          );
      }

      const [created] = await tx
        .insert(doctorPractices)
        .values({
          doctorId: session.user.id,
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          phone: phone ?? null,
          isPrimary: shouldBePrimary,
        })
        .returning();

      return created;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("[POST /api//doctor/practices]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
