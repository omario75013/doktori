-- G1: Track patient confirmation/cancellation from SMS reminder link
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp with time zone;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
