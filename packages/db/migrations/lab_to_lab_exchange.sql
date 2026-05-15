-- lab_to_lab_exchange.sql
-- Idempotent. Adds shared_with_lab_ids uuid[] to patient_documents.

DO $$ BEGIN

  ALTER TABLE patient_documents
    ADD COLUMN IF NOT EXISTS shared_with_lab_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

  -- GIN index for array containment queries.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'patient_documents'
      AND indexname  = 'patient_documents_shared_labs_idx'
  ) THEN
    CREATE INDEX patient_documents_shared_labs_idx
      ON patient_documents USING GIN (shared_with_lab_ids);
  END IF;

END $$;
