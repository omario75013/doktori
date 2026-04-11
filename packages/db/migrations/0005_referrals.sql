CREATE TABLE IF NOT EXISTS "doctor_referral_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "doctor_id" uuid NOT NULL UNIQUE,
  "code" varchar(20) NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "referrer_id" uuid NOT NULL,
  "referred_id" uuid NOT NULL UNIQUE,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "validated_at" timestamp with time zone
);

DO $$ BEGIN
  ALTER TABLE "doctor_referral_codes" ADD CONSTRAINT "doctor_referral_codes_doctor_id_doctors_id_fk"
  FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_doctors_id_fk"
  FOREIGN KEY ("referrer_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_doctors_id_fk"
  FOREIGN KEY ("referred_id") REFERENCES "doctors"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "referrals_referrer_idx" ON "referrals" ("referrer_id");
