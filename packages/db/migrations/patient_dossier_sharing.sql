-- Per-patient dossier section sharing preferences. The "set_by_doctor_id"
-- always sees the full dossier (they own the toggles). Other doctors see
-- only sections marked shared=true.
--
-- Sharing JSON keys: medicalSummary | familyHistory | lifestyle | surgeries
--                    | hospitalizations | vaccinations | womensHealth
-- Default (no row) = everything shared.

CREATE TABLE IF NOT EXISTS patient_dossier_sharing (
  patient_id        uuid PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  sharing           jsonb NOT NULL DEFAULT '{}'::jsonb,
  set_by_doctor_id  uuid REFERENCES doctors(id) ON DELETE SET NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
