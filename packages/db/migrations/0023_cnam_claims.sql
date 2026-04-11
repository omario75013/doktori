-- G9: CNAM tiers-payant billing
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cnam_number" varchar(20);

CREATE TABLE IF NOT EXISTS "cnam_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "cnam_number" varchar(20) NOT NULL,
  "patient_role" varchar(20) DEFAULT 'assure' NOT NULL, -- assure | ayant_droit
  "amount" integer NOT NULL, -- millimes
  "consultation_date" date NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL, -- draft | submitted | reimbursed | rejected
  "submitted_at" timestamp with time zone,
  "reimbursed_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "cnam_claims" ADD CONSTRAINT "cnam_claims_appointment_id_fk"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cnam_claims" ADD CONSTRAINT "cnam_claims_doctor_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cnam_claims" ADD CONSTRAINT "cnam_claims_patient_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "cnam_claims_appointment_uidx" ON "cnam_claims" ("appointment_id");
CREATE INDEX IF NOT EXISTS "cnam_claims_doctor_month_idx" ON "cnam_claims" ("doctor_id", "consultation_date");
CREATE INDEX IF NOT EXISTS "cnam_claims_status_idx" ON "cnam_claims" ("status");
