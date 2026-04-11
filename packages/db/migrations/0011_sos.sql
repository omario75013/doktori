-- Enable PostGIS (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geospatial + SOS columns to doctors
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "location" GEOGRAPHY(POINT, 4326);
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "sos_available" BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "sos_radius_km" INTEGER DEFAULT 10 NOT NULL;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "sos_fee" INTEGER; -- in millimes

-- Spatial index for fast "nearest" queries
CREATE INDEX IF NOT EXISTS "doctors_location_idx" ON "doctors" USING GIST("location");
CREATE INDEX IF NOT EXISTS "doctors_sos_available_idx" ON "doctors" ("sos_available") WHERE "sos_available" = true;

-- SOS sessions table
CREATE TABLE IF NOT EXISTS "sos_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL,
  "patient_lat" DOUBLE PRECISION NOT NULL,
  "patient_lng" DOUBLE PRECISION NOT NULL,
  "patient_location" GEOGRAPHY(POINT, 4326) NOT NULL,
  "symptom_category" varchar(50),
  "description" text,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "doctor_id" uuid,
  "fee" integer,
  "commission" integer,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "accepted_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "sos_sessions" ADD CONSTRAINT "sos_sessions_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "sos_sessions" ADD CONSTRAINT "sos_sessions_doctor_id_doctors_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "sos_sessions_status_idx" ON "sos_sessions" ("status");
CREATE INDEX IF NOT EXISTS "sos_sessions_patient_idx" ON "sos_sessions" ("patient_id");
CREATE INDEX IF NOT EXISTS "sos_sessions_patient_location_idx" ON "sos_sessions" USING GIST("patient_location");
