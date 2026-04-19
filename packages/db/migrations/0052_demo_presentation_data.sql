-- =============================================================================
-- 0052_demo_presentation_data.sql
-- Demo seed: realistic test data for presenting all Doktori features.
--
-- Password for ALL accounts: Demo2026!
-- Bcrypt hash ($2a$12$, cost 12, generated with bcryptjs):
--   $2a$12$RMnGqrFtvydqUFu03T7m7elQOEbi7x4SClnOPLccz6zHKvOAdpshC
--
-- All inserts are idempotent (ON CONFLICT DO NOTHING).
-- Fixed UUIDs make the data predictable and re-runnable.
-- =============================================================================

-- ─── Helper: one reusable password hash ──────────────────────────────────────
-- Password: Demo2026!
-- $2a$12$RMnGqrFtvydqUFu03T7m7elQOEbi7x4SClnOPLccz6zHKvOAdpshC

-- =============================================================================
-- 1. CLINIC
-- =============================================================================

INSERT INTO clinics (id, name, slug, address, city, phone, email, password_hash, logo_url, plan)
VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'Clinique El Manar',
  'clinique-el-manar-tunis',
  '15 Avenue de la Liberté, El Manar',
  'tunis',
  '+21671234567',
  'contact@clinique-elmanar.tn',
  '$2a$12$RMnGqrFtvydqUFu03T7m7elQOEbi7x4SClnOPLccz6zHKvOAdpshC',
  NULL,
  'clinique'
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 2. DOCTORS (clinic members)
-- =============================================================================

-- Dr. Sami Bouaziz — Médecin Généraliste
INSERT INTO doctors (
  id, name, slug, email, password_hash, phone,
  specialty, city, address,
  bio, languages, expertise, years_of_experience,
  consultation_fee, teleconsult_fee,
  consultation_mode,
  is_active, is_visible, verification_status, verified_at,
  email_verified, email_verified_at,
  average_rating, review_count
)
VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'Dr. Sami Bouaziz',
  'dr-sami-bouaziz',
  'sami.bouaziz@doktori.tn',
  '$2a$12$RMnGqrFtvydqUFu03T7m7elQOEbi7x4SClnOPLccz6zHKvOAdpshC',
  '+21698100001',
  'Médecin Généraliste',
  'tunis',
  '15 Avenue de la Liberté, El Manar, Tunis',
  'Médecin généraliste avec plus de 12 ans d''expérience, spécialisé dans la médecine préventive et la prise en charge des maladies chroniques. Dr. Bouaziz est reconnu pour son écoute attentive et son approche globale du patient.',
  '["Arabe", "Français", "Anglais"]',
  '["Médecine préventive", "Maladies chroniques", "Diabète", "Hypertension"]',
  12,
  50000,
  60000,
  'both',
  true, true, 'approved', NOW() - INTERVAL '30 days',
  true, NOW() - INTERVAL '35 days',
  4.7, 23
)
ON CONFLICT (email) DO NOTHING;

-- Dr. Leila Khelifi — Dermatologue
INSERT INTO doctors (
  id, name, slug, email, password_hash, phone,
  specialty, city, address,
  bio, languages, expertise, years_of_experience,
  consultation_fee, teleconsult_fee,
  consultation_mode,
  is_active, is_visible, verification_status, verified_at,
  email_verified, email_verified_at,
  average_rating, review_count
)
VALUES (
  'd1000000-0000-0000-0000-000000000002',
  'Dr. Leila Khelifi',
  'dr-leila-khelifi',
  'leila.khelifi@doktori.tn',
  '$2a$12$RMnGqrFtvydqUFu03T7m7elQOEbi7x4SClnOPLccz6zHKvOAdpshC',
  '+21698100002',
  'Dermatologue',
  'tunis',
  '15 Avenue de la Liberté, El Manar, Tunis',
  'Dermatologue et vénérologue diplômée de la Faculté de Médecine de Tunis. Dr. Khelifi prend en charge l''ensemble des affections cutanées, de la dermatologie médicale à la dermatologie esthétique.',
  '["Arabe", "Français"]',
  '["Dermatologie médicale", "Dermatologie esthétique", "Acné", "Psoriasis", "Laser"]',
  8,
  70000,
  80000,
  'both',
  true, true, 'approved', NOW() - INTERVAL '25 days',
  true, NOW() - INTERVAL '28 days',
  4.9, 41
)
ON CONFLICT (email) DO NOTHING;

