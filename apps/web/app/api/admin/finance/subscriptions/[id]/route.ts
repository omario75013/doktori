import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(["super_admin", "finance"]);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  const result = await db.execute(sql`
    SELECT
      s.id,
      s.plan,
      s.status,
      s.billing_cycle,
      s.price_millimes,
      s.payment_provider,
      s.external_ref,
      s.starts_at,
      s.ends_at,
      s.cancelled_at,
      s.created_at,
      s.updated_at,
      d.id AS doctor_id,
      d.name AS doctor_name,
      d.email AS doctor_email,
      d.specialty AS doctor_specialty,
      d.city AS doctor_city
    FROM subscriptions s
    LEFT JOIN doctors d ON d.id = s.doctor_id
    WHERE s.id = ${id}
    LIMIT 1
  `);

  const subscription = (result as unknown as Record<string, unknown>[])[0];
  if (!subscription) {
    return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });
  }

  return NextResponse.json({ subscription });
}
