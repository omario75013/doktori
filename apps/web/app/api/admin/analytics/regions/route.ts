import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin([]);
  if (admin instanceof NextResponse) return admin;

  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [byCity, bySpecialty] = await Promise.all([
    db.execute(sql`
      SELECT d.city, COUNT(a.id)::int AS count
      FROM appointments a
      JOIN doctors d ON d.id = a.doctor_id
      WHERE a.created_at >= ${since}
      GROUP BY d.city
      ORDER BY count DESC
      LIMIT 20
    `),
    db.execute(sql`
      SELECT d.specialty, COUNT(a.id)::int AS count
      FROM appointments a
      JOIN doctors d ON d.id = a.doctor_id
      WHERE a.created_at >= ${since}
      GROUP BY d.specialty
      ORDER BY count DESC
      LIMIT 20
    `),
  ]);

  return NextResponse.json({
    byCity: byCity as unknown as Array<{ city: string; count: number }>,
    bySpecialty: bySpecialty as unknown as Array<{ specialty: string; count: number }>,
  });
}
