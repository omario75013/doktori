-- 0087_catalog_extensions.sql — Wave 10 (Gap 4) — catalog extensions.
-- Adds: insurance_providers, catalog_motifs, meilisearch_synonyms.
-- Idempotent: safe to re-apply.

-- ── Insurance providers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_providers (
  id           VARCHAR(50)  PRIMARY KEY,
  label        VARCHAR(100) NOT NULL,
  label_ar     VARCHAR(100),
  type         VARCHAR(20)  NOT NULL,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed common Tunisia insurance providers (no-op if rows already there)
INSERT INTO insurance_providers (id, label, label_ar, type, sort_order)
VALUES
  ('cnam',       'CNAM',                 'الكنام',             'public',  10),
  ('cnrps',      'CNRPS',                'الكنرباس',           'public',  20),
  ('star',       'STAR Assurance',       'ستار للتأمين',       'private', 30),
  ('gat',        'GAT Assurances',       'قات للتأمين',        'private', 40),
  ('carte',      'CARTE Assurances',     'كارت للتأمين',       'private', 50),
  ('maghrebia',  'Maghrebia Assurances', 'المغاربية للتأمين',  'private', 60),
  ('comar',      'COMAR Assurances',     'كومار للتأمين',      'private', 70),
  ('lloyd',      'Lloyd Tunisien',       'لويد التونسي',       'private', 80)
ON CONFLICT (id) DO NOTHING;

-- ── Global motif templates ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog_motifs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  name_ar           VARCHAR(255),
  specialty_id      VARCHAR(50)  REFERENCES catalog_specialties(id),
  duration_minutes  INTEGER      NOT NULL DEFAULT 30,
  suggested_fee     INTEGER,
  category          VARCHAR(30)  NOT NULL DEFAULT 'consultation',
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS catalog_motifs_specialty_idx ON catalog_motifs (specialty_id);
CREATE INDEX IF NOT EXISTS catalog_motifs_active_idx    ON catalog_motifs (is_active);

-- ── Meilisearch synonyms editor ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meilisearch_synonyms (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  term        VARCHAR(100) NOT NULL UNIQUE,
  synonyms    JSONB        NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
