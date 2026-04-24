-- 0055_secretary_permissions — Phase 4: per-section access control for secretaries
-- Idempotent.

ALTER TABLE secretaries
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{
    "agenda":true,
    "patients":true,
    "rendezVous":true,
    "messagerie":false,
    "wallet":false,
    "factures":false,
    "motifs":true,
    "cabinets":false,
    "teleconsult":false
  }'::jsonb;
