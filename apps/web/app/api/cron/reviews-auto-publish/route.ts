import { NextResponse } from "next/server";
import { db, reviews } from "@doktori/db";
import { and, eq, lt, sql } from "drizzle-orm";

// G12: auto-publish reviews that have been sitting in `pending` for more
// than 48 hours. Runs every 6 hours. Pending reviews that weren't manually
// rejected are assumed legit and get promoted to `published` so they surface
// on doctor profiles without needing a moderator click-through.
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const cutoff = sql`now() - interval '48 hours'`;

  const promoted = await db
    .update(reviews)
    .set({ status: "published" })
    .where(and(eq(reviews.status, "pending"), lt(reviews.createdAt, cutoff as unknown as Date)))
    .returning({ id: reviews.id });

  // TODO: wire system actor once admin-audit supports non-admin callers
  return NextResponse.json({ promoted: promoted.length });
}
