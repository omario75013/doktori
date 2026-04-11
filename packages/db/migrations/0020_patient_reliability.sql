-- G7: No-show tracking
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "no_show_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "last_minute_cancel_count" integer DEFAULT 0 NOT NULL;
