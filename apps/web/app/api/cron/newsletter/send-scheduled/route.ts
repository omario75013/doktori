import { NextRequest, NextResponse } from "next/server";
import { db, newsletterIssues } from "@doktori/db";
import { and, isNull, isNotNull, lte } from "drizzle-orm";
import { sendNewsletterIssue } from "@/lib/newsletter-send";

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const due = await db
    .select({ id: newsletterIssues.id })
    .from(newsletterIssues)
    .where(
      and(
        isNotNull(newsletterIssues.scheduledAt),
        isNull(newsletterIssues.sentAt),
        lte(newsletterIssues.scheduledAt, new Date())
      )
    )
    .limit(50);

  const results = [];
  for (const { id } of due) {
    try {
      const r = await sendNewsletterIssue(id);
      results.push({ id, ...r });
    } catch (err) {
      results.push({ id, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

export const GET = handle;
export const POST = handle;
