import { NextResponse, NextRequest } from "next/server";
import { db, callSessions, doctors, secretaries } from "@doktori/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { resolveCaller } from "@/lib/call-auth";

// Return ringing calls destined to this user (within last 60s to avoid stale)
export async function GET(req: NextRequest) {
  const me = await resolveCaller(req);
  if ("err" in me) return me.err;

  const since = new Date(Date.now() - 60 * 1000);
  const rows = (await db.execute(sql`
    SELECT
      c.id,
      c.caller_type AS "callerType",
      c.caller_id   AS "callerId",
      c.status,
      c.created_at  AS "createdAt",
      CASE
        WHEN c.caller_type = 'doctor' THEN (SELECT d.name FROM doctors d WHERE d.id = c.caller_id)
        WHEN c.caller_type = 'secretary' THEN (SELECT s.name FROM secretaries s WHERE s.id = c.caller_id)
      END AS "callerName",
      CASE
        WHEN c.caller_type = 'doctor' THEN (SELECT d.photo_url FROM doctors d WHERE d.id = c.caller_id)
        WHEN c.caller_type = 'secretary' THEN (SELECT s.photo_url FROM secretaries s WHERE s.id = c.caller_id)
      END AS "callerPhotoUrl"
    FROM call_sessions c
    WHERE c.callee_type = ${me.type}
      AND c.callee_id = ${me.id}
      AND c.status = 'ringing'
      AND c.created_at > ${since.toISOString()}
    ORDER BY c.created_at DESC
    LIMIT 1
  `)) as unknown as Array<{
    id: string;
    callerType: string;
    callerId: string;
    status: string;
    createdAt: string;
    callerName: string | null;
    callerPhotoUrl: string | null;
  }>;

  return NextResponse.json(rows);
}
