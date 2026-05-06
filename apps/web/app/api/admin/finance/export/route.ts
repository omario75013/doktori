import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type ExportType = "appointments" | "subscriptions" | "refunds" | "all";
const VALID_TYPES: readonly ExportType[] = ["appointments", "subscriptions", "refunds", "all"];

function isExportType(s: string): s is ExportType {
  return (VALID_TYPES as readonly string[]).includes(s);
}

/** RFC 4180 escaping. Wrap in quotes when value contains comma/newline/quote. */
function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const head = headers.map(csvCell).join(",");
  const body = rows.map((r) => headers.map((h) => csvCell(r[h])).join(",")).join("\r\n");
  return body ? `${head}\r\n${body}\r\n` : `${head}\r\n`;
}

/**
 * GET /api/admin/finance/export?type=all|appointments|subscriptions|refunds&from=&to=&format=csv
 *
 * V1: CSV only (exceljs not installed). XLSX returns 501 with a hint.
 *
 * Audit: every export is logged in admin_audit_logs with the filter params
 * (no PII content, just metadata).
 */
export async function GET(req: Request) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const typeRaw = searchParams.get("type") ?? "all";
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const format = (searchParams.get("format") ?? "csv").toLowerCase();

  if (!isExportType(typeRaw)) {
    return NextResponse.json({ error: `type invalide. attendu: ${VALID_TYPES.join("|")}` }, { status: 400 });
  }
  if (format !== "csv") {
    return NextResponse.json(
      { error: "Format XLSX non supporté pour le moment. Utilisez format=csv." },
      { status: 501 }
    );
  }

  const from = fromRaw && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : null;
  const to = toRaw && /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : null;

  const sections: Array<{ heading: string; csv: string }> = [];

  if (typeRaw === "appointments" || typeRaw === "all") {
    const apptFromClause = from ? sql`AND a.paid_at >= ${from}::date` : sql``;
    const apptToClause = to ? sql`AND a.paid_at < (${to}::date + interval '1 day')` : sql``;
    const result = await db.execute(sql`
      SELECT
        a.id,
        a.paid_at,
        a.payment_amount,
        a.payment_provider,
        a.payment_method,
        a.payment_status,
        a.payment_ref,
        d.name AS doctor_name,
        p.name AS patient_name
      FROM appointments a
      JOIN doctors d ON d.id = a.doctor_id
      JOIN patients p ON p.id = a.patient_id
      WHERE a.payment_status IN ('paid','refunded','refund_pending')
        ${apptFromClause}
        ${apptToClause}
      ORDER BY a.paid_at DESC NULLS LAST
      LIMIT 10000
    `);
    sections.push({
      heading: "appointments",
      csv: rowsToCsv(
        ["id", "paid_at", "payment_amount", "payment_provider", "payment_method", "payment_status", "payment_ref", "doctor_name", "patient_name"],
        result as unknown as Array<Record<string, unknown>>
      ),
    });
  }

  if (typeRaw === "subscriptions" || typeRaw === "all") {
    const subFromClause = from ? sql`AND s.starts_at >= ${from}::date` : sql``;
    const subToClause = to ? sql`AND s.starts_at < (${to}::date + interval '1 day')` : sql``;
    const result = await db.execute(sql`
      SELECT
        s.id,
        s.plan,
        s.status,
        s.billing_cycle,
        s.price_millimes,
        s.payment_provider,
        s.external_ref,
        s.starts_at,
        s.ends_at,
        s.cancelled_at,
        d.name AS doctor_name,
        d.email AS doctor_email
      FROM subscriptions s
      LEFT JOIN doctors d ON d.id = s.doctor_id
      WHERE 1=1
        ${subFromClause}
        ${subToClause}
      ORDER BY s.starts_at DESC NULLS LAST
      LIMIT 10000
    `);
    sections.push({
      heading: "subscriptions",
      csv: rowsToCsv(
        ["id", "plan", "status", "billing_cycle", "price_millimes", "payment_provider", "external_ref", "starts_at", "ends_at", "cancelled_at", "doctor_name", "doctor_email"],
        result as unknown as Array<Record<string, unknown>>
      ),
    });
  }

  if (typeRaw === "refunds" || typeRaw === "all") {
    const rFromClause = from ? sql`AND r.created_at >= ${from}::date` : sql``;
    const rToClause = to ? sql`AND r.created_at < (${to}::date + interval '1 day')` : sql``;
    const result = await db.execute(sql`
      SELECT
        r.id,
        r.source_type,
        r.source_id,
        r.provider,
        r.amount,
        r.currency,
        r.status,
        r.original_payment_ref,
        r.provider_refund_id,
        r.created_at,
        r.succeeded_at,
        d.name AS doctor_name,
        p.name AS patient_name
      FROM refunds r
      LEFT JOIN doctors d ON d.id = r.doctor_id
      LEFT JOIN patients p ON p.id = r.patient_id
      WHERE 1=1
        ${rFromClause}
        ${rToClause}
      ORDER BY r.created_at DESC
      LIMIT 10000
    `);
    sections.push({
      heading: "refunds",
      csv: rowsToCsv(
        ["id", "source_type", "source_id", "provider", "amount", "currency", "status", "original_payment_ref", "provider_refund_id", "created_at", "succeeded_at", "doctor_name", "patient_name"],
        result as unknown as Array<Record<string, unknown>>
      ),
    });
  }

  // Combine sections. For "all" we prepend each section with a heading row so a
  // single CSV file can hold the three datasets. For single-type exports there
  // is no heading row to keep the CSV directly importable in spreadsheets.
  const csvBody =
    typeRaw === "all"
      ? sections.map((s) => `# ${s.heading}\r\n${s.csv}`).join("\r\n")
      : sections.map((s) => s.csv).join("");

  // Audit log (metadata only — never row contents)
  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "finance.export",
    resourceType: "finance_export",
    resourceId: typeRaw,
    after: { type: typeRaw, format, from, to, sections: sections.map((s) => s.heading) },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  const filename = `doktori-finance-${typeRaw}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csvBody, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
