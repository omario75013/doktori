-- G6: Patient medical record (minimal)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "date_of_birth" date;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "gender" varchar(10);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "blood_type" varchar(5);

CREATE TABLE IF NOT EXISTS "patient_medical_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "allergies" text,
  "chronic_conditions" text,
  "current_meds" text,
  "notes" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "patient_medical_profile" ADD CONSTRAINT "patient_medical_profile_patient_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "patient_medical_profile_patient_uidx" ON "patient_medical_profile" ("patient_id");
