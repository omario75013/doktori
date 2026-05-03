-- 0067_prescription_templates — Templates de notes/ordonnances avec variables
-- Idempotent. Soft-delete pattern. Officiels (doctor_id NULL) vs persos (doctor_id NOT NULL).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS prescription_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       uuid REFERENCES doctors(id) ON DELETE SET NULL,
  title           varchar(120) NOT NULL,
  description     text,
  language        char(2) NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'ar')),
  slug            varchar(60),
  body_markdown   text NOT NULL,
  target_type     varchar(20) NOT NULL DEFAULT 'prescription',
  is_official     boolean NOT NULL DEFAULT false,
  cloned_from_id  uuid REFERENCES prescription_templates(id) ON DELETE SET NULL,
  apply_count     integer NOT NULL DEFAULT 0,
  clone_count     integer NOT NULL DEFAULT 0,
  last_used_at    timestamptz,
  version         integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT templates_ownership CHECK (
    (is_official = true AND doctor_id IS NULL)
    OR (is_official = false AND doctor_id IS NOT NULL)
    OR (is_official = false AND doctor_id IS NULL AND deleted_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS prescription_templates_doctor_idx
  ON prescription_templates(doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS prescription_templates_official_idx
  ON prescription_templates(is_official, language) WHERE deleted_at IS NULL AND is_official = true;
CREATE INDEX IF NOT EXISTS prescription_templates_target_idx
  ON prescription_templates(target_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS prescription_templates_title_trgm
  ON prescription_templates USING gin (title gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS prescription_templates_official_slug_uidx
  ON prescription_templates(slug) WHERE is_official = true AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION soft_delete_doctor_templates() RETURNS trigger AS $$
BEGIN
  UPDATE prescription_templates
    SET deleted_at = now(), updated_at = now()
    WHERE doctor_id = OLD.id AND deleted_at IS NULL;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS doctors_before_delete_templates ON doctors;
CREATE TRIGGER doctors_before_delete_templates
  BEFORE DELETE ON doctors
  FOR EACH ROW EXECUTE FUNCTION soft_delete_doctor_templates();

CREATE OR REPLACE FUNCTION bump_template_version() RETURNS trigger AS $$
BEGIN
  IF NEW.body_markdown IS DISTINCT FROM OLD.body_markdown
     OR NEW.title IS DISTINCT FROM OLD.title THEN
    NEW.version = OLD.version + 1;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prescription_templates_bump_version ON prescription_templates;
CREATE TRIGGER prescription_templates_bump_version
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW EXECUTE FUNCTION bump_template_version();
