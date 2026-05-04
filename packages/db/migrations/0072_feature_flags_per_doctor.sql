-- 0072 — Per-doctor pilot gating on feature_flags

ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS enabled_doctor_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS feature_flags_enabled_doctor_ids_gin
  ON feature_flags USING gin (enabled_doctor_ids);

COMMENT ON COLUMN feature_flags.enabled_doctor_ids IS
  'When non-empty: feature is enabled ONLY for these doctor IDs (pilot mode). When empty + enabled=true: enabled for all. When empty + enabled=false: disabled for all.';
