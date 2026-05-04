-- 0079_phase1_polish — Stream D: Doctor onboarding tour + benchmark cache
-- Idempotent ADD-ONLY.

-- Track doctor onboarding tour completion
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS onboarding_tour_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_tour_skipped boolean NOT NULL DEFAULT false;

-- Benchmark snapshots (precomputed for performance)
CREATE TABLE IF NOT EXISTS doctor_benchmark_snapshots (
  doctor_id       uuid PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
  specialty       varchar(100),
  city            varchar(100),
  no_show_rate    numeric(5,2),
  no_show_rank_specialty integer,  -- e.g. 3rd of 12 in your specialty
  no_show_total_specialty integer,
  avg_rating      numeric(3,2),
  rating_rank_specialty integer,
  total_appointments_30d integer,
  appointments_rank_specialty integer,
  computed_at     timestamptz NOT NULL DEFAULT now()
);
