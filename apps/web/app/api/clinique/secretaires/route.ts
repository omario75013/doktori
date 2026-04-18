import { NextResponse } from "next/server";
import { db, secretaries } from "@doktori/db";
import { eq } from "drizzle-orm";
import { requireClinic } from "@/lib/clinic-auth";

export async function GET() {
  const clinic = await requireClinic();
  if (clinic instanceof NextResponse) return clinic;

  const rows = await db
    .select({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
      isActive: secretaries.isActive,
      createdAt: secretaries.createdAt,
    })
    .from(secretaries)
    .where(eq(secretaries.clinicId, clinic.id));

  return NextResponse.json({ secretaries: rows });
}
