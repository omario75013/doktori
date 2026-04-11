-- G5: Structured SOAP consultation notes with vitals and ICD-10
CREATE TABLE IF NOT EXISTS "consultation_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "subjective" text,
  "objective" text,
  "assessment" text,
  "plan" text,
  "vitals" jsonb,
  "icd10_codes" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "consultation_notes" ADD CONSTRAINT "consultation_notes_appointment_id_fk"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "consultation_notes" ADD CONSTRAINT "consultation_notes_doctor_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "consultation_notes" ADD CONSTRAINT "consultation_notes_patient_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "consultation_notes_appointment_uidx" ON "consultation_notes" ("appointment_id");
CREATE INDEX IF NOT EXISTS "consultation_notes_patient_idx" ON "consultation_notes" ("patient_id");
CREATE INDEX IF NOT EXISTS "consultation_notes_doctor_idx" ON "consultation_notes" ("doctor_id");
