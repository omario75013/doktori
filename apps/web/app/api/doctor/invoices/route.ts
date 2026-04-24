import { NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const doctor = await requireDoctor(req);
  if (doctor instanceof NextResponse) return doctor;

  const rows = await db.execute(sql`
    SELECT
      id,
      plan,
      status,
      price_millimes   AS "priceMillimes",
      billing_cycle    AS "billingCycle",
      payment_provider AS "paymentProvider",
      starts_at        AS "startsAt",
      ends_at          AS "endsAt",
      created_at       AS "createdAt"
    FROM subscriptions
    WHERE doctor_id = ${doctor.id}
      AND status IN ('active', 'expired', 'cancelled')
    ORDER BY created_at DESC
    LIMIT 50
  `);

  const invoices = (
    rows as unknown as Array<{
      id: string;
      plan: string;
      status: string;
      priceMillimes: number;
      billingCycle: string;
      paymentProvider: string | null;
      startsAt: string | null;
      endsAt: string | null;
      createdAt: string;
    }>
  ).map((row, index) => {
    const year = new Date(row.createdAt).getFullYear();
    const seq = String(index + 1).padStart(4, "0");
    return {
      ...row,
      invoiceNumber: `FAC-${year}-${seq}`,
    };
  });

  return NextResponse.json(invoices);
}
