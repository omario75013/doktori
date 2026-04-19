import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctorHomeVisitSettings } from "@doktori/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [settings] = await db
    .select()
    .from(doctorHomeVisitSettings)
    .where(eq(doctorHomeVisitSettings.doctorId, session.user.id))
    .limit(1);

  return NextResponse.json(settings || { isAvailable: false, radiusKm: 5, fee: 80000 });
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { isAvailable, radiusKm, fee } = body;

    if (typeof isAvailable !== "boolean" || typeof radiusKm !== "number" || typeof fee !== "number") {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }
    if (radiusKm < 1 || radiusKm > 30) {
      return NextResponse.json({ error: "Rayon doit être entre 1 et 30 km" }, { status: 400 });
    }
    if (fee < 20000 || fee > 500000) {
      return NextResponse.json({ error: "Tarif doit être entre 20 et 500 DT" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(doctorHomeVisitSettings)
      .where(eq(doctorHomeVisitSettings.doctorId, session.user.id))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(doctorHomeVisitSettings)
        .set({ isAvailable, radiusKm, fee, updatedAt: new Date() })
        .where(eq(doctorHomeVisitSettings.doctorId, session.user.id))
        .returning();
      return NextResponse.json(updated);
    } else {
      const [created] = await db
        .insert(doctorHomeVisitSettings)
        .values({ doctorId: session.user.id, isAvailable, radiusKm, fee })
        .returning();
      return NextResponse.json(created);
    }
  } catch (e) {
    console.error("[PUT /api//home-visit/settings]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
