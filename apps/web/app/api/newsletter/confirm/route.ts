import { NextRequest, NextResponse } from "next/server";
import { db, newsletterSubscribers } from "@doktori/db";
import { eq } from "drizzle-orm";

const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "https://doktori.tn";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token.length < 32) {
    return NextResponse.redirect(new URL("/newsletter/error", PUBLIC_URL));
  }

  const [row] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribeToken, token))
    .limit(1);

  if (!row) {
    return NextResponse.redirect(new URL("/newsletter/error", PUBLIC_URL));
  }

  if (!row.confirmedAt) {
    await db
      .update(newsletterSubscribers)
      .set({ confirmedAt: new Date(), unsubscribedAt: null })
      .where(eq(newsletterSubscribers.id, row.id));
  }

  return NextResponse.redirect(new URL("/newsletter/confirmed", PUBLIC_URL));
}
