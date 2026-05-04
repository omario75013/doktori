import { NextRequest, NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { and, eq, ne, desc, sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "3", 10) || 3, 1), 10);

  const [base] = await db
    .select({ id: doctors.id, specialty: doctors.specialty, city: doctors.city })
    .from(doctors)
    .where(eq(doctors.id, id))
    .limit(1);

  if (!base) return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });

  const rows = await db
    .select({
      id: doctors.id,
      slug: doctors.slug,
      fullName: doctors.name,
      photoUrl: doctors.photoUrl,
      specialty: doctors.specialty,
      city: doctors.city,
      rating: doctors.averageRating,
      totalReviews: doctors.reviewCount,
    })
    .from(doctors)
    .where(
      and(
        eq(doctors.specialty, base.specialty),
        eq(doctors.city, base.city),
        eq(doctors.isActive, true),
        eq(doctors.isVisible, true),
        ne(doctors.id, id),
      )
    )
    .orderBy(desc(sql`COALESCE(${doctors.averageRating}, 0)`))
    .limit(limit);

  return NextResponse.json({ similar: rows });
}
