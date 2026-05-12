-- Doctor signature image, used to replace the "Signature et cachet"
-- placeholder on prescriptions and other generated PDFs.

ALTER TABLE "doctors"
  ADD COLUMN IF NOT EXISTS "signature_url" text;
