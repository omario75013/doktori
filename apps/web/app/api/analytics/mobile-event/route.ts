import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

// Simple in-memory rate limiter: max 100 events per IP per minute
const ipCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 100;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ ok: true }); // Silent drop, don't reveal rate limit to attacker
    }

    const body = await req.json();
    const { event, platform, appVersion, buildNumber, timestamp, ...data } =
      body;

    if (!event || typeof event !== "string" || event.length > 50) {
      return NextResponse.json({ ok: true }); // Silent drop on bad input
    }
    if (!platform || typeof platform !== "string" || !["ios", "android", "web"].includes(platform)) {
      return NextResponse.json({ ok: true });
    }

    await db.execute(sql`
      INSERT INTO mobile_analytics (event, platform, app_version, build_number, event_data, created_at)
      VALUES (
        ${event},
        ${platform},
        ${appVersion || null},
        ${buildNumber || null},
        ${JSON.stringify(data)}::jsonb,
        ${timestamp || new Date().toISOString()}
      )
    `);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[analytics]", e);
    return NextResponse.json({ ok: true }); // Never fail — analytics is best-effort
  }
}
