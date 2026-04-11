CREATE TABLE IF NOT EXISTS "doctor_premium" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL UNIQUE,
  "is_active" boolean DEFAULT false NOT NULL,
  "until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "doctor_premium" ADD CONSTRAINT "doctor_premium_doctor_id_doctors_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
