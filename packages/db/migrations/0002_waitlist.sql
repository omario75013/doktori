CREATE TABLE IF NOT EXISTS "waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "preferred_date" varchar(10) NOT NULL,
  "notified_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_doctor_id_doctors_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "waitlist_doctor_date_idx" ON "waitlist" ("doctor_id", "preferred_date");
CREATE INDEX IF NOT EXISTS "waitlist_patient_idx" ON "waitlist" ("patient_id");
