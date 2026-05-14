import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorPractices, clinics } from "@doktori/db";
import { eq, and, asc, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user || (user.role !== "doctor" && user.role !== "secretary")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const doctorId = user.role === "doctor" ? user.id : (user as { doctorId: string }).doctorId;

  const rows = await db
    .select({
      id: doctorPractices.id,
      doctorId: doctorPractices.doctorId,
      name: doctorPractices.name,
      address: doctorPractices.address,
      city: doctorPractices.city,
      latitude: doctorPractices.latitude,
      longitude: doctorPractices.longitude,
      phone: doctorPractices.phone,
      isPrimary: doctorPractices.isPrimary,
      isActive: doctorPractices.isActive,
      clinicId: doctorPractices.clinicId,
      kind: doctorPractices.kind,
      photos: doctorPractices.photos,
      createdAt: doctorPractices.createdAt,
      clinicName: clinics.name,
    })
    .from(doctorPractices)
    .leftJoin(clinics, eq(doctorPractices.clinicId, clinics.id))
    .where(eq(doctorPractices.doctorId, doctorId))
    .orderBy(desc(doctorPractices.isPrimary), asc(doctorPractices.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user || user.role !== "doctor") {
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
      .where(eq(doctorPractices.doctorId, user.id))
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
              eq(doctorPractices.doctorId, user.id),
              eq(doctorPractices.isPrimary, true),
            )
          );
      }

      const [created] = await tx
        .insert(doctorPractices)
        .values({
          doctorId: user.id,
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
