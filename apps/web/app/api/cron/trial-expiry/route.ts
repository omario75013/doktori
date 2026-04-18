import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@doktori/db";
import { sendEmail } from "@/lib/email";
import {
  buildTrialExpiryWarningEmail,
  buildTrialExpiredTodayEmail,
} from "@/emails/templates";

type TrialRow = { id: string; ends_at: string; name: string; email: string; doctor_id: string };

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let warned7 = 0;
  let warned1 = 0;
  let expiredToday = 0;

  // Trials expiring in exactly 7 days
  const sevenDayRows = await db.execute(sql`
    SELECT s.id, s.ends_at, d.name, d.email, d.id AS doctor_id
    FROM subscriptions s
    JOIN doctors d ON d.id = s.doctor_id
    WHERE s.status = 'trial'
      AND s.ends_at::date = (CURRENT_DATE + interval '7 days')::date
  `) as unknown as TrialRow[];

  for (const row of sevenDayRows) {
    const trialEndDate = new Date(row.ends_at).toLocaleDateString("fr-TN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    sendEmail({
      to: row.email,
      ...buildTrialExpiryWarningEmail({
        doctorName: row.name,
        trialEndDate,
        daysLeft: 7,
      }),
    }).catch(console.error);
    warned7++;
  }

  // Trials expiring in exactly 1 day
  const oneDayRows = await db.execute(sql`
    SELECT s.id, s.ends_at, d.name, d.email, d.id AS doctor_id
    FROM subscriptions s
    JOIN doctors d ON d.id = s.doctor_id
    WHERE s.status = 'trial'
      AND s.ends_at::date = (CURRENT_DATE + interval '1 day')::date
  `) as unknown as TrialRow[];

  for (const row of oneDayRows) {
    const trialEndDate = new Date(row.ends_at).toLocaleDateString("fr-TN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    sendEmail({
      to: row.email,
      ...buildTrialExpiryWarningEmail({
        doctorName: row.name,
        trialEndDate,
        daysLeft: 1,
      }),
    }).catch(console.error);
    warned1++;
  }

  // Trials that expired (still marked as trial — not yet caught by subscriptions cron)
  const expiredRows = await db.execute(sql`
    SELECT s.id, s.ends_at, d.name, d.email, d.id AS doctor_id
    FROM subscriptions s
    JOIN doctors d ON d.id = s.doctor_id
    WHERE s.status = 'trial'
      AND s.ends_at < NOW()
  `) as unknown as TrialRow[];

  for (const row of expiredRows) {
    // Mark subscription expired
    await db.execute(sql`
      UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE id = ${row.id}
    `);

    // Hide doctor from search
    await db.execute(sql`
      UPDATE doctors SET is_visible = false WHERE id = ${row.doctor_id}
    `);

    const expiredEmail = buildTrialExpiredTodayEmail({ doctorName: row.name });
    sendEmail({
      to: row.email,
      subject: expiredEmail.subject,
      html: expiredEmail.html,
    }).catch(console.error);
    expiredToday++;
  }

  return NextResponse.json({ warned7, warned1, expiredToday });
}
