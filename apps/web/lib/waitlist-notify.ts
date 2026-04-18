import { db, waitlist, patients, doctors } from "@doktori/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { sendSMS } from "@/lib/sms";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Notify up to 3 waitlist patients when a slot opens for a given doctor + date.
 * Fire-and-forget — call without awaiting from cancel routes.
 */
export async function notifyWaitlistPatients(
  doctorId: string,
  slotDate: Date,
): Promise<void> {
  try {
    const dateStr = format(slotDate, "d MMMM yyyy", { locale: fr });
    const preferredDate = slotDate.toISOString().slice(0, 10); // YYYY-MM-DD

    const [doctorRow] = await db
      .select({ name: doctors.name, slug: doctors.slug })
      .from(doctors)
      .where(eq(doctors.id, doctorId))
      .limit(1);

    if (!doctorRow) return;

    const entries = await db
      .select({
        id: waitlist.id,
        patientPhone: patients.phone,
      })
      .from(waitlist)
      .innerJoin(patients, eq(waitlist.patientId, patients.id))
      .where(
        and(
          eq(waitlist.doctorId, doctorId),
          eq(waitlist.preferredDate, preferredDate),
          isNull(waitlist.notifiedAt),
        ),
      )
      .limit(3);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://doktori.tn";
    const bookUrl = `${baseUrl}/rdv/${doctorRow.slug}`;

    for (const entry of entries) {
      sendSMS(
        entry.patientPhone,
        `Doktori: Un creneau vient de se liberer chez Dr. ${doctorRow.name} le ${dateStr}. Reservez: ${bookUrl}`,
      ).catch(console.error);

      // Mark notified so other cancel events don't fire again for the same patient
      await db
        .update(waitlist)
        .set({ notifiedAt: sql`now()` })
        .where(eq(waitlist.id, entry.id));
    }
  } catch (e) {
    console.error("waitlist-notify failed:", e);
  }
}
