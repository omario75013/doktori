import { NextResponse } from "next/server";
import { ilike, or, sql, count } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { db, clinics, clinicDoctors } from "@doktori/db";

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const rows = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      city: clinics.city,
      phone: clinics.phone,
      email: clinics.email,
      plan: clinics.plan,
      logoUrl: clinics.logoUrl,
      createdAt: clinics.createdAt,
      doctorCount: sql<number>`(select count(*) from clinic_doctors where clinic_doctors.clinic_id = ${clinics.id})::int`,
    })
    .from(clinics)
    .where(
      q
        ? or(
            ilike(clinics.name, `%${q}%`),
            ilike(clinics.city, `%${q}%`)
          )
        : undefined
    )
    .orderBy(clinics.createdAt);

  return NextResponse.json({
    clinics: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      doctorCount: Number(r.doctorCount ?? 0),
    })),
  });
}
