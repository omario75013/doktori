CREATE TABLE IF NOT EXISTS "teleconsultations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid NOT NULL UNIQUE,
  "room_name" varchar(100) NOT NULL UNIQUE,
  "started_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "duration_seconds" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "teleconsultations" ADD CONSTRAINT "teleconsultations_appointment_id_appointments_id_fk"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
