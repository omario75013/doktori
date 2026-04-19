import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";

/** GET /api/doctor/profile/noshow-threshold — return the doctor's current threshold */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [doctor] = await db
    .select({ noShowThreshold: doctors.noShowThreshold })
    .from(doctors)
    .where(eq(doctors.id, session.user.id))
    .limit(1);

  if (!doctor) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  return NextResponse.json({ noShowThreshold: doctor.noShowThreshold });
}

/** PATCH /api/doctor/profile/noshow-threshold — update the threshold (1–10) */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const threshold = Number(body?.noShowThreshold);

  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 10) {
    return NextResponse.json(
      { error: "Le seuil doit être un entier entre 1 et 10." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(doctors)
    .set({ noShowThreshold: threshold, updatedAt: new Date() })
    .where(eq(doctors.id, session.user.id))
    .returning({ noShowThreshold: doctors.noShowThreshold });

  if (!updated) {
    return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });
  }

  return NextResponse.json({ noShowThreshold: updated.noShowThreshold });
}
