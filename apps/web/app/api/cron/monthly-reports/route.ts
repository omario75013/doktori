import { NextResponse } from "next/server";
import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Compute previous month
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  const allDoctors = await db.select({ id: doctors.id, name: doctors.name, phone: doctors.phone })
    .from(doctors)
    .where(eq(doctors.isActive, true));

  const baseUrl = process.env.NEXTAUTH_URL || "https://doktori.tn";
  let sent = 0;

  for (const doc of allDoctors) {
    const reportUrl = `${baseUrl}/rapport/${doc.id}/${monthStr}`;
    const msg = `Doktori: Votre rapport mensuel de ${prevMonth.toLocaleDateString("fr-FR", { month: "long" })} est disponible: ${reportUrl}`;
    try {
      await sendSMS(doc.phone, msg);
      sent++;
    } catch (e) {
      console.error(`Failed to send to ${doc.id}:`, e);
    }
  }

  return NextResponse.json({ sent, month: monthStr });
}
