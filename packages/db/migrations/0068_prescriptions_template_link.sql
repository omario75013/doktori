-- 0068 — Track which template generated each prescription (for metrics + debug)
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES prescription_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS prescriptions_template_idx
  ON prescriptions(template_id) WHERE template_id IS NOT NULL;
