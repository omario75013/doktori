import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, doctorInsurance } from "@doktori/db";
import { eq, and } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conventions = await db.select().from(doctorInsurance)
    .where(and(eq(doctorInsurance.doctorId, id), eq(doctorInsurance.isConventioned, true)));
  return NextResponse.json(conventions);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  if (id !== session.user.id) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { insuranceTypes } = await req.json();
  if (!Array.isArray(insuranceTypes)) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });

  // Replace all conventions for this doctor
  await db.delete(doctorInsurance).where(eq(doctorInsurance.doctorId, id));

  if (insuranceTypes.length > 0) {
    await db.insert(doctorInsurance).values(
      insuranceTypes.map((t: string) => ({ doctorId: id, insuranceType: t, isConventioned: true }))
    );
  }

  return NextResponse.json({ success: true });
}
