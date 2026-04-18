-- Add clinic_id to secretaries table so a secretary can be associated
-- with an entire clinic (and thereby manage all doctors in that clinic)
ALTER TABLE secretaries ADD COLUMN clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL;
CREATE INDEX secretaries_clinic_idx ON secretaries(clinic_id);