-- Dr. Nour Hammami — Pédiatre
INSERT INTO doctors (
  id, name, slug, email, password_hash, phone,
  specialty, city, address,
  bio, languages, expertise, years_of_experience,
  consultation_fee, teleconsult_fee,
  consultation_mode,
  is_active, is_visible, verification_status, verified_at,
  email_verified, email_verified_at,
  average_rating, review_count
)
VALUES (
  'd1000000-0000-0000-0000-000000000003',
  'Dr. Nour Hammami',
  'dr-nour-hammami',
  'nour.hammami@doktori.tn',
  '$2a$12$RMnGqrFtvydqUFu03T7m7elQOEbi7x4SClnOPLccz6zHKvOAdpshC',
  '+21698100003',
  'Pédiatre',
  'tunis',
  '15 Avenue de la Liberté, El Manar, Tunis',
  'Pédiatre passionnée par le développement de l''enfant, Dr. Hammami assure le suivi médical de la naissance à l''adolescence. Elle propose des consultations bienveillantes adaptées aux besoins de chaque famille.',
  '["Arabe", "Français", "Anglais"]',
  '["Pédiatrie générale", "Nourrissons", "Vaccinations", "Développement psychomoteur"]',
  6,
  50000,
  60000,
  'both',
  true, true, 'approved', NOW() - INTERVAL '20 days',
  true, NOW() - INTERVAL '22 days',
  4.8, 18
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 3. INDEPENDENT DOCTOR (not in clinic)
-- =============================================================================

-- Dr. Yassine Tlili — Cardiologue, La Marsa
INSERT INTO doctors (
  id, name, slug, email, password_hash, phone,
  specialty, city, address,
  bio, languages, expertise, years_of_experience,
  consultation_fee, teleconsult_fee,
  consultation_mode,
  is_active, is_visible, verification_status, verified_at,
  email_verified, email_verified_at,
  average_rating, review_count
)
VALUES (
  'd1000000-0000-0000-0000-000000000004',
  'Dr. Yassine Tlili',
  'dr-yassine-tlili',
  'yassine.tlili@doktori.tn',
  '$2a$12$RMnGqrFtvydqUFu03T7m7elQOEbi7x4SClnOPLccz6zHKvOAdpshC',
  '+21698100004',
  'Cardiologue',
  'la marsa',
  '8 Rue du Lac Victoria, La Marsa, Tunis',
  'Cardiologue interventionnel avec 15 ans d''expérience dans la prise en charge des cardiopathies ischémiques, de l''insuffisance cardiaque et des troubles du rythme. Dr. Tlili assure également des consultations de prévention cardiovasculaire.',
  '["Arabe", "Français", "Anglais"]',
  '["Cardiologie interventionnelle", "Échocardiographie", "Holter ECG", "Prévention cardiovasculaire", "Insuffisance cardiaque"]',
  15,
  80000,
  90000,
  'both',
  true, true, 'approved', NOW() - INTERVAL '15 days',
  true, NOW() - INTERVAL '18 days',
  4.6, 35
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 4. LINK DOCTORS TO CLINIC
-- =============================================================================

INSERT INTO clinic_doctors (id, clinic_id, doctor_id, role)
VALUES
  (
    'cd100000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'admin'
  ),
  (
    'cd100000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002',
    'member'
  ),
  (
    'cd100000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000003',
    'member'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 5. SECRETARIES
-- =============================================================================

-- Mme Fatma Saidi — secretary for Dr. Bouaziz (clinic)
INSERT INTO secretaries (id, doctor_id, clinic_id, name, email, password_hash, is_active)
VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'Mme Fatma Saidi',
  'fatma.saidi@doktori.tn',
  '$2a$12$RMnGqrFtvydqUFu03T7m7elQOEbi7x4SClnOPLccz6zHKvOAdpshC',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Mme Ines Gharbi — secretary for Dr. Tlili (independent)
INSERT INTO secretaries (id, doctor_id, clinic_id, name, email, password_hash, is_active)
VALUES (
  'f1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000004',
  NULL,
  'Mme Ines Gharbi',
  'ines.gharbi@doktori.tn',
  '$2a$12$RMnGqrFtvydqUFu03T7m7elQOEbi7x4SClnOPLccz6zHKvOAdpshC',
  true
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 6. PATIENTS
-- =============================================================================

INSERT INTO patients (id, name, phone, email, date_of_birth, gender)
VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'Ahmed Ben Salah',
    '+21698111111',
    'ahmed.bensalah@gmail.com',
    '1985-03-14',
    'male'
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'Mariem Trabelsi',
    '+21697222222',
    'mariem.trabelsi@gmail.com',
    '1992-07-22',
    'female'
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'Khaled Mejri',
    '+21655333333',
    'khaled.mejri@gmail.com',
    '1978-11-05',
    'male'
  ),
  (
    'b1000000-0000-0000-0000-000000000004',
    'Sana Jebali',
    '+21690444444',
    'sana.jebali@gmail.com',
    '1995-01-30',
    'female'
  ),
  (
    'b1000000-0000-0000-0000-000000000005',
    'Youssef Belhaj',
    '+21622555555',
    'youssef.belhaj@gmail.com',
    '1988-09-18',
    'male'
  )
ON CONFLICT (phone) DO NOTHING;

-- =============================================================================
-- 7. DOCTOR SCHEDULES (Mon–Fri, morning 08:00–12:00 + afternoon 14:00–18:00)
-- =============================================================================

-- dayOfWeek: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday

-- Dr. Bouaziz schedules
INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
VALUES
  ('5c010000-0000-0001-0001-000000000001', 'd1000000-0000-0000-0000-000000000001', 1, '08:00', '12:00', 20, true),
  ('5c010000-0000-0001-0001-000000000002', 'd1000000-0000-0000-0000-000000000001', 1, '14:00', '18:00', 20, true),
  ('5c010000-0000-0001-0002-000000000001', 'd1000000-0000-0000-0000-000000000001', 2, '08:00', '12:00', 20, true),
  ('5c010000-0000-0001-0002-000000000002', 'd1000000-0000-0000-0000-000000000001', 2, '14:00', '18:00', 20, true),
  ('5c010000-0000-0001-0003-000000000001', 'd1000000-0000-0000-0000-000000000001', 3, '08:00', '12:00', 20, true),
  ('5c010000-0000-0001-0003-000000000002', 'd1000000-0000-0000-0000-000000000001', 3, '14:00', '18:00', 20, true),
  ('5c010000-0000-0001-0004-000000000001', 'd1000000-0000-0000-0000-000000000001', 4, '08:00', '12:00', 20, true),
  ('5c010000-0000-0001-0004-000000000002', 'd1000000-0000-0000-0000-000000000001', 4, '14:00', '18:00', 20, true),
  ('5c010000-0000-0001-0005-000000000001', 'd1000000-0000-0000-0000-000000000001', 5, '08:00', '12:00', 20, true),
  ('5c010000-0000-0001-0005-000000000002', 'd1000000-0000-0000-0000-000000000001', 5, '14:00', '18:00', 20, true)
ON CONFLICT DO NOTHING;

-- Dr. Khelifi schedules
INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
VALUES
  ('5c010000-0000-0002-0001-000000000001', 'd1000000-0000-0000-0000-000000000002', 1, '09:00', '12:00', 20, true),
  ('5c010000-0000-0002-0001-000000000002', 'd1000000-0000-0000-0000-000000000002', 1, '14:00', '17:00', 20, true),
  ('5c010000-0000-0002-0002-000000000001', 'd1000000-0000-0000-0000-000000000002', 2, '09:00', '12:00', 20, true),
  ('5c010000-0000-0002-0003-000000000001', 'd1000000-0000-0000-0000-000000000002', 3, '09:00', '12:00', 20, true),
  ('5c010000-0000-0002-0003-000000000002', 'd1000000-0000-0000-0000-000000000002', 3, '14:00', '17:00', 20, true),
  ('5c010000-0000-0002-0004-000000000001', 'd1000000-0000-0000-0000-000000000002', 4, '09:00', '12:00', 20, true),
  ('5c010000-0000-0002-0005-000000000001', 'd1000000-0000-0000-0000-000000000002', 5, '09:00', '12:00', 20, true),
  ('5c010000-0000-0002-0005-000000000002', 'd1000000-0000-0000-0000-000000000002', 5, '14:00', '17:00', 20, true)
ON CONFLICT DO NOTHING;

-- Dr. Hammami schedules
INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
VALUES
  ('5c010000-0000-0003-0001-000000000001', 'd1000000-0000-0000-0000-000000000003', 1, '08:00', '12:00', 20, true),
  ('5c010000-0000-0003-0002-000000000001', 'd1000000-0000-0000-0000-000000000003', 2, '08:00', '12:00', 20, true),
  ('5c010000-0000-0003-0002-000000000002', 'd1000000-0000-0000-0000-000000000003', 2, '14:00', '18:00', 20, true),
  ('5c010000-0000-0003-0003-000000000001', 'd1000000-0000-0000-0000-000000000003', 3, '08:00', '12:00', 20, true),
  ('5c010000-0000-0003-0004-000000000001', 'd1000000-0000-0000-0000-000000000003', 4, '08:00', '12:00', 20, true),
  ('5c010000-0000-0003-0004-000000000002', 'd1000000-0000-0000-0000-000000000003', 4, '14:00', '18:00', 20, true),
  ('5c010000-0000-0003-0005-000000000001', 'd1000000-0000-0000-0000-000000000003', 5, '08:00', '12:00', 20, true)
ON CONFLICT DO NOTHING;

-- Dr. Tlili schedules
INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
VALUES
  ('5c010000-0000-0004-0001-000000000001', 'd1000000-0000-0000-0000-000000000004', 1, '08:00', '12:00', 20, true),
  ('5c010000-0000-0004-0001-000000000002', 'd1000000-0000-0000-0000-000000000004', 1, '14:00', '18:00', 20, true),
  ('5c010000-0000-0004-0002-000000000001', 'd1000000-0000-0000-0000-000000000004', 2, '08:00', '12:00', 20, true),
  ('5c010000-0000-0004-0002-000000000002', 'd1000000-0000-0000-0000-000000000004', 2, '14:00', '18:00', 20, true),
  ('5c010000-0000-0004-0003-000000000001', 'd1000000-0000-0000-0000-000000000004', 3, '08:00', '12:00', 20, true),
  ('5c010000-0000-0004-0004-000000000001', 'd1000000-0000-0000-0000-000000000004', 4, '08:00', '12:00', 20, true),
  ('5c010000-0000-0004-0004-000000000002', 'd1000000-0000-0000-0000-000000000004', 4, '14:00', '18:00', 20, true),
  ('5c010000-0000-0004-0005-000000000001', 'd1000000-0000-0000-0000-000000000004', 5, '08:00', '13:00', 20, true)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 8. APPOINTMENTS (today + this week)
-- Note: CURRENT_DATE is Friday 2026-04-18. Week Mon=04-13 to Fri=04-17 + today.
-- Using concrete past/future timestamps for a stable, realistic demo.
-- =============================================================================

-- Appointment UUIDs: a1XXXXXX pattern

-- [COMPLETED] Ahmed Ben Salah + Dr. Bouaziz — Monday 08:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '08:00',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '08:20',
  'completed',
  'cabinet',
  'Douleurs thoraciques légères',
  (CURRENT_DATE - INTERVAL '6 days')::date + TIME '14:00'
)
ON CONFLICT DO NOTHING;

-- [COMPLETED] Mariem Trabelsi + Dr. Khelifi — Monday 09:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000002',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '09:00',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '09:20',
  'completed',
  'cabinet',
  'Éruption cutanée sur le bras droit',
  (CURRENT_DATE - INTERVAL '6 days')::date + TIME '16:30'
)
ON CONFLICT DO NOTHING;

-- [COMPLETED] Khaled Mejri + Dr. Tlili — Tuesday 08:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000003',
  'd1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000003',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '08:00',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '08:20',
  'completed',
  'cabinet',
  'Bilan cardiaque annuel',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '10:00'
)
ON CONFLICT DO NOTHING;

