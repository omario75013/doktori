-- per_doctor_sharing.sql — Add shared_with_doctor_ids to prescriptions, medical_certificates, consultation_notes
-- Idempotent: uses DO $$ ... EXCEPTION WHEN duplicate_column THEN NULL END $$

DO $$
BEGIN
  -- prescriptions
  BEGIN
    ALTER TABLE prescriptions
      ADD COLUMN shared_with_doctor_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  -- medical_certificates
  BEGIN
    ALTER TABLE medical_certificates
      ADD COLUMN shared_with_doctor_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  -- consultation_notes (only if table exists)
  BEGIN
    ALTER TABLE consultation_notes
      ADD COLUMN shared_with_doctor_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
  EXCEPTION WHEN undefined_table THEN NULL;
             WHEN duplicate_column THEN NULL;
  END;
END $$;
