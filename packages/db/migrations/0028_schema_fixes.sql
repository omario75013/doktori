-- Missing indexes
CREATE INDEX IF NOT EXISTS doctor_schedules_doctor_day_idx ON doctor_schedules(doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS appointments_appointment_type_idx ON appointments(appointment_type_id);

-- Missing FK constraints (only if columns exist and don't already have FKs)
-- Use DO blocks to check before adding
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'appointments_appointment_type_id_fkey') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_appointment_type_id_fkey
      FOREIGN KEY (appointment_type_id) REFERENCES appointment_types(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'appointments_dependent_id_fkey') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_dependent_id_fkey
      FOREIGN KEY (dependent_id) REFERENCES patient_dependents(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'appointments_practice_id_fkey') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_practice_id_fkey
      FOREIGN KEY (practice_id) REFERENCES doctor_practices(id) ON DELETE SET NULL;
  END IF;
END $$;
