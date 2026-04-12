ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES admin_users(id);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at timestamptz;
