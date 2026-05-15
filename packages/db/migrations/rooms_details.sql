-- rooms_details.sql — Add capacity, floor, equipment, status, last_cleaned_at to clinic_rooms
-- Idempotent: uses DO $$ ... EXCEPTION WHEN duplicate_column THEN NULL END $$

DO $$
BEGIN
  BEGIN
    ALTER TABLE clinic_rooms ADD COLUMN capacity integer NOT NULL DEFAULT 1;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE clinic_rooms ADD COLUMN floor varchar(30);
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE clinic_rooms ADD COLUMN equipment_notes text;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE clinic_rooms ADD COLUMN status varchar(20) NOT NULL DEFAULT 'active';
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  BEGIN
    ALTER TABLE clinic_rooms ADD COLUMN last_cleaned_at timestamptz;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;
