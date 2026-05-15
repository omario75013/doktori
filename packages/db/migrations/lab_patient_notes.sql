-- lab_patient_notes.sql
-- Internal notes written by lab staff about a patient. Not visible to doctors or patients.
-- Idempotent.

CREATE TABLE IF NOT EXISTS lab_patient_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_lab_user_id uuid REFERENCES lab_users(id) ON DELETE SET NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_patient_notes_lab_patient_idx
  ON lab_patient_notes(lab_id, patient_id, created_at DESC);
