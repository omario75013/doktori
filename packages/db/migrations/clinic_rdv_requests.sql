-- Patient-initiated appointment requests sent to a clinic when the patient
-- doesn't pick a specific doctor (clinic admin chooses + schedules).
CREATE TABLE IF NOT EXISTS clinic_rdv_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Patient identity (logged-in patient OR anonymous walk-up)
  patient_id           uuid REFERENCES patients(id) ON DELETE SET NULL,
  patient_name         varchar(255) NOT NULL,
  patient_phone        varchar(30)  NOT NULL,
  patient_email        varchar(255),
  patient_cin          varchar(30),

  -- Request details
  motif                text,
  specialty_hint       varchar(100),               -- optional specialty hint
  preferred_date       date NOT NULL,
  preferred_time_range varchar(20) NOT NULL,       -- 'morning' | 'afternoon' | 'evening' | 'any'
  notes                text,

  -- Workflow
  status               varchar(20) NOT NULL DEFAULT 'pending',
                       -- 'pending' | 'assigned' | 'fulfilled' | 'cancelled'
  assigned_doctor_id   uuid REFERENCES doctors(id) ON DELETE SET NULL,
  assigned_appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  assigned_at          timestamptz,
  assigned_by_user_id  uuid,                       -- clinic admin id (no FK; polymorphic)
  cancelled_reason     text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clinic_rdv_requests_status_check
    CHECK (status IN ('pending','assigned','fulfilled','cancelled')),
  CONSTRAINT clinic_rdv_requests_time_range_check
    CHECK (preferred_time_range IN ('morning','afternoon','evening','any'))
);

CREATE INDEX IF NOT EXISTS clinic_rdv_requests_clinic_idx
  ON clinic_rdv_requests (clinic_id, status, preferred_date);
CREATE INDEX IF NOT EXISTS clinic_rdv_requests_patient_idx
  ON clinic_rdv_requests (patient_id);
