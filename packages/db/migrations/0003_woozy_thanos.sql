CREATE TABLE "clinic_invitations" (
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
--> statement-breakpoint
CREATE TABLE "clinic_notes" (
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
--> statement-breakpoint
CREATE TABLE "doctor_waiting_room" (
	"doctor_id" uuid PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_type" varchar(16),
	"updated_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
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
--> statement-breakpoint
CREATE TABLE "labs" (
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
--> statement-breakpoint
CREATE TABLE "medical_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid,
	"doctor_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"verification_token" varchar(64),
	"template_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doctor_messages" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "doctor_messages" ADD COLUMN "image_mime_type" varchar(60);--> statement-breakpoint
ALTER TABLE "doctor_messages" ADD COLUMN "edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "doctor_messages" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "patient_cancel_window_hours" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "signature_url" text;--> statement-breakpoint
ALTER TABLE "patient_attachments" ADD COLUMN "shared_with_doctor_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_documents" ADD COLUMN "uploaded_by_lab_id" uuid;--> statement-breakpoint
ALTER TABLE "patient_documents" ADD COLUMN "lab_order_id" uuid;--> statement-breakpoint
ALTER TABLE "clinic_invitations" ADD CONSTRAINT "clinic_invitations_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_invitations" ADD CONSTRAINT "clinic_invitations_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_notes" ADD CONSTRAINT "clinic_notes_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_waiting_room" ADD CONSTRAINT "doctor_waiting_room_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_completed_by_lab_id_labs_id_fk" FOREIGN KEY ("completed_by_lab_id") REFERENCES "public"."labs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_template_id_prescription_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prescription_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinic_invitations_doctor_idx" ON "clinic_invitations" USING btree ("doctor_id","status");--> statement-breakpoint
CREATE INDEX "clinic_invitations_clinic_idx" ON "clinic_invitations" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "clinic_notes_clinic_idx" ON "clinic_notes" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "lab_orders_doctor_idx" ON "lab_orders" USING btree ("doctor_id","status");--> statement-breakpoint
CREATE INDEX "lab_orders_patient_idx" ON "lab_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "lab_orders_lab_idx" ON "lab_orders" USING btree ("lab_id","status");--> statement-breakpoint
CREATE INDEX "labs_city_idx" ON "labs" USING btree ("city");--> statement-breakpoint
CREATE INDEX "labs_verification_idx" ON "labs" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "medical_certificates_appointment_idx" ON "medical_certificates" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "medical_certificates_patient_idx" ON "medical_certificates" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "medical_certificates_doctor_idx" ON "medical_certificates" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "medical_certificates_verification_token_idx" ON "medical_certificates" USING btree ("verification_token");--> statement-breakpoint
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_uploaded_by_lab_id_labs_id_fk" FOREIGN KEY ("uploaded_by_lab_id") REFERENCES "public"."labs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("lab_order_id") REFERENCES "public"."lab_orders"("id") ON DELETE set null ON UPDATE no action;