CREATE TABLE IF NOT EXISTS "appointment_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "duration_minutes" integer NOT NULL,
  "fee" integer,
  "color" varchar(20) DEFAULT '#2563eb' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "appointment_types" ADD CONSTRAINT "appointment_types_doctor_id_doctors_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "appointment_types_doctor_idx" ON "appointment_types" ("doctor_id");
