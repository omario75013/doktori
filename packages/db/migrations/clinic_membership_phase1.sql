-- clinic_membership_phase1.sql
-- Phase 1: Doctor membership model overhaul
-- Idempotent — safe to run multiple times.

-- 1. Add created_by_clinic_id to doctors (nullable FK to clinics)
--    Marks doctors that were created directly by a clinic admin.
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS created_by_clinic_id uuid
    REFERENCES clinics(id) ON DELETE SET NULL;

-- 2. Backfill doctor_practices for clinic members who have no practice row
--    for that clinic yet. Creates one practice per (doctor, clinic) pair
--    that exists in clinic_doctors but lacks a matching doctor_practices row.
INSERT INTO doctor_practices (
  id,
  doctor_id,
  clinic_id,
  name,
  address,
  city,
  phone,
  kind,
  is_primary,
  is_active,
  photos,
  created_at
)
SELECT
  gen_random_uuid(),
  cd.doctor_id,
  cd.clinic_id,
  c.name,
  c.address,
  c.city,
  c.phone,
  'clinic',
  false,
  true,
  '[]'::jsonb,
  now()
FROM clinic_doctors cd
JOIN clinics c ON c.id = cd.clinic_id
WHERE NOT EXISTS (
  SELECT 1
  FROM doctor_practices dp
  WHERE dp.doctor_id = cd.doctor_id
    AND dp.clinic_id = cd.clinic_id
);
