ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false NOT NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS suspension_reason text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
