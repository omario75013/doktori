import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq, and, sql } from "drizzle-orm";
import {
  requireApiKey,
  logApiRequest,
  extractClientMeta,
  rateLimitHeaders,
} from "@/lib/api-keys";

/**
 * GET /api/v1/public/doctors/[slug]
 *
 * Single doctor public profile. Requires `read:doctors` scope.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t0 = Date.now();
  const { ip, userAgent } = extractClientMeta(req);
  const { slug } = await params;

  const ctx = await requireApiKey(req, "read:doctors");
  if (ctx instanceof NextResponse) {
    logApiRequest({
      apiKeyId: null,
      method: "GET",
      path: `/api/v1/public/doctors/${slug}`,
      statusCode: ctx.status,
      durationMs: Date.now() - t0,
      ip,
      userAgent,
    });
    return ctx;
  }

  const [row] = await db
    .select({
      slug: doctors.slug,
      name: doctors.name,
      specialty: doctors.specialty,
      city: doctors.city,
      address: doctors.address,
      bio: doctors.bio,
      photoUrl: doctors.photoUrl,
      languages: doctors.languages,
      educations: doctors.educations,
      experiences: doctors.experiences,
      expertise: doctors.expertise,
      yearsOfExperience: doctors.yearsOfExperience,
      consultationFeeTnd: sql<number>`(${doctors.consultationFee}::numeric / 1000.0)`,
      teleconsultFeeTnd: sql<number>`(${doctors.teleconsultFee}::numeric / 1000.0)`,
      consultationMode: doctors.consultationMode,
      averageRating: doctors.averageRating,
      reviewCount: doctors.reviewCount,
    })
    .from(doctors)
    .where(
      and(
        eq(doctors.slug, slug),
        eq(doctors.isActive, true),
        eq(doctors.isVisible, true),
        eq(doctors.verificationStatus, "approved")
      )
    )
    .limit(1);

  const headers = rateLimitHeaders(ctx);

  if (!row) {
    logApiRequest({
      apiKeyId: ctx.key.id,
      method: "GET",
      path: `/api/v1/public/doctors/${slug}`,
      statusCode: 404,
      durationMs: Date.now() - t0,
      ip,
      userAgent,
    });
    return NextResponse.json({ error: "Doctor not found" }, { status: 404, headers });
  }

  logApiRequest({
    apiKeyId: ctx.key.id,
    method: "GET",
    path: `/api/v1/public/doctors/${slug}`,
    statusCode: 200,
    durationMs: Date.now() - t0,
    ip,
    userAgent,
  });

  return NextResponse.json({ doctor: row }, { headers });
}
