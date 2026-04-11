import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function getAppointmentPayment(appointmentId: string) {
  const result = await db.execute(sql`
    SELECT id, doctor_id, payment_status, payment_amount, payment_ref, payment_provider, paid_at
    FROM appointments
    WHERE id = ${appointmentId}
    LIMIT 1
  `);
  return (result as unknown as any[])[0] || null;
}

export async function markAppointmentPaid(appointmentId: string, ref: string, provider: string) {
  await db.execute(sql`
    UPDATE appointments
    SET payment_status = 'paid',
        payment_ref = ${ref},
        payment_provider = ${provider},
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = ${appointmentId}
  `);
}

export async function markAppointmentRefunded(appointmentId: string) {
  await db.execute(sql`
    UPDATE appointments
    SET payment_status = 'refunded',
        updated_at = NOW()
    WHERE id = ${appointmentId}
  `);
}
