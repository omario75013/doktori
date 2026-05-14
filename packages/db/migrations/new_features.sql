-- New clinic + lab feature tables. Idempotent: skips if exists.

CREATE TABLE IF NOT EXISTS "clinic_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"doctor_id" uuid,
	"email" varchar(255),
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinic_invitations_token_unique" UNIQUE("token")
);

CREATE TABLE IF NOT EXISTS "clinic_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"author_type" varchar(10) DEFAULT 'clinic' NOT NULL,
	"author_id" uuid,
	"title" varchar(255),
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "labs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(50) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"logo_url" text,
	"plan" varchar(20) DEFAULT 'free' NOT NULL,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"accreditations" text[] DEFAULT '{}'::text[] NOT NULL,
	"opening_hours" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "labs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "labs_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"lab_id" uuid,
	"tests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"instructions" text,
	"urgency" varchar(10) DEFAULT 'routine' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"access_token" varchar(64) NOT NULL,
	"completed_by_lab_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_orders_access_token_unique" UNIQUE("access_token")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='patient_documents' AND column_name='uploaded_by_lab_id'
  ) THEN
    ALTER TABLE "patient_documents" ADD COLUMN "uploaded_by_lab_id" uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='patient_documents' AND column_name='lab_order_id'
  ) THEN
    ALTER TABLE "patient_documents" ADD COLUMN "lab_order_id" uuid;
  END IF;
END $$;

-- Foreign keys (drop-if-exists pattern then add)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_invitations_clinic_id_clinics_id_fk') THEN
    ALTER TABLE "clinic_invitations" ADD CONSTRAINT "clinic_invitations_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_invitations_doctor_id_doctors_id_fk') THEN
    ALTER TABLE "clinic_invitations" ADD CONSTRAINT "clinic_invitations_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinic_notes_clinic_id_clinics_id_fk') THEN
    ALTER TABLE "clinic_notes" ADD CONSTRAINT "clinic_notes_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_orders_doctor_id_doctors_id_fk') THEN
    ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_orders_patient_id_patients_id_fk') THEN
    ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_orders_lab_id_labs_id_fk') THEN
    ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE set null;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_orders_completed_by_lab_id_labs_id_fk') THEN
    ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_completed_by_lab_id_labs_id_fk" FOREIGN KEY ("completed_by_lab_id") REFERENCES "public"."labs"("id") ON DELETE set null;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_documents_uploaded_by_lab_id_labs_id_fk') THEN
    ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_uploaded_by_lab_id_labs_id_fk" FOREIGN KEY ("uploaded_by_lab_id") REFERENCES "public"."labs"("id") ON DELETE set null;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_documents_lab_order_id_lab_orders_id_fk') THEN
    ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("lab_order_id") REFERENCES "public"."lab_orders"("id") ON DELETE set null;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "clinic_invitations_doctor_idx" ON "clinic_invitations" ("doctor_id","status");
CREATE INDEX IF NOT EXISTS "clinic_invitations_clinic_idx" ON "clinic_invitations" ("clinic_id","status");
CREATE INDEX IF NOT EXISTS "clinic_notes_clinic_idx" ON "clinic_notes" ("clinic_id");
CREATE INDEX IF NOT EXISTS "lab_orders_doctor_idx" ON "lab_orders" ("doctor_id","status");
CREATE INDEX IF NOT EXISTS "lab_orders_patient_idx" ON "lab_orders" ("patient_id");
CREATE INDEX IF NOT EXISTS "lab_orders_lab_idx" ON "lab_orders" ("lab_id","status");
CREATE INDEX IF NOT EXISTS "labs_city_idx" ON "labs" ("city");
CREATE INDEX IF NOT EXISTS "labs_verification_idx" ON "labs" ("verification_status");
