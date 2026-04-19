-- Migration 0049: Doctor verification workflow
-- Adds verification_status, verification_note, verified_at to doctors
-- Creates doctor_documents table for uploaded verification files

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_status varchar(20) NOT NULL DEFAULT 'pending';
-- pending | documents_submitted | approved | rejected

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_note text;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE TABLE IF NOT EXISTS doctor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL, -- 'diplome' | 'carte_cnom' | 'cin' | 'autre'
  file_url text NOT NULL,
  file_name varchar(255) NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doctor_documents_doctor_idx ON doctor_documents(doctor_id);

-- Backfill: existing doctors are considered approved
UPDATE doctors
SET verification_status = 'approved',
    verified_at = created_at
WHERE verification_status = 'pending';
