-- Bulk SMS campaign log. Idempotent.

CREATE TABLE IF NOT EXISTS "bulk_sms_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
  "message" text NOT NULL,
  "recipient_count" integer NOT NULL DEFAULT 0,
  "sent_count" integer NOT NULL DEFAULT 0,
  "failed_count" integer NOT NULL DEFAULT 0,
  "filter" jsonb,
  "created_by_clinic_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "bulk_sms_campaigns_clinic_idx"
  ON "bulk_sms_campaigns" ("clinic_id", "created_at");
