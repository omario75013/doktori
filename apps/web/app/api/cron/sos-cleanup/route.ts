import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { finalizeSosSession } from "@/lib/sos-lifecycle";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 1: expire pending sessions past expires_at
  const expiredPendingResult = await db.execute(sql`
    UPDATE sos_sessions
    SET status = 'expired', resolution = 'expired'
    WHERE status = 'pending' AND expires_at < NOW()
    RETURNING id
  `);
  const expiredPending = expiredPendingResult as unknown as Array<{ id: string }>;

  // Step 2: expire accepted sessions older than 24 hours (safety net)
  const staleAcceptedResult = await db.execute(sql`
    UPDATE sos_sessions
    SET status = 'expired', resolution = 'expired'
    WHERE status = 'accepted' AND accepted_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  `);
  const staleAccepted = staleAcceptedResult as unknown as Array<{ id: string }>;

  const allExpired = [...expiredPending, ...staleAccepted];

  // Step 3: parallel proxy cleanup + broadcast for all expired sessions
  await Promise.allSettled(
    allExpired.map(({ id }) => finalizeSosSession(id, "expired")),
  );

  return NextResponse.json({
    expired: expiredPending.length,
    staleCompleted: staleAccepted.length,
    proxiesClosed: allExpired.length,
  });
}
