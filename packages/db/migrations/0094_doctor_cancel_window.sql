-- Add per-doctor cancellation window so the patient self-cancel API
-- can refuse cancellations placed too close to the appointment start.
-- Default 2h.

ALTER TABLE "doctors"
  ADD COLUMN IF NOT EXISTS "patient_cancel_window_hours" integer NOT NULL DEFAULT 2;
