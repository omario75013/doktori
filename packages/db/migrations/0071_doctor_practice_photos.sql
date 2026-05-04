-- 0071_doctor_practice_photos
-- Add a JSONB array of photo URLs to doctor_practices for cabinet gallery display.
-- Each element: { url: string, alt?: string }

ALTER TABLE doctor_practices
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;
