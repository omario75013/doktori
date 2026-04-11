-- G3: Pre-appointment questionnaire + document upload
-- appointment_type_questions: doctor defines per-type questions
-- appointment_answers: patient answers stored alongside booking

CREATE TABLE IF NOT EXISTS "appointment_type_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appointment_type_id" uuid NOT NULL,
  "label" varchar(500) NOT NULL,
  "kind" varchar(20) NOT NULL,
  "choices" jsonb,
  "required" boolean NOT NULL DEFAULT false,
  "display_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "appointment_type_questions"
    ADD CONSTRAINT "appointment_type_questions_appointment_type_id_fk"
    FOREIGN KEY ("appointment_type_id")
    REFERENCES "appointment_types"("id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "atq_type_order_idx" ON "appointment_type_questions" ("appointment_type_id", "display_order");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "appointment_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "value" text,
  "file_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "appointment_answers"
    ADD CONSTRAINT "appointment_answers_appointment_id_fk"
    FOREIGN KEY ("appointment_id")
    REFERENCES "appointments"("id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "appointment_answers"
    ADD CONSTRAINT "appointment_answers_question_id_fk"
    FOREIGN KEY ("question_id")
    REFERENCES "appointment_type_questions"("id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX "appointment_answers_unique_idx" ON "appointment_answers" ("appointment_id", "question_id");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