-- [COMPLETED] Sana Jebali + Dr. Hammami — Tuesday 14:00 (teleconsult)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000004',
  'd1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000004',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '14:00',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '14:20',
  'completed',
  'teleconsult',
  'Fièvre persistante chez l''enfant (4 ans)',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '09:30'
)
ON CONFLICT DO NOTHING;

-- [COMPLETED] Youssef Belhaj + Dr. Bouaziz — Wednesday 10:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000005',
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000005',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '10:00',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '10:20',
  'completed',
  'cabinet',
  'Renouvellement ordonnance — antihypertenseurs',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '11:00'
)
ON CONFLICT DO NOTHING;

-- [COMPLETED] Ahmed Ben Salah + Dr. Tlili — Wednesday 14:00 (teleconsult)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000006',
  'd1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000001',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '14:00',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '14:20',
  'completed',
  'teleconsult',
  'Suivi post-échocardiographie',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '08:15'
)
ON CONFLICT DO NOTHING;

-- [CONFIRMED] Mariem Trabelsi + Dr. Bouaziz — Today 08:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000007',
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  CURRENT_DATE + TIME '08:00',
  CURRENT_DATE + TIME '08:20',
  'confirmed',
  'cabinet',
  'Consultation générale — fatigue chronique',
  CURRENT_DATE - INTERVAL '1 day' + TIME '15:00'
)
ON CONFLICT DO NOTHING;

