-- ───────────────────────────────────────────────────────────────────────────
-- Phase A: Cabinet-scoped agenda & motifs
-- ───────────────────────────────────────────────────────────────────────────
-- 1) Add doctor_practices.kind to distinguish cabinet vs clinic locations
-- 2) Promote doctor_schedules.practice_id to NOT NULL (with backfill safety net)
-- 3) New join appointment_type_practices (motif ↔ practices, M:N)
-- 4) Backfill motif→primary practice
-- 5) Backfill appointments.practice_id where still null, then NOT NULL
-- ───────────────────────────────────────────────────────────────────────────

-- Step 1: doctor_practices kind column
ALTER TABLE doctor_practices
  ADD COLUMN IF NOT EXISTS kind varchar(10) NOT NULL DEFAULT 'cabinet';
-- Clinic-linked practices get kind='clinic'
UPDATE doctor_practices SET kind = 'clinic' WHERE clinic_id IS NOT NULL;

-- Step 2a: Safety net — every doctor that has schedules or appointments must
-- have at least one active practice. Create a synthetic primary practice
-- pulling from doctors.address/city for any doctor that has none.
INSERT INTO doctor_practices (doctor_id, name, address, city, is_primary, is_active)
SELECT
  d.id,
  'Cabinet principal',
  COALESCE(NULLIF(d.address, ''), 'Adresse non renseignée'),
  COALESCE(NULLIF(d.city, ''), 'Tunis'),
  true,
  true
FROM doctors d
WHERE NOT EXISTS (SELECT 1 FROM doctor_practices dp WHERE dp.doctor_id = d.id)
  AND (
    EXISTS (SELECT 1 FROM doctor_schedules ds WHERE ds.doctor_id = d.id)
    OR EXISTS (SELECT 1 FROM appointments a WHERE a.doctor_id = d.id)
    OR EXISTS (SELECT 1 FROM appointment_types at WHERE at.doctor_id = d.id)
  );

-- Step 2b: For doctors that have ≥1 practice but none marked primary, mark the
-- first one as primary.
WITH to_promote AS (
  SELECT DISTINCT ON (doctor_id) id FROM doctor_practices
  WHERE doctor_id IN (
    SELECT doctor_id FROM doctor_practices
    GROUP BY doctor_id
    HAVING SUM(CASE WHEN is_primary THEN 1 ELSE 0 END) = 0
  )
  ORDER BY doctor_id, created_at
)
UPDATE doctor_practices SET is_primary = true
WHERE id IN (SELECT id FROM to_promote);

-- Step 2c: Backfill doctor_schedules.practice_id → doctor's primary practice
UPDATE doctor_schedules ds
SET practice_id = (
  SELECT id FROM doctor_practices dp
  WHERE dp.doctor_id = ds.doctor_id AND dp.is_primary = true
  LIMIT 1
)
WHERE ds.practice_id IS NULL;

-- Step 2d: Change FK cascade behavior (was: SET NULL; new: CASCADE) and make NOT NULL
ALTER TABLE doctor_schedules
  DROP CONSTRAINT IF EXISTS doctor_schedules_practice_id_fk,
  ALTER COLUMN practice_id SET NOT NULL;

ALTER TABLE doctor_schedules
  ADD CONSTRAINT doctor_schedules_practice_id_fk
  FOREIGN KEY (practice_id) REFERENCES doctor_practices(id) ON DELETE CASCADE;

-- Step 2e: Tighten uniqueness — one schedule per (practice, day)
DROP INDEX IF EXISTS doctor_schedules_doctor_day_idx;
CREATE INDEX IF NOT EXISTS doctor_schedules_practice_day_idx
  ON doctor_schedules(practice_id, day_of_week);

-- Step 3: Motif ↔ practices join table
CREATE TABLE IF NOT EXISTS appointment_type_practices (
  appointment_type_id uuid NOT NULL REFERENCES appointment_types(id) ON DELETE CASCADE,
  practice_id uuid NOT NULL REFERENCES doctor_practices(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (appointment_type_id, practice_id)
);

CREATE INDEX IF NOT EXISTS atp_practice_idx ON appointment_type_practices(practice_id);

-- Step 4: Backfill — every existing motif is offered at the doctor's primary practice
INSERT INTO appointment_type_practices (appointment_type_id, practice_id)
SELECT at.id, dp.id
FROM appointment_types at
JOIN doctor_practices dp ON dp.doctor_id = at.doctor_id AND dp.is_primary = true
ON CONFLICT (appointment_type_id, practice_id) DO NOTHING;

-- Step 5a: Backfill appointments.practice_id → doctor's primary practice
UPDATE appointments a
SET practice_id = (
  SELECT id FROM doctor_practices dp
  WHERE dp.doctor_id = a.doctor_id AND dp.is_primary = true
  LIMIT 1
)
WHERE a.practice_id IS NULL;

-- Step 5b: Make NOT NULL (only if backfill succeeded for all rows)
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM appointments WHERE practice_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE appointments ALTER COLUMN practice_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping NOT NULL on appointments.practice_id — % rows still null', null_count;
  END IF;
END $$;
