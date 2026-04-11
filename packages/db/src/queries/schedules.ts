import { db } from "../client";
import { doctorSchedules } from "../schema";
import { eq } from "drizzle-orm";

export async function getScheduleForDoctor(doctorId: string) {
  return db
    .select()
    .from(doctorSchedules)
    .where(eq(doctorSchedules.doctorId, doctorId))
    .orderBy(doctorSchedules.dayOfWeek);
}

export async function upsertSchedule(
  doctorId: string,
  slots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
    isActive: boolean;
  }>
) {
  // Transactional delete + insert to prevent losing schedule on partial failure
  return await db.transaction(async (tx) => {
    await tx.delete(doctorSchedules).where(eq(doctorSchedules.doctorId, doctorId));

    if (slots.length === 0) return [];

    return tx
      .insert(doctorSchedules)
      .values(
        slots.map((s) => ({
          doctorId,
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
