import { NextResponse } from "next/server";
import { db, catalogCities } from "@doktori/db";
import { eq, asc } from "drizzle-orm";
import {
  requireApiKey,
  logApiRequest,
  extractClientMeta,
  rateLimitHeaders,
} from "@/lib/api-keys";

/**
 * GET /api/v1/public/cities
 *
 * List active cities. Requires `read:cities` scope.
 */
export async function GET(req: Request) {
  const t0 = Date.now();
  const { ip, userAgent } = extractClientMeta(req);

  const ctx = await requireApiKey(req, "read:cities");
  if (ctx instanceof NextResponse) {
    logApiRequest({
      apiKeyId: null,
      method: "GET",
      path: "/api/v1/public/cities",
      statusCode: ctx.status,
      durationMs: Date.now() - t0,
      ip,
      userAgent,
    });
    return ctx;
  }

  const rows = await db
    .select({
      id: catalogCities.id,
      label: catalogCities.label,
      labelAr: catalogCities.labelAr,
      latitude: catalogCities.latitude,
      longitude: catalogCities.longitude,
    })
    .from(catalogCities)
    .where(eq(catalogCities.isActive, true))
    .orderBy(asc(catalogCities.displayOrder), asc(catalogCities.label));

  logApiRequest({
    apiKeyId: ctx.key.id,
    method: "GET",
    path: "/api/v1/public/cities",
    statusCode: 200,
    durationMs: Date.now() - t0,
    ip,
    userAgent,
  });

  return NextResponse.json({ cities: rows }, { headers: rateLimitHeaders(ctx) });
}
