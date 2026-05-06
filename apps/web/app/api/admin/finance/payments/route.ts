import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/payments
 *
 * Unified payment log: paid appointments UNION ALL active subscription payments.
 * Filters: ?provider=&method=&status=&from=&to=&q=
 *
 * Schema returned per row:
 *   { id, source: 'appointment'|'subscription', source_id, paid_at, amount,
 *     provider, method, status, payment_ref,
 *     patient_id, patient_name, doctor_id, doctor_name, label }
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  const method = searchParams.get("method");
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");

  const from = fromRaw && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : null;
  const to = toRaw && /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : null;

  const apptProviderClause = provider ? sql`AND a.payment_provider = ${provider}` : sql``;
  const apptMethodClause = method ? sql`AND a.payment_method = ${method}` : sql``;
  const apptFromClause = from ? sql`AND a.paid_at >= ${from}::date` : sql``;
  const apptToClause = to ? sql`AND a.paid_at < (${to}::date + interval '1 day')` : sql``;

  // Subscriptions don't track method, only provider. Filter only when applicable.
  const subProviderClause = provider ? sql`AND s.payment_provider = ${provider}` : sql``;
  // method filter excludes subs entirely
  const subMethodSkip = !!method;
  const subFromClause = from ? sql`AND s.starts_at >= ${from}::date` : sql``;
  const subToClause = to ? sql`AND s.starts_at < (${to}::date + interval '1 day')` : sql``;

  const apptQuery = sql`
    SELECT
      a.id::text                AS id,
      'appointment'             AS source,
      a.id                      AS source_id,
      a.paid_at                 AS paid_at,
      a.payment_amount          AS amount,
      a.payment_provider        AS provider,
      a.payment_method          AS method,
      a.payment_status          AS status,
      a.payment_ref             AS payment_ref,
      p.id                      AS patient_id,
      p.name                    AS patient_name,
      d.id                      AS doctor_id,
      d.name                    AS doctor_name,
      'Consultation'            AS label
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.payment_status = 'paid'
      AND a.paid_at IS NOT NULL
      ${apptProviderClause}
      ${apptMethodClause}
      ${apptFromClause}
      ${apptToClause}
  `;

  const subQuery = subMethodSkip
    ? sql`SELECT NULL::text AS id, NULL::text AS source, NULL::uuid AS source_id, NULL::timestamptz AS paid_at, NULL::int AS amount, NULL::text AS provider, NULL::text AS method, NULL::text AS status, NULL::text AS payment_ref, NULL::uuid AS patient_id, NULL::text AS patient_name, NULL::uuid AS doctor_id, NULL::text AS doctor_name, NULL::text AS label WHERE FALSE`
    : sql`
      SELECT
        s.id::text                AS id,
        'subscription'            AS source,
        s.id                      AS source_id,
        s.starts_at               AS paid_at,
        s.price_millimes          AS amount,
        s.payment_provider        AS provider,
        NULL                      AS method,
        s.status                  AS status,
        s.external_ref            AS payment_ref,
        NULL::uuid                AS patient_id,
        NULL                      AS patient_name,
        d.id                      AS doctor_id,
        d.name                    AS doctor_name,
        CONCAT('Abonnement ', s.plan, ' (', s.billing_cycle, ')') AS label
      FROM subscriptions s
      LEFT JOIN doctors d ON d.id = s.doctor_id
      WHERE s.status IN ('active', 'expired', 'cancelled')
        AND s.starts_at IS NOT NULL
        ${subProviderClause}
        ${subFromClause}
        ${subToClause}
    `;

  const rows = await db.execute(sql`
    ${apptQuery}
    UNION ALL
    ${subQuery}
    ORDER BY paid_at DESC NULLS LAST
    LIMIT 300
  `);

  return NextResponse.json({ payments: rows });
}