-- [CONFIRMED] Khaled Mejri + Dr. Khelifi — Today 09:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000008',
  'd1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  CURRENT_DATE + TIME '09:00',
  CURRENT_DATE + TIME '09:20',
  'confirmed',
  'cabinet',
  'Contrôle traitement acné',
  CURRENT_DATE - INTERVAL '2 days' + TIME '10:30'
)
ON CONFLICT DO NOTHING;

-- [PENDING] Sana Jebali + Dr. Hammami — Today 14:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason)
VALUES (
  'a1000000-0000-0000-0000-000000000009',
  'd1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000004',
  CURRENT_DATE + TIME '14:00',
  CURRENT_DATE + TIME '14:20',
  'pending',
  'cabinet',
  'Visite de routine — nourrisson 6 mois'
)
ON CONFLICT DO NOTHING;

-- [CONFIRMED] Youssef Belhaj + Dr. Tlili — Today 10:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000010',
  'd1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000005',
  CURRENT_DATE + TIME '10:00',
  CURRENT_DATE + TIME '10:20',
  'confirmed',
  'cabinet',
  'Douleur thoracique à l''effort',
  CURRENT_DATE - INTERVAL '1 day' + TIME '09:00'
)
ON CONFLICT DO NOTHING;

-- [PENDING] Ahmed Ben Salah + Dr. Khelifi — Tomorrow 09:00 (teleconsult)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason)
VALUES (
  'a1000000-0000-0000-0000-000000000011',
  'd1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000001',
  (CURRENT_DATE + INTERVAL '1 day')::date + TIME '09:00',
  (CURRENT_DATE + INTERVAL '1 day')::date + TIME '09:20',
  'pending',
  'teleconsult',
  'Avis dermatologique — taches solaires'
)
ON CONFLICT DO NOTHING;

