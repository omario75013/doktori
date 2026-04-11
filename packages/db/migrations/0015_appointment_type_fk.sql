-- Link appointments to an optional appointment_type (nullable so existing rows are untouched)
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "appointment_type_id" uuid;

DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointment_type_id_fk"
  FOREIGN KEY ("appointment_type_id") REFERENCES "appointment_types"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "appointments_type_idx" ON "appointments" ("appointment_type_id");
