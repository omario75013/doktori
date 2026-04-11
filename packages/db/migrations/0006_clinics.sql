CREATE TABLE IF NOT EXISTS "clinics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "address" text NOT NULL,
  "city" varchar(50) NOT NULL,
  "phone" varchar(20) NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "logo_url" text,
  "plan" varchar(20) NOT NULL DEFAULT 'free',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "clinic_doctors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "role" varchar(20) NOT NULL DEFAULT 'member',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "clinic_doctors" ADD CONSTRAINT "clinic_doctors_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "clinic_doctors" ADD CONSTRAINT "clinic_doctors_doctor_id_doctors_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "clinic_doctors_unique_idx" ON "clinic_doctors" ("clinic_id", "doctor_id");
CREATE INDEX IF NOT EXISTS "clinic_doctors_clinic_idx" ON "clinic_doctors" ("clinic_id");
