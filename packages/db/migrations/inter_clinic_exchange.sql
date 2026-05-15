-- inter_clinic_exchange.sql
-- Idempotent. Adds shared_with_clinic_ids uuid[] to patient_documents.

ALTER TABLE patient_documents
  ADD COLUMN IF NOT EXISTS shared_with_clinic_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS patient_documents_shared_clinics_idx
  ON patient_documents USING GIN (shared_with_clinic_ids);
