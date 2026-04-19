/**
 * No-show absenteeism policy for Doktori.
 *
 * After each no-show, call `applyNoShowPolicy` to:
 *   1. Re-fetch the updated patient row (post-increment).
 *   2. Auto-suspend if count >= threshold.
 *   3. Send a warning or suspension email/SMS to the patient.
 */

import { db, patients, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { buildNoShowWarningEmail, buildNoShowSuspensionEmail } from "@/emails/templates";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

/** Default platform-wide threshold — overridden per-doctor via noShowThreshold. */
export const DEFAULT_NOSHOW_THRESHOLD = 3;

/** How many days a suspended patient must wait before auto-unban. */
export const SUSPENSION_DAYS = 30;

export async function applyNoShowPolicy(params: {
  patientId: string;
  appointmentId: string;
  doctorId: string;
}): Promise<void> {
  const { patientId, appointmentId, doctorId } = params;

  // Fetch fresh patient row (noShowCount was already incremented by the caller)
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!patient) return;

  // Fetch doctor to get configurable threshold and name
  const [doctor] = await db
    .select({
      name: doctors.name,
      noShowThreshold: doctors.noShowThreshold,
    })
    .from(doctors)
    .where(eq(doctors.id, doctorId))
    .limit(1);

  const threshold = doctor?.noShowThreshold ?? DEFAULT_NOSHOW_THRESHOLD;
  const doctorName = doctor?.name ?? "votre médecin";
  const currentCount = patient.noShowCount;

  const shouldSuspend = currentCount >= threshold && !patient.isSuspended;

  if (shouldSuspend) {
    const now = new Date();
    await db
      .update(patients)
      .set({
        isSuspended: true,
        suspensionReason: `Suspension automatique : ${threshold} absences non justifiées`,
        suspendedAt: now,
      })
      .where(eq(patients.id, patientId));

    const unbanDate = format(addDays(now, SUSPENSION_DAYS), "d MMMM yyyy", { locale: fr });

    // SMS notification (best-effort)
    try {
      const smsText =
        `Votre compte Doktori a été temporairement suspendu suite à ${currentCount} absences ` +
        `non justifiées. Vous pourrez réserver à nouveau dans ${SUSPENSION_DAYS} jours. ` +
        `Pour contester, contactez-nous à contact@doktori.tn.`;
      await sendSMS(patient.phone, smsText, appointmentId);
    } catch (e) {
      console.error("[noshow-policy] SMS suspension failed:", e);
    }

    // Email notification (best-effort)
    if (patient.email) {
      try {
        const email = buildNoShowSuspensionEmail({
          patientName: patient.name,
          noShowCount: currentCount,
          threshold,
          unbanDate,
        });
        await sendEmail({ to: patient.email, ...email, appointmentId });
      } catch (e) {
        console.error("[noshow-policy] Email suspension failed:", e);
      }
    }
  } else if (!patient.isSuspended) {
    // Warning notification (only when not already suspended)

    // SMS notification (best-effort)
    try {
      const smsText =
        `Doktori: Vous avez été marqué(e) absent(e) à votre RDV avec ${doctorName}. ` +
        `Absences : ${currentCount}/${threshold}. ` +
        `Après ${threshold} absences, votre compte sera temporairement suspendu.`;
      await sendSMS(patient.phone, smsText, appointmentId);
    } catch (e) {
      console.error("[noshow-policy] SMS warning failed:", e);
    }

    // Email notification (best-effort)
    if (patient.email) {
      try {
        const email = buildNoShowWarningEmail({
          patientName: patient.name,
          doctorName,
          noShowCount: currentCount,
          threshold,
        });
        await sendEmail({ to: patient.email, ...email, appointmentId });
      } catch (e) {
        console.error("[noshow-policy] Email warning failed:", e);
      }
    }
  }
}
