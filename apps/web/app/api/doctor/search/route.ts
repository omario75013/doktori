import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db, doctors } from "@doktori/db";
import { ilike, or, and, eq, ne } from "drizzle-orm";
import { SPECIALTIES } from "@doktori/shared";

export async function GET(req: NextRequest) {
  const doctor = await requireDoctor();
  if (doctor instanceof NextResponse) return doctor;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "10"), 20);

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  // Escape LIKE metacharacters to prevent wildcard injection
  const escapedQ = q.replace(/%/g, "\\%").replace(/_/g, "\\_");

  // Match on name or specialty (specialty stored as ID, check label too)
  const matchingSpecialtyIds = SPECIALTIES
    .filter((s: { id: string; label: string }) => s.label.toLowerCase().includes(q.toLowerCase()))
    .map((s: { id: string; label: string }) => s.id);

  const conditions = [
    ilike(doctors.name, `%${escapedQ}%`),
    ...(matchingSpecialtyIds.length > 0
      ? matchingSpecialtyIds.map((id) => eq(doctors.specialty, id))
      : []),
  ];

  const rows = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      specialty: doctors.specialty,
      slug: doctors.slug,
      city: doctors.city,
    })
    .from(doctors)
    .where(
      and(
        or(...conditions),
        eq(doctors.isActive, true),
        ne(doctors.id, doctor.id),
      )
    )
    .limit(limit);

  const results = rows.map((r) => ({
    id: r.id,
    name: r.name,
    specialty: SPECIALTIES.find((s: { id: string; label: string }) => s.id === r.specialty)?.label ?? r.specialty,
    slug: r.slug,
    city: r.city,
  }));

  return NextResponse.json(results);
}
