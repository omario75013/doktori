import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { getAvailableSlots } from "@/lib/queries/appointments";
import { eq, and } from "drizzle-orm";
import {
  requireApiKey,
  logApiRequest,
  extractClientMeta,
  rateLimitHeaders,
} from "@/lib/api-keys";

/**
 * GET /api/v1/public/availability/[slug]?from=YYYY-MM-DD&days=7
 *
 * Read-only slot availability for a doctor. Requires `read:availability` scope.
 *
 * Query params:
 *   - from   (default today)         starting date YYYY-MM-DD
 *   - days   (default 7, max 14)     number of days to return
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t0 = Date.now();
  const { ip, userAgent } = extractClientMeta(req);
  const { slug } = await params;

  const ctx = await requireApiKey(req, "read:availability");
  if (ctx instanceof NextResponse) {
    logApiRequest({
      apiKeyId: null,
      method: "GET",
      path: `/api/v1/public/availability/${slug}`,
      statusCode: ctx.status,
      durationMs: Date.now() - t0,
      ip,
      userAgent,
    });
    return ctx;
  }

  const headers = rateLimitHeaders(ctx);
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const daysParam = searchParams.get("days");
  const days = Math.min(Math.max(parseInt(daysParam ?? "7", 10) || 7, 1), 14);

  const [doctor] = await db
    .select({ id: doctors.id })
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

  if (!doctor) {
    logApiRequest({
      apiKeyId: ctx.key.id,
      method: "GET",
      path: `/api/v1/public/availability/${slug}`,
      statusCode: 404,
      durationMs: Date.now() - t0,
      ip,
      userAgent,
    });
    return NextResponse.json({ error: "Doctor not found" }, { status: 404, headers });
  }

  const start = fromParam ? new Date(`${fromParam}T00:00:00`) : new Date();
  start.setHours(0, 0, 0, 0);

  const result: Array<{
    date: string;
    slots: Array<{ startTime: string; endTime: string; practiceId: string }>;
  }> = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const slots = await getAvailableSlots(doctor.id, dateStr);
    result.push({
      date: dateStr,
      slots: slots
        .filter((s) => s.available)
        .map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
          practiceId: s.practiceId,
        })),
    });
  }

  logApiRequest({
    apiKeyId: ctx.key.id,
    method: "GET",
    path: `/api/v1/public/availability/${slug}`,
    statusCode: 200,
    durationMs: Date.now() - t0,
    ip,
    userAgent,
  });

  return NextResponse.json({ slug, days: result }, { headers });
}
