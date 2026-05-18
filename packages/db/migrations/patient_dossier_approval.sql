-- Patient-added items (allergies, vaccinations, analyses) now require doctor
-- approval before being considered "official" in the medical record.
--
-- Status: 'pending' (default for patient-created) | 'approved' (doctor or doctor-created)
-- Doctor-created entries are auto-approved at insert time by the API.
-- Idempotent: ADD COLUMN IF NOT EXISTS.

ALTER TABLE patient_allergies
  ADD COLUMN IF NOT EXISTS created_by varchar(10) NOT NULL DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS approval_status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by_doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE patient_vaccinations
  ADD COLUMN IF NOT EXISTS created_by varchar(10) NOT NULL DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS approval_status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by_doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE patient_analyses
  ADD COLUMN IF NOT EXISTS created_by varchar(10) NOT NULL DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS approval_status varchar(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by_doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Backfill: existing rows are treated as already approved (no doctor recorded).
UPDATE patient_allergies     SET approval_status = 'approved' WHERE approval_status = 'pending' AND created_at < now() - interval '5 minutes';
UPDATE patient_vaccinations  SET approval_status = 'approved' WHERE approval_status = 'pending' AND created_at < now() - interval '5 minutes';
UPDATE patient_analyses      SET approval_status = 'approved' WHERE approval_status = 'pending' AND created_at < now() - interval '5 minutes';

CREATE INDEX IF NOT EXISTS patient_allergies_approval_idx
  ON patient_allergies (patient_id, approval_status);
CREATE INDEX IF NOT EXISTS patient_vaccinations_approval_idx
  ON patient_vaccinations (patient_id, approval_status);
CREATE INDEX IF NOT EXISTS patient_analyses_approval_idx
  ON patient_analyses (patient_id, approval_status);
