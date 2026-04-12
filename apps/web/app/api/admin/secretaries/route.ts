import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { db, secretaries, doctors } from "@doktori/db";

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const rows = await db
    .select({
      id: secretaries.id,
      name: secretaries.name,
      email: secretaries.email,
      isActive: secretaries.isActive,
      createdAt: secretaries.createdAt,
      doctorId: doctors.id,
      doctorName: doctors.name,
    })
    .from(secretaries)
    .innerJoin(doctors, eq(secretaries.doctorId, doctors.id))
    .orderBy(secretaries.createdAt);

  return NextResponse.json({
    secretaries: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
