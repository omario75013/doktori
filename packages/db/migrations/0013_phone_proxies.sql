CREATE TABLE IF NOT EXISTS "phone_proxies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sos_session_id" uuid,
  "proxy_number" varchar(30) NOT NULL,
  "patient_phone" varchar(30) NOT NULL,
  "doctor_phone" varchar(30) NOT NULL,
  "twilio_proxy_service_sid" varchar(100),
  "twilio_session_sid" varchar(100),
  "expires_at" timestamp with time zone NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "phone_proxies" ADD CONSTRAINT "phone_proxies_sos_session_id_sos_sessions_id_fk"
  FOREIGN KEY ("sos_session_id") REFERENCES "sos_sessions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "phone_proxies_session_idx" ON "phone_proxies" ("sos_session_id");
CREATE INDEX IF NOT EXISTS "phone_proxies_active_idx" ON "phone_proxies" ("is_active");
