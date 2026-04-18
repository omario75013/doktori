import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { verifySosToken } from "@/lib/sos-hmac";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sig = new URL(req.url).searchParams.get("sig");
  if (!sig || !verifySosToken(id, sig)) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const result = await db.execute(sql`
    SELECT
      s.id, s.status, s.doctor_id, s.requested_at, s.accepted_at, s.expires_at,
      d.name AS doctor_name,
      COALESCE(pp.proxy_number, d.phone) AS doctor_phone,
      d.address AS doctor_address,
      d.latitude AS doctor_lat, d.longitude AS doctor_lng
    FROM sos_sessions s
    LEFT JOIN doctors d ON d.id = s.doctor_id
    LEFT JOIN phone_proxies pp ON pp.sos_session_id = s.id AND pp.is_active = true
    WHERE s.id = ${id}
    LIMIT 1
  `);

  interface SosSessionRow {
    id: string; status: string; doctor_id: string | null;
    requested_at: string; accepted_at: string | null; expires_at: string | null;
    doctor_name: string | null; doctor_phone: string | null;
    doctor_address: string | null; doctor_lat: string | null; doctor_lng: string | null;
  }
  const session = (result as unknown as SosSessionRow[])[0];
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  return NextResponse.json(session);
}
