-- drop_secretaries_clinic_id.sql
-- Spec section D: Secretary → Clinic interaction is forbidden.
-- Drop secretaries.clinic_id column to enforce this architecturally.
-- Idempotent (DO $$).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'secretaries' AND column_name = 'clinic_id'
  ) THEN
    -- Drop the index first if it exists
    DROP INDEX IF EXISTS secretaries_clinic_idx;
    ALTER TABLE secretaries DROP COLUMN clinic_id;
    RAISE NOTICE 'Dropped secretaries.clinic_id column';
  ELSE
    RAISE NOTICE 'secretaries.clinic_id already absent, skipping';
  END IF;
END $$;
