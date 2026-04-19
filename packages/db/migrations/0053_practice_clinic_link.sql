-- Migration: link practices to clinics
-- A practice can optionally belong to a clinic (a doctor can work at a clinic as one of their locations)

ALTER TABLE doctor_practices ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS doctor_practices_clinic_idx ON doctor_practices(clinic_id) WHERE clinic_id IS NOT NULL;

-- For existing clinic_doctors entries, auto-create a matching practice entry linked to the clinic
-- Only creates entries that don't already exist (safe to re-run)
INSERT INTO doctor_practices (doctor_id, name, address, city, clinic_id, is_primary)
SELECT cd.doctor_id, c.name, c.address, c.city, c.id, false
FROM clinic_doctors cd
JOIN clinics c ON c.id = cd.clinic_id
WHERE NOT EXISTS (
  SELECT 1 FROM doctor_practices dp
  WHERE dp.doctor_id = cd.doctor_id AND dp.clinic_id = c.id
);
