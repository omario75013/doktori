import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DetailView } from "./detail-view";

export const dynamic = "force-dynamic";

export default async function SosSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin(["super_admin", "support"]);
  if (admin instanceof NextResponse) redirect("/admin-login");

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
    return (
      <div className="p-8 text-slate-600">Session introuvable.</div>
    );
  }

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

  const availableDoctors = await db.execute(sql`
    SELECT d.id, d.name, d.city, d.specialty
    FROM doctors d
    JOIN doctor_home_visit_settings dhvs ON dhvs.doctor_id = d.id
    WHERE dhvs.is_available = true AND d.is_active = true
    ORDER BY d.name
    LIMIT 100
  `);

  return (
    <DetailView
      session={session}
      declines={declinesResult as unknown as Record<string, unknown>[]}
      smsLogs={smsResult as unknown as Record<string, unknown>[]}
      availableDoctors={availableDoctors as unknown as { id: string; name: string; city: string; specialty: string }[]}
    />
  );
}
