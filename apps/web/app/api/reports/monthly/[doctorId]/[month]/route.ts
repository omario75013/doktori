import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ doctorId: string; month: string }> }
) {
  const { doctorId, month } = await params;
  // month format: YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Format de mois invalide (YYYY-MM)" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 1);

  // Fetch doctor info
  const doctorResult = await db.execute(sql`
    SELECT id, name, specialty, city, consultation_fee
    FROM doctors WHERE id = ${doctorId} LIMIT 1
  `);
  const doctor = (doctorResult as unknown as any[])[0];
  if (!doctor) return NextResponse.json({ error: "Médecin introuvable" }, { status: 404 });

  // Aggregate stats for the month
  const stats = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_shows,
      COUNT(DISTINCT patient_id)::int AS unique_patients
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND starts_at >= ${startDate.toISOString()}
      AND starts_at < ${endDate.toISOString()}
  `);

  const statRow = (stats as unknown as any[])[0] || { total: 0, completed: 0, cancelled: 0, no_shows: 0, unique_patients: 0 };

  // Top appointment types (via reason for MVP)
  const topReasons = await db.execute(sql`
    SELECT reason, COUNT(*)::int AS count
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND reason IS NOT NULL AND reason != ''
      AND starts_at >= ${startDate.toISOString()}
      AND starts_at < ${endDate.toISOString()}
    GROUP BY reason
    ORDER BY count DESC
    LIMIT 5
  `);

  // Previous month for comparison
  const prevStartDate = new Date(year, m - 2, 1);
  const prevStats = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM appointments
    WHERE doctor_id = ${doctorId}
      AND starts_at >= ${prevStartDate.toISOString()}
      AND starts_at < ${startDate.toISOString()}
  `);
  const prevTotal = ((prevStats as unknown as any[])[0]?.total) || 0;
  const growth = prevTotal > 0 ? ((statRow.total - prevTotal) / prevTotal) * 100 : 0;

  // Revenue estimate (completed × consultation fee in DT)
  const feeInDT = doctor.consultation_fee ? doctor.consultation_fee / 1000 : 0;
  const revenueEstimate = statRow.completed * feeInDT;

  return NextResponse.json({
    doctor: {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      city: doctor.city,
    },
    month,
    stats: statRow,
    topReasons: topReasons as unknown as Array<{ reason: string; count: number }>,
    prevTotal,
    growth,
    revenueEstimate,
  });
}
