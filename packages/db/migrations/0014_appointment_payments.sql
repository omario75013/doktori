ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "payment_status" varchar(20) DEFAULT 'unpaid' NOT NULL;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "payment_amount" integer; -- in millimes
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "payment_ref" varchar(255);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "payment_provider" varchar(20);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "appointments_payment_status_idx" ON "appointments" ("payment_status");
