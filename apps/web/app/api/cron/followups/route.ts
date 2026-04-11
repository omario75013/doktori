import { NextResponse } from "next/server";
import { db, waitlist, patients, doctors } from "@doktori/db";
import { eq, and, isNull, lte, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";

// Daily cron: sends a follow-up SMS for every waitlist row whose source is
// 'follow_up' and whose preferredDate has arrived (<= today). One-shot —
// updates notifiedAt so the row is never fired twice.
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const rows = await db
    .select({
      id: waitlist.id,
      patientPhone: patients.phone,
      patientName: patients.name,
      doctorName: doctors.name,
      doctorSlug: doctors.slug,
    })
    .from(waitlist)
    .innerJoin(patients, eq(waitlist.patientId, patients.id))
    .innerJoin(doctors, eq(waitlist.doctorId, doctors.id))
    .where(
      and(
        eq(waitlist.source, "follow_up"),
        lte(waitlist.preferredDate, today),
        isNull(waitlist.notifiedAt),
      ),
    )
    .limit(200);

  let sent = 0;
  for (const row of rows) {
    const msg = `Doktori: ${row.doctorName} vous recommande un controle. Reservez sur doktori.tn/rdv/${row.doctorSlug}`;
    const result = await sendSMS(row.patientPhone, msg);
    if (result.success) {
      await db
        .update(waitlist)
        .set({ notifiedAt: sql`now()` })
        .where(eq(waitlist.id, row.id));
      sent++;
    }
  }

  return NextResponse.json({ sent, candidates: rows.length, date: today });
}
