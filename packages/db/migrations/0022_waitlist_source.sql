-- G11: distinguish patient-initiated waitlist entries from doctor-scheduled follow-ups
ALTER TABLE "waitlist" ADD COLUMN IF NOT EXISTS "source" varchar(20) DEFAULT 'patient' NOT NULL;
ALTER TABLE "waitlist" ADD COLUMN IF NOT EXISTS "appointment_id" uuid;

DO $$ BEGIN
  ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_appointment_id_fk"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "waitlist_source_date_idx" ON "waitlist" ("source", "preferred_date");
