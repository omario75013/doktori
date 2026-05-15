-- clinic_patient_phase2.sql
-- Phase 2: Patient model — per-section dossier sharing + clinic patient creation
-- Idempotent — safe to run multiple times.

-- 1. Add shared_with_clinics JSONB column to patient_medical_profile
--    Shape: { "<clinicId>": { "profile": bool, "allergies": bool, ... } }
--    Missing clinicId key means ALL sections are shared (backward compat).
DO $$
BEGIN
  ALTER TABLE patient_medical_profile
    ADD COLUMN shared_with_clinics jsonb NOT NULL DEFAULT '{}';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 2. Add created_by_clinic_id to patients
--    Tracks which clinic onboarded this patient (null for self-registered).
DO $$
BEGIN
  ALTER TABLE patients
    ADD COLUMN created_by_clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- 3. Backfill: insert patient_medical_profile rows for every patient who lacks one.
--    This guarantees the shared_with_clinics column always exists for every patient.
INSERT INTO patient_medical_profile (id, patient_id, shared_with_clinics, updated_at)
SELECT
  gen_random_uuid(),
  p.id,
  '{}',
  now()
FROM patients p
WHERE NOT EXISTS (
  SELECT 1 FROM patient_medical_profile pmp WHERE pmp.patient_id = p.id
);
