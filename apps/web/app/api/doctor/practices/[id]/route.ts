import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { db, doctorPractices } from "@doktori/db";
import { eq, and, ne } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req as unknown as NextRequest);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const [practice] = await db
      .select()
      .from(doctorPractices)
      .where(and(eq(doctorPractices.id, id), eq(doctorPractices.doctorId, user.id)))
      .limit(1);

    if (!practice) {
      return NextResponse.json({ error: "Cabinet introuvable" }, { status: 404 });
    }

    const body = await req.json();
    const { name, address, city, latitude, longitude, phone, isPrimary, isActive } = body;

    // Build update payload with only provided fields
    const updates: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof address === "string" && address.trim()) updates.address = address.trim();
    if (typeof city === "string" && city.trim()) updates.city = city.trim();
    if (latitude !== undefined) updates.latitude = latitude ?? null;
    if (longitude !== undefined) updates.longitude = longitude ?? null;
    if (phone !== undefined) updates.phone = phone ?? null;
    if (typeof isActive === "boolean") updates.isActive = isActive;

    const wantsPrimary = typeof isPrimary === "boolean" ? isPrimary : undefined;

    const result = await db.transaction(async (tx) => {
      // Handle primary promotion
      if (wantsPrimary === true && !practice.isPrimary) {
        await tx
          .update(doctorPractices)
          .set({ isPrimary: false })
          .where(
            and(
              eq(doctorPractices.doctorId, user.id),
              eq(doctorPractices.isPrimary, true),
              ne(doctorPractices.id, id),
            )
          );
        updates.isPrimary = true;
      } else if (wantsPrimary === false && practice.isPrimary) {
        // Refuse to demote primary if it's the only active one — caller should
        // promote another practice first then demote this one
        updates.isPrimary = false;
      }

      const [updated] = await tx
        .update(doctorPractices)
        .set(updates)
        .where(and(eq(doctorPractices.id, id), eq(doctorPractices.doctorId, user.id)))
        .returning();

      return updated;
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[PATCH /api//doctor/practices/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(_req as unknown as NextRequest);
    if (!user || user.role !== "doctor") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const [practice] = await db
      .select()
      .from(doctorPractices)
      .where(and(eq(doctorPractices.id, id), eq(doctorPractices.doctorId, user.id)))
      .limit(1);

    if (!practice) {
      return NextResponse.json({ error: "Cabinet introuvable" }, { status: 404 });
    }

    // Count active practices for this doctor
    const allActive = await db
      .select({ id: doctorPractices.id, isPrimary: doctorPractices.isPrimary })
      .from(doctorPractices)
      .where(
        and(
          eq(doctorPractices.doctorId, user.id),
          eq(doctorPractices.isActive, true),
        )
      );

    if (allActive.length <= 1) {
      return NextResponse.json(
        { error: "Impossible de supprimer le seul cabinet actif" },
        { status: 422 }
      );
    }

    if (practice.isPrimary) {
      return NextResponse.json(
        { error: "Définissez un autre cabinet comme principal avant de supprimer celui-ci" },
        { status: 422 }
      );
    }

    // Soft-delete
    const [updated] = await db
      .update(doctorPractices)
      .set({ isActive: false })
      .where(and(eq(doctorPractices.id, id), eq(doctorPractices.doctorId, user.id)))
      .returning();

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[DELETE /api//doctor/practices/[id]]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
