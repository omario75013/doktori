import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db, smsLogs } from "@doktori/db";
import { and, count, eq, gte, sum } from "drizzle-orm";

export async function GET() {
  const admin = await requireAdmin(["super_admin", "marketing"]);
  if (admin instanceof NextResponse) return admin;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    [{ totalSent }],
    [{ totalDelivered }],
    [{ monthlyCostMillimes }],
    [{ monthlySent }],
  ] = await Promise.all([
    db
      .select({ totalSent: count() })
      .from(smsLogs)
      .where(eq(smsLogs.status, "sent")),
    db
      .select({ totalDelivered: count() })
      .from(smsLogs)
      .where(eq(smsLogs.status, "delivered")),
    db
      .select({ monthlyCostMillimes: sum(smsLogs.cost) })
      .from(smsLogs)
      .where(gte(smsLogs.createdAt, startOfMonth)),
    db
      .select({ monthlySent: count() })
      .from(smsLogs)
      .where(
        and(
          gte(smsLogs.createdAt, startOfMonth),
          eq(smsLogs.status, "delivered")
        )
      ),
  ]);

  // Delivery rate = delivered / (sent + delivered) across all time
  const sentCount = Number(totalSent);
  const deliveredCount = Number(totalDelivered);
  const totalTerminal = sentCount + deliveredCount;
  const deliveryRate =
    totalTerminal > 0
      ? Math.round((deliveredCount / totalTerminal) * 100)
      : null;

  // Monthly cost in DT (cost stored in millimes: 1 DT = 1000 millimes)
  const monthlyCostDT =
    monthlyCostMillimes != null
      ? (Number(monthlyCostMillimes) / 1000).toFixed(3)
      : "0.000";

  return NextResponse.json({
    totalSent: sentCount + deliveredCount,
    deliveryRate,
    monthlyCostDT,
    monthlySent: Number(monthlySent),
  });
}
