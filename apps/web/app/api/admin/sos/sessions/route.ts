import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;
  const statusParam = searchParams.get("status");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const symptomCategory = searchParams.get("symptomCategory");
  const doctorId = searchParams.get("doctorId");

  // Build WHERE clause fragments with proper sql template escaping
  const statusArray = statusParam ? statusParam.split(",").filter(Boolean) : null;

  // Compose optional filter conditions as sql fragments
  const statusClause = statusArray && statusArray.length > 0
    ? sql`AND s.status = ANY(${statusArray}::text[])`
    : sql``;
  const fromClause = fromParam
    ? sql`AND s.requested_at >= ${fromParam}::timestamptz`
    : sql``;
  const toClause = toParam
    ? sql`AND s.requested_at <= ${toParam}::timestamptz`
    : sql``;
  const symptomClause = symptomCategory
    ? sql`AND s.symptom_category = ${symptomCategory}`
    : sql``;
  const doctorClause = doctorId
    ? sql`AND s.doctor_id = ${doctorId}::uuid`
    : sql``;

  const [dataResult, countResult] = await Promise.all([
    db.execute(sql`
      SELECT
        s.id,
        s.status,
        s.symptom_category,
        s.description,
        s.fee,
        s.commission,
        s.distance_m,
        s.resolution,
        s.requested_at,
        s.accepted_at,
        s.completed_at,
        s.expires_at,
        s.patient_lat,
        s.patient_lng,
        s.doctor_id,
        p.name AS patient_name,
        p.phone AS patient_phone,
        d.name AS doctor_name,
        d.city AS doctor_city,
        r.rating AS review_rating,
        EXTRACT(EPOCH FROM (COALESCE(s.accepted_at, s.completed_at, NOW()) - s.requested_at)) * 1000 AS duration_ms
      FROM sos_sessions s
      LEFT JOIN patients p ON p.id = s.patient_id
      LEFT JOIN doctors d ON d.id = s.doctor_id
      LEFT JOIN reviews r ON r.sos_session_id = s.id
      WHERE 1=1
      ${statusClause}
      ${fromClause}
      ${toClause}
      ${symptomClause}
      ${doctorClause}
      ORDER BY s.requested_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM sos_sessions s
      WHERE 1=1
      ${statusClause}
      ${fromClause}
      ${toClause}
      ${symptomClause}
      ${doctorClause}
    `),
  ]);

  const sessions = dataResult as unknown as Record<string, unknown>[];
  const total = ((countResult as unknown as Array<{ total: number }>)[0]?.total) ?? 0;

  return NextResponse.json({ sessions, total, page, limit });
}
