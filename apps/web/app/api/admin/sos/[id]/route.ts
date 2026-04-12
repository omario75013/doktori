import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAudit, extractRequestMeta } from "@/lib/admin-audit";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const sessionResult = await db.execute(sql`
    SELECT
      s.id,
      s.status,
      s.symptom_category,
      s.description,
      s.fee,
      s.commission,
      s.requested_at,
      s.accepted_at,
      s.completed_at,
      s.expires_at,
      s.patient_lat,
      s.patient_lng,
      s.doctor_id,
      p.name  AS patient_name,
      p.phone AS patient_phone,
      d.name  AS doctor_name,
      d.phone AS doctor_phone,
      d.city  AS doctor_city,
      d.latitude  AS doctor_lat,
      d.longitude AS doctor_lng,
      pp.proxy_number,
      pp.is_active AS proxy_active,
      r.rating   AS review_rating,
      r.comment  AS review_comment,
      r.created_at AS review_at
    FROM sos_sessions s
    LEFT JOIN patients p   ON p.id = s.patient_id
    LEFT JOIN doctors  d   ON d.id = s.doctor_id
    LEFT JOIN phone_proxies pp ON pp.sos_session_id = s.id AND pp.is_active = true
    LEFT JOIN reviews r    ON r.sos_session_id = s.id
    WHERE s.id = ${id}
    LIMIT 1
  `);

  const session = (sessionResult as unknown as Record<string, unknown>[])[0];
  if (!session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  // Declines timeline
  const declinesResult = await db.execute(sql`
    SELECT
      sd.id,
      sd.declined_at,
      sd.reason,
      d.name AS doctor_name
    FROM sos_declines sd
    LEFT JOIN doctors d ON d.id = sd.doctor_id
    WHERE sd.sos_session_id = ${id}
    ORDER BY sd.declined_at ASC
  `);

  // SMS logs for patient phone
  const patientPhone = session.patient_phone as string | null;
  const smsResult = patientPhone
    ? await db.execute(sql`
        SELECT id, recipient, message, status, created_at
        FROM sms_logs
        WHERE recipient = ${patientPhone}
        ORDER BY created_at DESC
        LIMIT 20
      `)
    : [];

  return NextResponse.json({
    session,
    declines: declinesResult as unknown as Record<string, unknown>[],
    smsLogs: smsResult as unknown as Record<string, unknown>[],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await req.json() as { adminNotes?: string };

  if (typeof body.adminNotes === "undefined") {
    return NextResponse.json({ error: "adminNotes requis" }, { status: 400 });
  }

  await db.execute(sql`
    UPDATE sos_sessions
    SET admin_notes = ${body.adminNotes}
    WHERE id = ${id}
  `);

  const meta = extractRequestMeta(req);
  await logAudit({
    actor: admin,
    action: "sos.notes_update",
    resourceType: "sos_sessions",
    resourceId: id,
    before: null,
    after: { adminNotes: body.adminNotes },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
