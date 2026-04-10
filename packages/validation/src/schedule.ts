import { z } from "zod";

export const scheduleSlotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration: z.number().min(5).max(120),
  isActive: z.boolean(),
});

export const scheduleUpdateSchema = z.object({
  slots: z.array(scheduleSlotSchema),
});

export type ScheduleSlotInput = z.infer<typeof scheduleSlotSchema>;
