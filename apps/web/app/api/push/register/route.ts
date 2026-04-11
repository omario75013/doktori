import { NextRequest, NextResponse } from "next/server";
import { db, pushTokens } from "@doktori/db";
import { getPatientFromRequest } from "@/lib/patient-auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const patient = getPatientFromRequest(req);
  if (!patient) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { token, platform, deviceId } = await req.json();
  if (!token || !platform || !["ios", "android"].includes(platform)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  // Upsert: if token exists, reactivate and update patient
  const [existing] = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.token, token))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(pushTokens)
      .set({ patientId: patient.id, isActive: true, platform, deviceId, updatedAt: new Date() })
      .where(eq(pushTokens.id, existing.id))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(pushTokens)
    .values({
      patientId: patient.id,
      token,
      platform,
      deviceId,
    })
    .returning();

  return NextResponse.json(created);
}
