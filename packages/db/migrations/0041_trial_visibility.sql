-- Add trial status support + visibility flag
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS cgu_accepted_at timestamptz;

-- Backfill: existing doctors are visible
UPDATE doctors SET is_visible = true WHERE is_visible IS NULL;
