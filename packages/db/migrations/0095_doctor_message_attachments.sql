-- Peer-doctor chat: image attachments + soft edit / soft delete.
ALTER TABLE "doctor_messages"
  ADD COLUMN IF NOT EXISTS "image_url" text,
  ADD COLUMN IF NOT EXISTS "image_mime_type" varchar(60),
  ADD COLUMN IF NOT EXISTS "edited_at" timestamp,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
