-- E2E seed: test doctor + patient + appointments for templates E2E tests.
-- Idempotent — safe to run multiple times (ON CONFLICT DO NOTHING everywhere).
--
-- Credentials:
--   Doctor  email:    doctor@test.doktori.tn
--   Doctor  password: TestDoctor123!
--   Doctor  slug:     e2e-test-doctor
--
-- Run:
--   psql $DATABASE_URL -f apps/web/e2e/seed-test-doctor.sql
-- or via pnpm:
--   pnpm --filter web e2e:seed

-- ── Test doctor ────────────────────────────────────────────────────────────────
-- Uses only columns present in both dev and prod schemas.
-- Columns added in later migrations (is_visible, email_verified, etc.) are
-- intentionally omitted so the seed works against the dev DB as-is.
INSERT INTO doctors (
  id, name, slug, email, password_hash,
  phone, specialty, city, address,
  consultation_mode, is_active
)
VALUES (
  '00000000-e2e0-0000-0000-000000000001',
  'Dr. E2E Test',
  'e2e-test-doctor',
  'doctor@test.doktori.tn',
  -- bcrypt hash of "TestDoctor123!" (cost 10, generated offline)
  '$2a$10$9vDZr.5.2T4k1ry16YdN6ervfgN8eC1hbwDgYkW098SrvSHMtLwU.',
  '+21600000000',
  'generaliste',
  'Tunis',
  '1 Rue E2E, Tunis',
  'cabinet',
  true
)
ON CONFLICT (id)    DO NOTHING;

-- Separate upsert to handle unique email conflict separately from id conflict
INSERT INTO doctors (
  id, name, slug, email, password_hash,
  phone, specialty, city, address,
  consultation_mode, is_active
)
VALUES (
  '00000000-e2e0-0000-0000-000000000001',
  'Dr. E2E Test',
  'e2e-test-doctor',
  'doctor@test.doktori.tn',
  '$2a$10$9vDZr.5.2T4k1ry16YdN6ervfgN8eC1hbwDgYkW098SrvSHMtLwU.',
  '+21600000000',
  'generaliste',
  'Tunis',
  '1 Rue E2E, Tunis',
  'cabinet',
  true
)
ON CONFLICT (email) DO NOTHING;

-- ── Test patient ───────────────────────────────────────────────────────────────
INSERT INTO patients (id, name, phone, email)
VALUES (
  '00000000-e2e0-0000-0000-000000000002',
  'Patient E2E Test',
  '+21699000000',
  'patient@test.doktori.tn'
)
ON CONFLICT (id) DO NOTHING;

-- ── Past completed appointments (needed to access prescriptions tab) ───────────
INSERT INTO appointments (
  id, doctor_id, patient_id,
  starts_at, ends_at,
  status, type
)
VALUES
  (
    '00000000-e2e0-0000-0001-000000000001',
    '00000000-e2e0-0000-0000-000000000001',
    '00000000-e2e0-0000-0000-000000000002',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days' + INTERVAL '30 minutes',
    'completed',
    'cabinet'
  ),
  (
    '00000000-e2e0-0000-0001-000000000002',
    '00000000-e2e0-0000-0000-000000000001',
    '00000000-e2e0-0000-0000-000000000002',
    NOW() - INTERVAL '14 days',
    NOW() - INTERVAL '14 days' + INTERVAL '30 minutes',
    'completed',
    'cabinet'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Future pending appointment (booking flow tests) ───────────────────────────
INSERT INTO appointments (
  id, doctor_id, patient_id,
  starts_at, ends_at,
  status, type
)
VALUES (
  '00000000-e2e0-0000-0001-000000000003',
  '00000000-e2e0-0000-0000-000000000001',
  '00000000-e2e0-0000-0000-000000000002',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days' + INTERVAL '30 minutes',
  'pending',
  'cabinet'
)
ON CONFLICT (id) DO NOTHING;

-- ── Feature flag: ensure templates are enabled ─────────────────────────────────
INSERT INTO feature_flags (key, enabled, description)
VALUES (
  'prescription_templates_enabled',
  true,
  'Enables prescription templates feature for all doctors'
)
ON CONFLICT (key) DO UPDATE SET enabled = true;
