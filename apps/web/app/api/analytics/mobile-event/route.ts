import { NextResponse } from "next/server";
import { db } from "@doktori/db";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, platform, appVersion, buildNumber, timestamp, ...data } =
      body;

    if (!event || !platform) {
      return NextResponse.json(
        { error: "event and platform required" },
        { status: 400 }
      );
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
