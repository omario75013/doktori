import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctorInsurance } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const conventions = await db.select().from(doctorInsurance)
    .where(and(eq(doctorInsurance.doctorId, session.user.id), eq(doctorInsurance.isConventioned, true)));
  return NextResponse.json(conventions);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { insuranceTypes } = await req.json();
  if (!Array.isArray(insuranceTypes)) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });

  // Replace all conventions for this doctor
  await db.delete(doctorInsurance).where(eq(doctorInsurance.doctorId, session.user.id));

  if (insuranceTypes.length > 0) {
    await db.insert(doctorInsurance).values(
      insuranceTypes.map((t: string) => ({ doctorId: session.user.id, insuranceType: t, isConventioned: true }))
    );
  }

  return NextResponse.json({ success: true });
}
