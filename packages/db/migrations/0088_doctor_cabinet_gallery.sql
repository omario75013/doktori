-- 0088_doctor_cabinet_gallery.sql
--
-- Adds a doctor-level cabinet gallery (separate from per-practice photos which
-- live on doctor_practices.photos). Free-form array of public image URLs;
-- max 6 enforced at the application layer.
--
-- Idempotent: safe to run multiple times.
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS cabinet_gallery_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
