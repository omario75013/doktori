import { db } from "../client";
import { doctorSchedules, doctorPractices } from "../schema";
import { eq, and } from "drizzle-orm";

export async function getScheduleForDoctor(doctorId: string) {
  return db
    .select()
    .from(doctorSchedules)
    .where(eq(doctorSchedules.doctorId, doctorId))
    .orderBy(doctorSchedules.practiceId, doctorSchedules.dayOfWeek);
}

export async function getScheduleForPractice(doctorId: string, practiceId: string) {
  return db
    .select()
    .from(doctorSchedules)
    .where(
      and(
        eq(doctorSchedules.doctorId, doctorId),
        eq(doctorSchedules.practiceId, practiceId)
      )
    )
    .orderBy(doctorSchedules.dayOfWeek);
}

/**
 * Replace the schedule for a single (doctor, practice) pair.
 * If `practiceId` is omitted, the doctor's primary practice is used.
 * Throws if the doctor has no primary practice and none is specified.
 */
export async function upsertSchedule(
  doctorId: string,
  slots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
    isActive: boolean;
  }>,
  practiceId?: string
) {
  // Resolve target practice: explicit → check ownership; otherwise primary.
  let targetPracticeId = practiceId;
  if (!targetPracticeId) {
    const [primary] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(
        and(eq(doctorPractices.doctorId, doctorId), eq(doctorPractices.isPrimary, true))
      )
      .limit(1);
    if (!primary) {
      throw new Error(
        "Aucun cabinet primaire — crée un cabinet avant de définir les horaires"
      );
    }
    targetPracticeId = primary.id;
  } else {
    // Verify the practice belongs to this doctor
    const [owned] = await db
      .select({ id: doctorPractices.id })
      .from(doctorPractices)
      .where(
        and(
          eq(doctorPractices.id, targetPracticeId),
          eq(doctorPractices.doctorId, doctorId)
        )
      )
      .limit(1);
    if (!owned) {
      throw new Error("Cabinet introuvable");
    }
  }

  return await db.transaction(async (tx) => {
    // Delete only this practice's rows; schedules at OTHER practices stay intact.
    await tx
      .delete(doctorSchedules)
      .where(
        and(
          eq(doctorSchedules.doctorId, doctorId),
          eq(doctorSchedules.practiceId, targetPracticeId!)
        )
      );

    if (slots.length === 0) return [];

    return tx
      .insert(doctorSchedules)
      .values(
        slots.map((s) => ({
          doctorId,
          practiceId: targetPracticeId!,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDuration: s.slotDuration,
          isActive: s.isActive,
        }))
      )
      .returning();
  });
}
