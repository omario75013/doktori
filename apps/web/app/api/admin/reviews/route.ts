import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { db, reviews, doctors, patients } from "@doktori/db";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !isSuperAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  if (!["pending", "published", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      status: reviews.status,
      createdAt: reviews.createdAt,
      doctorName: doctors.name,
      doctorSlug: doctors.slug,
      patientName: patients.name,
    })
    .from(reviews)
    .innerJoin(doctors, eq(reviews.doctorId, doctors.id))
    .innerJoin(patients, eq(reviews.patientId, patients.id))
    .where(eq(reviews.status, status))
    .orderBy(desc(reviews.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}
