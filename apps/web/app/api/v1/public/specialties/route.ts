import { NextResponse } from "next/server";
import { db, catalogSpecialties } from "@doktori/db";
import { eq, asc } from "drizzle-orm";
import {
  requireApiKey,
  logApiRequest,
  extractClientMeta,
  rateLimitHeaders,
} from "@/lib/api-keys";

/**
 * GET /api/v1/public/specialties
 *
 * List active specialties. Requires `read:specialties` scope.
 */
export async function GET(req: Request) {
  const t0 = Date.now();
  const { ip, userAgent } = extractClientMeta(req);

  const ctx = await requireApiKey(req, "read:specialties");
  if (ctx instanceof NextResponse) {
    logApiRequest({
      apiKeyId: null,
      method: "GET",
      path: "/api/v1/public/specialties",
      statusCode: ctx.status,
      durationMs: Date.now() - t0,
      ip,
      userAgent,
    });
    return ctx;
  }

  const rows = await db
    .select({
      id: catalogSpecialties.id,
      label: catalogSpecialties.label,
      labelAr: catalogSpecialties.labelAr,
      icon: catalogSpecialties.icon,
    })
    .from(catalogSpecialties)
    .where(eq(catalogSpecialties.isActive, true))
    .orderBy(asc(catalogSpecialties.displayOrder), asc(catalogSpecialties.label));

  logApiRequest({
    apiKeyId: ctx.key.id,
    method: "GET",
    path: "/api/v1/public/specialties",
    statusCode: 200,
    durationMs: Date.now() - t0,
    ip,
    userAgent,
  });

  return NextResponse.json({ specialties: rows }, { headers: rateLimitHeaders(ctx) });
}
