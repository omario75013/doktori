CREATE TABLE IF NOT EXISTS catalog_specialties (
  id varchar(50) PRIMARY KEY,
  label varchar(100) NOT NULL,
  label_ar varchar(100),
  icon varchar(50),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_cities (
  id varchar(50) PRIMARY KEY,
  label varchar(100) NOT NULL,
  label_ar varchar(100),
  latitude varchar(30),
  longitude varchar(30),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed specialties from shared constants
INSERT INTO catalog_specialties (id, label, label_ar, display_order) VALUES
  ('generaliste',   'Médecin Généraliste',   'طبيب عام',           0),
  ('dermatologue',  'Dermatologue',           'طبيب جلد',           1),
  ('ophtalmologue', 'Ophtalmologue',          'طبيب عيون',          2),
  ('gynecologue',   'Gynécologue',            'طبيب نساء',          3),
  ('pediatre',      'Pédiatre',               'طبيب أطفال',         4),
  ('dentiste',      'Dentiste',               'طبيب أسنان',         5),
  ('orl',           'ORL',                    'طبيب أنف وأذن',      6),
  ('cardiologue',   'Cardiologue',            'طبيب قلب',           7),
  ('orthopediste',  'Orthopédiste',           'طبيب عظام',          8),
  ('gastrologue',   'Gastro-entérologue',     'طبيب جهاز هضمي',     9)
ON CONFLICT (id) DO NOTHING;

-- Seed cities from shared constants
INSERT INTO catalog_cities (id, label, display_order) VALUES
  ('tunis',     'Tunis',     0),
  ('la-marsa',  'La Marsa',  1),
  ('lac-1',     'Lac 1',     2),
  ('lac-2',     'Lac 2',     3),
  ('ariana',    'Ariana',    4),
  ('la-soukra', 'La Soukra', 5),
  ('raoued',    'Raoued',    6),
  ('manouba',   'Manouba',   7)
ON CONFLICT (id) DO NOTHING;
