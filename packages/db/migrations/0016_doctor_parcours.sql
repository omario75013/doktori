ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "educations" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "experiences" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "languages" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "expertise" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "years_of_experience" integer;
