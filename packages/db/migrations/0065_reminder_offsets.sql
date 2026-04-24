-- ───────────────────────────────────────────────────────────────────────────
-- Configurable reminder + cancel-alert offsets (hours before appointment)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE doctor_notification_prefs
  ADD COLUMN IF NOT EXISTS reminder_offsets_hours jsonb NOT NULL DEFAULT '[72, 24, 2]'::jsonb,
  ADD COLUMN IF NOT EXISTS cancel_alert_offsets_hours jsonb NOT NULL DEFAULT '[0]'::jsonb;

COMMENT ON COLUMN doctor_notification_prefs.reminder_offsets_hours IS
  'Array of hours before appointment when to send patient reminders. E.g. [72,24,2].';
COMMENT ON COLUMN doctor_notification_prefs.cancel_alert_offsets_hours IS
  'When doctor cancels a RDV, schedule outbound message at these hour offsets before original slot. [0] = immediate.';
