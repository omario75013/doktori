-- Migration: add configurable no-show threshold per doctor
-- Default 3 matches the platform DEFAULT_NOSHOW_THRESHOLD constant.
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS no_show_threshold integer NOT NULL DEFAULT 3;
