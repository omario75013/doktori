import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";
import { broadcastSos } from "@/lib/sos-broadcast";
import { closePhoneProxy } from "@/lib/phone-proxy";

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

  // Step 3: close phone proxies and broadcast for all newly expired sessions
  let proxiesClosed = 0;
  for (const { id } of allExpired) {
    try {
      await closePhoneProxy(id);
      proxiesClosed++;
    } catch (e) {
      console.error(`[SOS-CLEANUP] closePhoneProxy failed for session ${id}:`, e);
    }

    await broadcastSos(`session:${id}`, "session-update", { status: "expired" });
  }

  return NextResponse.json({
    expired: expiredPending.length,
    staleCompleted: staleAccepted.length,
    proxiesClosed,
  });
}
