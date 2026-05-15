-- patient_identity_unique.sql
-- Idempotent: adds partial UNIQUE indexes on patients.cin and ensures patients.phone UNIQUE exists.
-- Applied via scripts/apply-patient-identity.cjs

DO $$
BEGIN
  -- CIN: partial unique (only when cin IS NOT NULL)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'patients' AND indexname = 'patients_cin_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX patients_cin_unique_idx ON patients (cin) WHERE cin IS NOT NULL;
    RAISE NOTICE 'Created patients_cin_unique_idx';
  ELSE
    RAISE NOTICE 'patients_cin_unique_idx already exists, skipping';
  END IF;

  -- Phone: check if the existing patients_phone_idx is already unique
  -- (schema.ts uses uniqueIndex which creates a unique index named patients_phone_idx)
  -- Nothing to do if it already exists as unique; add fallback partial unique just in case
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'patients' AND indexname = 'patients_phone_unique_partial_idx'
  ) THEN
    -- Only add if patients_phone_idx is NOT already unique
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'patients' AND indexname = 'patients_phone_idx'
        AND (
          SELECT indisunique FROM pg_index i
          JOIN pg_class c ON c.oid = i.indexrelid
          WHERE c.relname = 'patients_phone_idx'
        ) = true
    ) THEN
      CREATE UNIQUE INDEX patients_phone_unique_partial_idx ON patients (phone) WHERE phone IS NOT NULL;
      RAISE NOTICE 'Created patients_phone_unique_partial_idx';
    ELSE
      RAISE NOTICE 'patients_phone_idx is already unique, skipping partial index';
    END IF;
  ELSE
    RAISE NOTICE 'patients_phone_unique_partial_idx already exists, skipping';
  END IF;

END $$;
