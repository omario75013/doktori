-- clinic_labs.sql
-- Idempotent migration: adds clinic_id + kind to labs table.
-- Applied by: node scripts/apply-clinic-labs.cjs

DO $$
BEGIN
  -- Add clinic_id column (nullable FK → clinics)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labs' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE labs ADD COLUMN clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL;
  END IF;

  -- Add kind column ('lab' | 'radiology')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labs' AND column_name = 'kind'
  ) THEN
    ALTER TABLE labs ADD COLUMN kind varchar(20) NOT NULL DEFAULT 'lab';
  END IF;
END $$;

-- Index on clinic_id for fast in-house lookup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'labs' AND indexname = 'labs_clinic_id_idx'
  ) THEN
    CREATE INDEX labs_clinic_id_idx ON labs(clinic_id);
  END IF;
END $$;
