-- Reminder & notification preferences — richer settings per channel/type.
-- - `appointment_reminder_offsets`: integer[] (hours before the RDV)
-- - `vaccine_reminders_enabled`: boolean
-- - `vaccine_reminder_days_before`: integer (days before the due date)
-- - `medication_reminders_enabled`: boolean (global toggle)
ALTER TABLE patient_notification_prefs
  ADD COLUMN IF NOT EXISTS appointment_reminder_offsets integer[] NOT NULL DEFAULT ARRAY[168, 24, 2],
  ADD COLUMN IF NOT EXISTS vaccine_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vaccine_reminder_days_before integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS medication_reminders_enabled boolean NOT NULL DEFAULT true;

-- Per-medication reminder: enable + scheduled times of day (e.g. ['08:00','20:00']).
ALTER TABLE patient_medications
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_times text[] NOT NULL DEFAULT ARRAY[]::text[];
