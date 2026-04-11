import { NextResponse } from "next/server";
import { db, subscriptions } from "@doktori/db";
import { eq, and, lt } from "drizzle-orm";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await db.update(subscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(subscriptions.status, "active"), lt(subscriptions.endsAt, now)))
    .returning({ id: subscriptions.id });

  return NextResponse.json({ expired: result.length });
}
