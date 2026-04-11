-- ── Doctor Practices (G4) ────────────────────────────────────────────────────
-- A doctor can have multiple practice locations (cabinets).
-- This is an additive migration: old code still reads doctors.address/city/phone.

CREATE TABLE IF NOT EXISTS "doctor_practices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "address" text NOT NULL,
  "city" varchar(100) NOT NULL,
  "latitude" varchar(30),
  "longitude" varchar(30),
  "phone" varchar(30),
  "is_primary" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "doctor_practices"
  ADD CONSTRAINT "doctor_practices_doctor_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "doctor_practices_doctor_idx" ON "doctor_practices"("doctor_id");

-- Only one primary practice per doctor
CREATE UNIQUE INDEX IF NOT EXISTS "doctor_practices_primary_uidx"
  ON "doctor_practices"("doctor_id") WHERE is_primary = true;

-- ── Backfill: create a primary practice for every existing doctor ─────────────
INSERT INTO doctor_practices (doctor_id, name, address, city, latitude, longitude, phone, is_primary)
SELECT
  id,
  'Cabinet principal',
  address,
  city,
  latitude,
  longitude,
  phone,
  true
FROM doctors
WHERE NOT EXISTS (
  SELECT 1 FROM doctor_practices WHERE doctor_practices.doctor_id = doctors.id
);

-- ── Add practice_id to doctor_schedules ──────────────────────────────────────
ALTER TABLE "doctor_schedules" ADD COLUMN IF NOT EXISTS "practice_id" uuid;

DO $$
BEGIN
  BEGIN
    ALTER TABLE "doctor_schedules"
      ADD CONSTRAINT "doctor_schedules_practice_id_fk"
      FOREIGN KEY ("practice_id") REFERENCES "doctor_practices"("id") ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS "doctor_schedules_practice_idx" ON "doctor_schedules"("practice_id");

-- ── Add practice_id to appointments ──────────────────────────────────────────
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "practice_id" uuid;

DO $$
BEGIN
  BEGIN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_practice_id_fk"
      FOREIGN KEY ("practice_id") REFERENCES "doctor_practices"("id") ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS "appointments_practice_idx" ON "appointments"("practice_id");

-- ── Backfill: point existing schedules/appointments to primary practice ───────
UPDATE doctor_schedules ds
SET practice_id = dp.id
FROM doctor_practices dp
WHERE dp.doctor_id = ds.doctor_id
  AND dp.is_primary = true
  AND ds.practice_id IS NULL;

UPDATE appointments a
SET practice_id = dp.id
FROM doctor_practices dp
WHERE dp.doctor_id = a.doctor_id
  AND dp.is_primary = true
  AND a.practice_id IS NULL;

-- NOTE: practice_id remains nullable. A follow-up migration can enforce NOT NULL
-- once all code paths write it consistently.
