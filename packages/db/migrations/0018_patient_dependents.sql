-- G2: Family / dependent accounts
CREATE TABLE IF NOT EXISTS "patient_dependents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "date_of_birth" date,
  "gender" varchar(10),
  "relation" varchar(30),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "patient_dependents" ADD CONSTRAINT "patient_dependents_patient_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "patient_dependents_patient_idx" ON "patient_dependents" ("patient_id");

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "dependent_id" uuid;

DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dependent_id_fk"
  FOREIGN KEY ("dependent_id") REFERENCES "patient_dependents"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "appointments_dependent_idx" ON "appointments" ("dependent_id");
