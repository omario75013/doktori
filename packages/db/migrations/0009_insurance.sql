CREATE TABLE IF NOT EXISTS "doctor_insurance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "insurance_type" varchar(50) NOT NULL,
  "is_conventioned" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "doctor_insurance" ADD CONSTRAINT "doctor_insurance_doctor_id_doctors_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "doctor_insurance_unique_idx" ON "doctor_insurance" ("doctor_id", "insurance_type");
CREATE INDEX IF NOT EXISTS "doctor_insurance_type_idx" ON "doctor_insurance" ("insurance_type");
