import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, appointmentTypes } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");

  if (doctorId) {
    // Public: list active types for a doctor (for booking page)
    const types = await db
      .select()
      .from(appointmentTypes)
      .where(and(eq(appointmentTypes.doctorId, doctorId), eq(appointmentTypes.isActive, true)))
      .orderBy(appointmentTypes.name);
    return NextResponse.json(types);
  }

  // Auth-gated: list current doctor's types
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const types = await db.select().from(appointmentTypes).where(eq(appointmentTypes.doctorId, session.user.id));
  return NextResponse.json(types);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { name, durationMinutes, fee, color } = body;

  if (!name || typeof durationMinutes !== "number" || durationMinutes < 5 || durationMinutes > 120) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const [created] = await db.insert(appointmentTypes).values({
    doctorId: session.user.id,
    name,
    durationMinutes,
    fee: typeof fee === "number" && fee > 0 ? fee * 1000 : null, // Store in millimes
    color: color || "#2563eb",
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
