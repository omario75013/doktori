import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { and, eq, or, ilike, sql } from "drizzle-orm";
import {
  requireApiKey,
  logApiRequest,
  extractClientMeta,
  rateLimitHeaders,
} from "@/lib/api-keys";

/**
 * GET /api/v1/public/doctors
 *
 * Public read-only doctor list. Requires API key with `read:doctors` scope.
 *
 * Query params:
 *   - city       (optional) filter by city
 *   - specialty  (optional) filter by specialty
 *   - q          (optional) text search on name
 *   - limit      (default 20, max 100)
 *   - offset     (default 0)
 */
export async function GET(req: Request) {
  const t0 = Date.now();
  const { ip, userAgent } = extractClientMeta(req);

  const ctx = await requireApiKey(req, "read:doctors");
  if (ctx instanceof NextResponse) {
    logApiRequest({
      apiKeyId: null,
      method: "GET",
      path: "/api/v1/public/doctors",
      statusCode: ctx.status,
      durationMs: Date.now() - t0,
      ip,
      userAgent,
    });
    return ctx;
  }

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city")?.trim().toLowerCase() || null;
  const specialty = searchParams.get("specialty")?.trim().toLowerCase() || null;
  const q = searchParams.get("q")?.trim() || null;
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

  // Only return active, visible, approved doctors — no internal columns (no email, phone, etc.)
  const conditions = [
    eq(doctors.isActive, true),
    eq(doctors.isVisible, true),
    eq(doctors.verificationStatus, "approved"),
  ];

  if (city) {
    conditions.push(sql`lower(${doctors.city}) = ${city}`);
  }
  if (specialty) {
    conditions.push(sql`lower(${doctors.specialty}) = ${specialty}`);
  }
  if (q) {
    conditions.push(or(ilike(doctors.name, `%${q}%`), ilike(doctors.bio, `%${q}%`))!);
  }

  const rows = await db
    .select({
      slug: doctors.slug,
      name: doctors.name,
      specialty: doctors.specialty,
      city: doctors.city,
      address: doctors.address,
      bio: doctors.bio,
      photoUrl: doctors.photoUrl,
      languages: doctors.languages,
      yearsOfExperience: doctors.yearsOfExperience,
      consultationFeeTnd: sql<number>`(${doctors.consultationFee}::numeric / 1000.0)`,
      teleconsultFeeTnd: sql<number>`(${doctors.teleconsultFee}::numeric / 1000.0)`,
      consultationMode: doctors.consultationMode,
      averageRating: doctors.averageRating,
      reviewCount: doctors.reviewCount,
    })
    .from(doctors)
    .where(and(...conditions))
    .orderBy(doctors.name)
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(doctors)
    .where(and(...conditions));

  const headers = rateLimitHeaders(ctx);

  logApiRequest({
    apiKeyId: ctx.key.id,
    method: "GET",
    path: "/api/v1/public/doctors",
    statusCode: 200,
    durationMs: Date.now() - t0,
    ip,
    userAgent,
  });

  return NextResponse.json(
    {
      doctors: rows,
      pagination: { total: Number(countRow.total), limit, offset },
    },
    { headers }
  );
}
