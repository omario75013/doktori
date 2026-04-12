import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const doctorId = session.user.id;

  const history = await db.execute(sql`
    SELECT s.id, s.status, s.resolution, s.fee, s.commission,
           s.symptom_category, s.requested_at, s.accepted_at, s.completed_at,
           p.name AS patient_name, r.rating
    FROM sos_sessions s
    JOIN patients p ON p.id = s.patient_id
    LEFT JOIN reviews r ON r.sos_session_id = s.id
    WHERE s.doctor_id = ${doctorId}
    ORDER BY s.requested_at DESC LIMIT 50
  `);

  const earnings = await db.execute(sql`
    SELECT COALESCE(SUM(fee), 0) AS total_fee,
           COALESCE(SUM(commission), 0) AS total_commission,
           COUNT(*) AS session_count
    FROM sos_sessions
    WHERE doctor_id = ${doctorId} AND status = 'completed'
      AND completed_at >= date_trunc('month', CURRENT_DATE)
  `);

  return NextResponse.json({
    history: history as unknown as any[],
    earnings: (earnings as unknown as any[])[0],
  });
}
