-- Per-doctor dossier entries: each doctor owns their own copy of each section's
-- data + a shared flag. Other doctors see only entries marked shared.
-- One row per (patient_id, doctor_id, section).

CREATE TABLE IF NOT EXISTS patient_dossier_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id   uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  section     varchar(40) NOT NULL,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  shared      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_dossier_entries_unique UNIQUE (patient_id, doctor_id, section)
);

CREATE INDEX IF NOT EXISTS patient_dossier_entries_patient_section_idx
  ON patient_dossier_entries (patient_id, section);
CREATE INDEX IF NOT EXISTS patient_dossier_entries_doctor_idx
  ON patient_dossier_entries (doctor_id);
