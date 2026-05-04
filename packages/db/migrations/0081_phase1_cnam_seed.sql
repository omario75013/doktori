-- 0081_phase1_cnam_seed — Seed CNAM Tunisia nomenclature (30 actes courants)
-- Idempotent: ON CONFLICT (code) DO NOTHING.
-- Stream C — Phase 1 — item #29

INSERT INTO cnam_acts (code, name_fr, name_ar, base_fee_tnd, reimbursement_pct, category, display_order) VALUES
-- Consultations
('CONS_GEN', 'Consultation médecin généraliste', 'استشارة طبيب عام', 30.00, 70.00, 'consultation', 1),
('CONS_SPE', 'Consultation médecin spécialiste', 'استشارة طبيب اختصاصي', 50.00, 60.00, 'consultation', 2),
('CONS_DENT', 'Consultation dentaire', 'استشارة طبيب أسنان', 35.00, 50.00, 'consultation', 3),
('CONS_GYN', 'Consultation gynécologique', 'استشارة طب النساء', 60.00, 60.00, 'consultation', 4),
('CONS_PED', 'Consultation pédiatrique', 'استشارة طب الأطفال', 50.00, 70.00, 'consultation', 5),
-- Visites
('VISIT_DOM', 'Visite à domicile généraliste', 'زيارة منزلية', 60.00, 60.00, 'consultation', 6),
('VISIT_NUIT', 'Visite à domicile nuit (22h-7h)', 'زيارة ليلية', 90.00, 60.00, 'consultation', 7),
-- Imagerie
('RX_THORAX', 'Radiographie thorax', 'أشعة الصدر', 25.00, 70.00, 'imaging', 10),
('ECHO_ABDO', 'Échographie abdominale', 'سونار البطن', 60.00, 70.00, 'imaging', 11),
('ECHO_GROSS', 'Échographie obstétricale', 'سونار الحمل', 80.00, 70.00, 'imaging', 12),
('SCAN_CRANE', 'Scanner crânien', 'فحص بالأشعة المقطعية للرأس', 250.00, 50.00, 'imaging', 13),
('IRM_GENOU', 'IRM du genou', 'رنين مغناطيسي للركبة', 400.00, 50.00, 'imaging', 14),
-- Cardiologie
('ECG', 'Électrocardiogramme', 'تخطيط القلب', 35.00, 70.00, 'procedure', 20),
('HOLTER', 'Holter ECG 24h', 'هولتر القلب 24 ساعة', 80.00, 60.00, 'procedure', 21),
('ECHO_CARD', 'Échocardiographie', 'سونار القلب', 100.00, 60.00, 'imaging', 22),
-- Biologie
('NFS', 'Numération formule sanguine', 'تحليل الدم الكامل', 12.00, 70.00, 'lab', 30),
('GLY_JEUN', 'Glycémie à jeun', 'سكر الدم على الريق', 8.00, 70.00, 'lab', 31),
('HBA1C', 'HbA1c (hémoglobine glyquée)', 'الهيموجلوبين السكري', 25.00, 70.00, 'lab', 32),
('CREAT', 'Créatininémie', 'الكرياتينين', 8.00, 70.00, 'lab', 33),
('TSH', 'TSH (hormone thyroïdienne)', 'هرمون الغدة الدرقية', 25.00, 70.00, 'lab', 34),
('BHCG', 'Bêta-HCG (test grossesse)', 'فحص الحمل', 18.00, 70.00, 'lab', 35),
-- Procédures
('PANSEMENT', 'Pansement simple', 'ضمادة بسيطة', 15.00, 70.00, 'procedure', 40),
('SUTURE', 'Suture plaie simple', 'خياطة جرح بسيط', 30.00, 70.00, 'procedure', 41),
('VACC_GRIPPE', 'Vaccin grippe (acte)', 'لقاح الإنفلونزا', 15.00, 70.00, 'procedure', 42),
('INJ_INTRAMUSC', 'Injection intramusculaire', 'حقنة عضلية', 10.00, 70.00, 'procedure', 43),
-- Dentaire
('DENT_DETART', 'Détartrage dentaire', 'تنظيف الأسنان', 50.00, 50.00, 'procedure', 50),
('DENT_CARIE', 'Soin de carie simple', 'علاج تسوس بسيط', 40.00, 50.00, 'procedure', 51),
('DENT_EXT', 'Extraction dentaire simple', 'خلع سن', 50.00, 50.00, 'procedure', 52),
-- Spécialiste
('OPHTAL_FOND', 'Fond d''oeil', 'فحص قاع العين', 50.00, 60.00, 'specialist', 60),
('DERMA_CRYO', 'Cryothérapie verrue', 'علاج الثآليل بالتبريد', 30.00, 60.00, 'specialist', 61)
ON CONFLICT (code) DO NOTHING;
