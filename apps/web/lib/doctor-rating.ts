import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function recomputeDoctorRating(doctorId: string): Promise<void> {
  await db.execute(sql`
    UPDATE doctors SET
      average_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE doctor_id = ${doctorId} AND status = 'published'), 0),
      review_count = COALESCE((SELECT COUNT(*) FROM reviews WHERE doctor_id = ${doctorId} AND status = 'published'), 0),
      updated_at = NOW()
    WHERE id = ${doctorId}
  `);
}
