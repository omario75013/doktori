-- Clinic v2 tables: sites, rooms, audit log, opt-out, appointments.clinic_room_id.
-- Idempotent.

CREATE TABLE IF NOT EXISTS "clinic_sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "address" text NOT NULL,
  "city" varchar(50) NOT NULL,
  "phone" varchar(20),
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "clinic_rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "site_id" uuid NOT NULL,
  "name" varchar(50) NOT NULL,
  "color" varchar(20) DEFAULT '#2563eb' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "patient_communication_optout" (
  "patient_id" uuid PRIMARY KEY,
  "opted_out_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reason" varchar(100)
);

CREATE TABLE IF NOT EXISTS "clinic_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL,
  "actor_type" varchar(16) NOT NULL,
  "actor_id" uuid,
  "action" varchar(64) NOT NULL,
  "target_type" varchar(32),
  "target_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- appointments.clinic_room_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointments' AND column_name='clinic_room_id'
  ) THEN
    ALTER TABLE "appointments" ADD COLUMN "clinic_room_id" uuid;
  END IF;
END $$;

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='clinic_sites_clinic_id_clinics_id_fk') THEN
    ALTER TABLE "clinic_sites" ADD CONSTRAINT "clinic_sites_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='clinic_rooms_site_id_clinic_sites_id_fk') THEN
    ALTER TABLE "clinic_rooms" ADD CONSTRAINT "clinic_rooms_site_id_clinic_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."clinic_sites"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='patient_communication_optout_patient_id_patients_id_fk') THEN
    ALTER TABLE "patient_communication_optout" ADD CONSTRAINT "patient_communication_optout_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='clinic_audit_log_clinic_id_clinics_id_fk') THEN
    ALTER TABLE "clinic_audit_log" ADD CONSTRAINT "clinic_audit_log_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='appointments_clinic_room_id_clinic_rooms_id_fk') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_room_id_clinic_rooms_id_fk" FOREIGN KEY ("clinic_room_id") REFERENCES "public"."clinic_rooms"("id") ON DELETE set null;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "clinic_sites_clinic_idx" ON "clinic_sites" ("clinic_id");
CREATE INDEX IF NOT EXISTS "clinic_rooms_site_idx" ON "clinic_rooms" ("site_id");
CREATE INDEX IF NOT EXISTS "clinic_audit_clinic_idx" ON "clinic_audit_log" ("clinic_id", "created_at");
CREATE INDEX IF NOT EXISTS "clinic_audit_action_idx" ON "clinic_audit_log" ("clinic_id", "action");
