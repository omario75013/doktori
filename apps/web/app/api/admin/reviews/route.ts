import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, reviews, doctors, patients, adminUsers } from "@doktori/db";
import { eq, desc, and, inArray, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "moderator"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);

  // status filter — supports comma-separated values or single value
  const statusParam = searchParams.get("status");
  const statuses = statusParam
    ? statusParam.split(",").filter((s) => ["pending", "published", "rejected"].includes(s))
    : ["pending"];

  if (statuses.length === 0) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  // rating filter — comma-separated list of integers 1-5
  const ratingParam = searchParams.get("ratings");
  const ratings = ratingParam
    ? ratingParam
        .split(",")
        .map(Number)
        .filter((n) => n >= 1 && n <= 5)
    : null;

  // date range
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const moderator = adminUsers;

  const conditions = [
    statuses.length === 1
      ? eq(reviews.status, statuses[0])
      : inArray(reviews.status, statuses),
    ...(ratings && ratings.length > 0 ? [inArray(reviews.rating, ratings)] : []),
    ...(fromParam ? [gte(reviews.createdAt, new Date(fromParam))] : []),
    ...(toParam ? [lte(reviews.createdAt, new Date(toParam))] : []),
  ];

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      status: reviews.status,
      rejectionReason: reviews.rejectionReason,
      moderatedAt: reviews.moderatedAt,
      moderatedByName: moderator.name,
      createdAt: reviews.createdAt,
      doctorName: doctors.name,
      doctorSlug: doctors.slug,
      patientName: patients.name,
    })
    .from(reviews)
    .innerJoin(doctors, eq(reviews.doctorId, doctors.id))
    .innerJoin(patients, eq(reviews.patientId, patients.id))
    .leftJoin(moderator, eq(reviews.moderatedBy, moderator.id))
    .where(and(...conditions))
    .orderBy(desc(reviews.createdAt))
    .limit(500);

  return NextResponse.json(rows);
}
