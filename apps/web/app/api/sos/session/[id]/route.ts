import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await db.execute(sql`
    SELECT
      s.id, s.status, s.doctor_id, s.requested_at, s.accepted_at, s.expires_at,
      d.name AS doctor_name, d.phone AS doctor_phone, d.address AS doctor_address,
      d.latitude AS doctor_lat, d.longitude AS doctor_lng
    FROM sos_sessions s
    LEFT JOIN doctors d ON d.id = s.doctor_id
    WHERE s.id = ${id}
    LIMIT 1
  `);

  const session = (result as unknown as any[])[0];
  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  return NextResponse.json(session);
}
