import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const result = await db.execute(sql`
    SELECT p.id, p.name, p.phone,
           COUNT(a.id)::int AS total_visits,
           MAX(a.starts_at) AS last_visit
    FROM patients p
    INNER JOIN appointments a ON a.patient_id = p.id
    WHERE a.doctor_id = ${session.user.id}
    GROUP BY p.id, p.name, p.phone
    ORDER BY last_visit DESC
    LIMIT 100
  `);

  return NextResponse.json(result);
}
