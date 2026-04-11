-- G12: Patient review moderation
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'pending' NOT NULL;

-- Legacy reviews stay visible: anything older than this migration is treated as published
UPDATE "reviews" SET "status" = 'published' WHERE "status" = 'pending' AND "created_at" < now();

CREATE INDEX IF NOT EXISTS "reviews_status_idx" ON "reviews" ("status");
