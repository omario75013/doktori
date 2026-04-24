-- 0054_patient_enrichment — Phase 3: richer patient demographics + soft delete
-- Idempotent: safe to re-run.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS cin varchar(20),
  ADD COLUMN IF NOT EXISTS insurance_provider varchar(50),
  ADD COLUMN IF NOT EXISTS insurance_number varchar(30),
  ADD COLUMN IF NOT EXISTS emergency_contact_name varchar(120),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone varchar(30),
  ADD COLUMN IF NOT EXISTS emergency_contact_relation varchar(30),
  ADD COLUMN IF NOT EXISTS height_cm smallint,
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS occupation varchar(100),
  ADD COLUMN IF NOT EXISTS marital_status varchar(20),
  ADD COLUMN IF NOT EXISTS preferred_language varchar(5) DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS referring_doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp;

CREATE INDEX IF NOT EXISTS patients_cin_idx ON patients(cin) WHERE cin IS NOT NULL;
CREATE INDEX IF NOT EXISTS patients_deleted_at_idx ON patients(deleted_at) WHERE deleted_at IS NULL;
