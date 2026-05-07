-- 0089_patient_cnam_fields.sql — V1 CNAM/CNSS Tunisia integration
-- Adds matricule fields to patients for pre-filling Bulletin de Soins (BS1).
-- Idempotent: safe to re-apply.

-- Widen existing cnam_number column from VARCHAR(20) to VARCHAR(30)
-- (real CNAM matricules can be e.g. "XX-XXXXXX-XX" with separators).
-- Postgres ALTER TYPE varchar widening is metadata-only and safe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients'
      AND column_name = 'cnam_number'
      AND character_maximum_length < 30
  ) THEN
    ALTER TABLE patients ALTER COLUMN cnam_number TYPE VARCHAR(30);
  END IF;
END $$;

-- New CNSS matricule (often used as the regime affiliation number).
ALTER TABLE patients ADD COLUMN IF NOT EXISTS cnss_number VARCHAR(30);

-- Régime: cnss | cnrps | convention_etudiant | convention_alaaliyah | none
ALTER TABLE patients ADD COLUMN IF NOT EXISTS cnam_regime VARCHAR(30) NOT NULL DEFAULT 'none';
