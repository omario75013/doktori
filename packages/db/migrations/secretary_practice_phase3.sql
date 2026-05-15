-- Phase 3: Secretary cabinet scoping
-- Adds practice_id to secretaries so the clinic view can scope secretaries
-- to a specific doctor_practices row rather than leaking all cabinets.
-- Idempotent: wrapped in DO $$ block to skip if column already exists.

DO $$
BEGIN
  -- 1. Add practice_id column (nullable for back-compat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'secretaries'
       AND column_name = 'practice_id'
  ) THEN
    ALTER TABLE secretaries
      ADD COLUMN practice_id uuid
        REFERENCES doctor_practices(id)
        ON DELETE SET NULL;
  END IF;

  -- 2. Index for efficient scoping queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'secretaries'
       AND indexname = 'secretaries_practice_idx'
  ) THEN
    CREATE INDEX secretaries_practice_idx ON secretaries(practice_id);
  END IF;

END $$;

-- 3. Backfill: for every row where practice_id IS NULL, set it to the
--    doctor's is_primary=true practice, falling back to the first practice
--    by created_at ASC if no primary exists.
UPDATE secretaries s
SET practice_id = (
  SELECT dp.id
  FROM doctor_practices dp
  WHERE dp.doctor_id = s.doctor_id
    AND dp.is_active = true
  ORDER BY dp.is_primary DESC, dp.created_at ASC
  LIMIT 1
)
WHERE s.practice_id IS NULL;
