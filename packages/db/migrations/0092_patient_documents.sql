-- Patient ↔ Doctor shared documents.
-- One row per uploaded file. `uploaded_by` records who created it.
-- Patient upload: uploaded_by='patient', shared_with_doctor_ids holds the
--   doctors the patient picked at upload time.
-- Doctor upload (from fiche patient): uploaded_by='doctor', uploaded_by_doctor_id
--   set, shared_with_doctor_ids defaults to that doctor. Patient sees it
--   read-only with a "Créé par Dr X" badge.

CREATE TABLE IF NOT EXISTS "patient_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "uploaded_by" varchar(10) NOT NULL,
  "uploaded_by_doctor_id" uuid REFERENCES "doctors"("id") ON DELETE SET NULL,
  "shared_with_doctor_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[],
  "file_url" text NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "mime_type" varchar(100),
  "size_bytes" integer,
  "category" varchar(50),
  "title" varchar(255),
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "patient_documents_patient_idx" ON "patient_documents" ("patient_id");
CREATE INDEX IF NOT EXISTS "patient_documents_doctor_idx" ON "patient_documents" ("uploaded_by_doctor_id");
