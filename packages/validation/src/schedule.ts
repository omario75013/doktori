import { z } from "zod";

export const scheduleSlotSchema = z
  .object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    slotDuration: z.number().min(5).max(120),
    isActive: z.boolean(),
  })
  .refine((slot) => slot.startTime < slot.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export const scheduleUpdateSchema = z.object({
  /**
   * When provided, replaces only the schedule for this practice (cabinet).
   * Required as of migration 0063 (per-cabinet scoping). Omit only in legacy
   * flows that write a doctor-global schedule; the server will fall back to
   * the doctor's primary practice.
   */
  practiceId: z.string().uuid().optional(),
  slots: z.array(scheduleSlotSchema),
});

export type ScheduleSlotInput = z.infer<typeof scheduleSlotSchema>;