-- [CONFIRMED] Mariem Trabelsi + Dr. Tlili — Tomorrow 08:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason, confirmed_at)
VALUES (
  'a1000000-0000-0000-0000-000000000012',
  'd1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000002',
  (CURRENT_DATE + INTERVAL '1 day')::date + TIME '08:00',
  (CURRENT_DATE + INTERVAL '1 day')::date + TIME '08:20',
  'confirmed',
  'cabinet',
  'Première consultation cardiologique',
  CURRENT_DATE + TIME '07:30'
)
ON CONFLICT DO NOTHING;

-- [PENDING] Khaled Mejri + Dr. Hammami — Next Monday 08:00 (cabinet)
INSERT INTO appointments (id, doctor_id, patient_id, starts_at, ends_at, status, type, reason)
VALUES (
  'a1000000-0000-0000-0000-000000000013',
  'd1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000003',
  (CURRENT_DATE + INTERVAL '3 days')::date + TIME '08:00',
  (CURRENT_DATE + INTERVAL '3 days')::date + TIME '08:20',
  'pending',
  'cabinet',
  'Consultation enfant — rhume persistant'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 9. REVIEWS (published, linked to completed appointments)
-- =============================================================================

-- Review 1: Ahmed → Dr. Bouaziz (appt 001)
INSERT INTO reviews (id, doctor_id, patient_id, appointment_id, rating, comment, verified, status)
VALUES (
  'e1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  5,
  'Médecin très à l''écoute et professionnel. Il a pris le temps de bien expliquer mon diagnostic et de répondre à toutes mes questions. Je recommande vivement !',
  true,
  'published'
)
ON CONFLICT DO NOTHING;

-- Review 2: Mariem → Dr. Khelifi (appt 002)
INSERT INTO reviews (id, doctor_id, patient_id, appointment_id, rating, comment, verified, status)
VALUES (
  'e1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000002',
  5,
  'Dr. Khelifi est excellente ! Elle a diagnostiqué mon problème de peau rapidement et le traitement a été très efficace. Cabinet propre et accueil chaleureux.',
  true,
  'published'
)
ON CONFLICT DO NOTHING;

-- Review 3: Khaled → Dr. Tlili (appt 003)
INSERT INTO reviews (id, doctor_id, patient_id, appointment_id, rating, comment, verified, status)
VALUES (
  'e1000000-0000-0000-0000-000000000003',
  'd1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000003',
  4,
  'Cardiologue très compétent et rassurant. Le bilan a été complet et les résultats bien expliqués. Légère attente à l''accueil mais rien de grave.',
  true,
  'published'
)
ON CONFLICT DO NOTHING;

-- Review 4: Sana → Dr. Hammami (appt 004)
INSERT INTO reviews (id, doctor_id, patient_id, appointment_id, rating, comment, verified, status)
VALUES (
  'e1000000-0000-0000-0000-000000000004',
  'd1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000004',
  5,
  'La téléconsultation s''est très bien passée. Dr. Hammami est douce et rassurante, ma fille s''est tout de suite sentie à l''aise. Très bonne expérience !',
  true,
  'published'
)
ON CONFLICT DO NOTHING;

-- Review 5: Youssef → Dr. Bouaziz (appt 005)
INSERT INTO reviews (id, doctor_id, patient_id, appointment_id, rating, comment, verified, status)
VALUES (
  'e1000000-0000-0000-0000-000000000005',
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000005',
  4,
  'Bon médecin généraliste, disponible et efficace. Il connaît bien mes antécédents et le renouvellement d''ordonnance a été rapide. Je suis fidèle à son cabinet depuis 5 ans.',
  true,
  'published'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 10. SUBSCRIPTIONS (trial for each doctor)
-- =============================================================================

INSERT INTO subscriptions (id, doctor_id, plan, status, price_millimes, billing_cycle, starts_at, ends_at)
VALUES
  (
    '5ab10000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'essentiel',
    'trial',
    0,
    'monthly',
    NOW() - INTERVAL '14 days',
    NOW() + INTERVAL '14 days'
  ),
  (
    '5ab10000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000002',
    'pro',
    'trial',
    0,
    'monthly',
    NOW() - INTERVAL '10 days',
    NOW() + INTERVAL '20 days'
  ),
  (
    '5ab10000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000003',
    'essentiel',
    'trial',
    0,
    'monthly',
    NOW() - INTERVAL '7 days',
    NOW() + INTERVAL '23 days'
  ),
  (
    '5ab10000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000004',
    'pro',
    'trial',
    0,
    'monthly',
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '25 days'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 11. DOCTOR WALLETS (for financial dashboard demo)
-- =============================================================================

INSERT INTO doctor_wallets (id, doctor_id, balance, total_earned, total_commission, total_withdrawn)
VALUES
  ('a1710000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 120000,  350000, 35000,  195000),
  ('a1710000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 245000,  580000, 58000,  277000),
  ('a1710000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003',  80000,  210000, 21000,  109000),
  ('a1710000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 310000,  720000, 72000,  338000)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 12. APPOINTMENT TYPES (for G3 questionnaire demo)
-- =============================================================================

INSERT INTO appointment_types (id, doctor_id, name, duration_minutes, fee, color, mode, is_default, is_active)
VALUES
  -- Dr. Bouaziz
  (
    'a7100000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    'Première consultation',
    30, 60000, '#2563eb', 'cabinet', true, true
  ),
  (
    'a7100000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    'Consultation de suivi',
    20, 50000, '#16a34a', 'both', false, true
  ),
  -- Dr. Khelifi
  (
    'a7100000-0000-0000-0000-000000000003',
    'd1000000-0000-0000-0000-000000000002',
    'Consultation dermatologique',
    30, 70000, '#9333ea', 'cabinet', true, true
  ),
  (
    'a7100000-0000-0000-0000-000000000004',
    'd1000000-0000-0000-0000-000000000002',
    'Téléconsultation dermatologie',
    20, 80000, '#0891b2', 'teleconsult', false, true
  ),
  -- Dr. Hammami
  (
    'a7100000-0000-0000-0000-000000000005',
    'd1000000-0000-0000-0000-000000000003',
    'Consultation nourrisson',
    20, 50000, '#f59e0b', 'cabinet', true, true
  ),
  (
    'a7100000-0000-0000-0000-000000000006',
    'd1000000-0000-0000-0000-000000000003',
    'Suivi développement enfant',
    30, 55000, '#10b981', 'both', false, true
  ),
  -- Dr. Tlili
  (
    'a7100000-0000-0000-0000-000000000007',
    'd1000000-0000-0000-0000-000000000004',
    'Bilan cardiologique complet',
    45, 100000, '#dc2626', 'cabinet', true, true
  ),
  (
    'a7100000-0000-0000-0000-000000000008',
    'd1000000-0000-0000-0000-000000000004',
    'Consultation de suivi cardiaque',
    20, 80000, '#ea580c', 'both', false, true
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- End of demo seed
-- =============================================================================
