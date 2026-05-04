-- Allow prescriptions without an appointment ("ordonnance sans rendez-vous")
ALTER TABLE prescriptions ALTER COLUMN appointment_id DROP NOT NULL;
