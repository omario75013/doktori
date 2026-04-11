CREATE TABLE IF NOT EXISTS "doctor_home_visit_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL UNIQUE,
  "is_available" boolean DEFAULT false NOT NULL,
  "radius_km" integer DEFAULT 5 NOT NULL,
  "fee" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "doctor_home_visit_settings" ADD CONSTRAINT "doctor_home_visit_settings_doctor_id_doctors_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
