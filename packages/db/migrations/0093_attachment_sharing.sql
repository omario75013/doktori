-- Add shared_with_doctor_ids to patient_attachments so a patient can share
-- an existing file with one or more doctors without duplicating the row.
-- Empty array = private (default behaviour).

ALTER TABLE "patient_attachments"
  ADD COLUMN IF NOT EXISTS "shared_with_doctor_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[];
