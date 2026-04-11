import { NextResponse } from "next/server";
import { db, waitlist, doctors, patients } from "@doktori/db";
import { eq, and, isNull } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  const preferredDate = searchParams.get("date");

  if (!doctorId || !preferredDate) {
    return NextResponse.json({ error: "doctorId et date requis" }, { status: 400 });
  }

  // Find waitlist entries that haven't been notified yet
  const entries = await db
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
    .where(and(
      eq(waitlist.doctorId, doctorId),
      eq(waitlist.preferredDate, preferredDate),
      isNull(waitlist.notifiedAt),
    ))
    .limit(10); // Notify up to 10 patients at a time

  let notified = 0;
  for (const entry of entries) {
    const msg = `Doktori: Un creneau s'est libere chez ${entry.doctorName} le ${preferredDate}. Reservez vite: doktori.tn/rdv/${entry.doctorSlug}`;
    const result = await sendSMS(entry.patientPhone, msg);
    if (result.success) {
      await db.update(waitlist).set({ notifiedAt: new Date() }).where(eq(waitlist.id, entry.id));
      notified++;
    }
  }

  return NextResponse.json({ notified });
}
