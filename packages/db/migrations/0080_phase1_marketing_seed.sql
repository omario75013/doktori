-- 0080_phase1_marketing_seed — Seed pregnancy week + Tunisia infant vaccine schedule
-- Idempotent: ON CONFLICT clauses make it safe to re-run.

-- ── Vaccines (Programme National de Vaccination Tunisie 0-2 ans) ─────────────
INSERT INTO vaccine_info_content (slug, name_fr, name_ar, age_min_months, age_max_months, description_fr, description_ar, doses_count, is_mandatory_tn, display_order) VALUES
('bcg', 'BCG (tuberculose)', 'بي سي جي', 0, 1, 'Vaccin contre la tuberculose, administré à la naissance.', 'لقاح ضد السل يُعطى عند الولادة.', 1, true, 10),
('hb-naissance', 'Hépatite B (dose 0)', 'التهاب الكبد ب (الجرعة 0)', 0, 1, 'Première dose du vaccin contre l''hépatite B, à la naissance.', 'الجرعة الأولى من لقاح التهاب الكبد ب عند الولادة.', 1, true, 20),
('penta-2m', 'Pentavalent (DTC-Hib-HepB) - 2 mois', 'الخماسي - 2 أشهر', 2, 2, 'Vaccin combiné contre diphtérie, tétanos, coqueluche, Haemophilus influenzae b, hépatite B.', 'لقاح مركب ضد الخناق والكزاز والشاهوق وهيموفيلوس ب والتهاب الكبد ب.', 1, true, 30),
('polio-2m', 'Polio oral - 2 mois', 'شلل الأطفال - 2 أشهر', 2, 2, 'Vaccin oral contre la poliomyélite.', 'لقاح فموي ضد شلل الأطفال.', 1, true, 31),
('penta-3m', 'Pentavalent - 3 mois', 'الخماسي - 3 أشهر', 3, 3, 'Deuxième dose du pentavalent.', 'الجرعة الثانية من اللقاح الخماسي.', 1, true, 40),
('polio-3m', 'Polio oral - 3 mois', 'شلل الأطفال - 3 أشهر', 3, 3, 'Deuxième dose du polio oral.', 'الجرعة الثانية من لقاح شلل الأطفال.', 1, true, 41),
('penta-6m', 'Pentavalent - 6 mois', 'الخماسي - 6 أشهر', 6, 6, 'Troisième dose du pentavalent.', 'الجرعة الثالثة من اللقاح الخماسي.', 1, true, 50),
('polio-6m', 'Polio oral - 6 mois', 'شلل الأطفال - 6 أشهر', 6, 6, 'Troisième dose du polio oral.', 'الجرعة الثالثة من لقاح شلل الأطفال.', 1, true, 51),
('rougeole-9m', 'Anti-rougeoleux - 9 mois', 'الحصبة - 9 أشهر', 9, 9, 'Vaccin contre la rougeole, première dose.', 'لقاح الحصبة، الجرعة الأولى.', 1, true, 60),
('ror-12m', 'ROR (Rougeole-Oreillons-Rubéole) - 12 mois', 'الحصبة والنكاف والحصبة الألمانية - 12 شهر', 12, 12, 'Vaccin combiné, première dose.', 'لقاح مركب، الجرعة الأولى.', 1, true, 70),
('rappel-18m', 'Rappel DTC + Polio - 18 mois', 'تذكير الثلاثي + شلل الأطفال - 18 شهر', 18, 18, 'Rappel des vaccins DTC et polio.', 'تذكير لقاحات الثلاثي وشلل الأطفال.', 1, true, 80),
('ror-rappel-18m', 'Rappel ROR - 18 mois', 'تذكير الحصبة والنكاف والحصبة الألمانية - 18 شهر', 18, 18, 'Rappel du vaccin ROR.', 'تذكير لقاح الحصبة والنكاف والحصبة الألمانية.', 1, true, 81)
ON CONFLICT (slug) DO NOTHING;

-- ── Pregnancy weeks (5 key milestones) ──────────────────────────────────────
INSERT INTO pregnancy_week_content (week_number, title_fr, title_ar, baby_size_fr, baby_size_ar, content_md_fr, content_md_ar, tips_fr, tips_ar) VALUES
(4, 'Semaine 4 — Le test', 'الأسبوع 4 - الاختبار', 'Graine de pavot (1 mm)', 'بذرة الخشخاش',
'## Vous êtes peut-être enceinte

C''est généralement la semaine où le test de grossesse devient positif. L''embryon est minuscule mais le placenta commence déjà à se former.

### Symptômes possibles
- Fatigue inhabituelle
- Sensibilité des seins
- Légères crampes

### À faire
- Confirmer avec un test sanguin (β-hCG)
- Prendre rendez-vous chez votre gynécologue
- Commencer l''acide folique (400 µg/jour)',
'## قد تكونين حاملاً

هذا هو الأسبوع الذي يصبح فيه اختبار الحمل إيجابيًا عادة.',
'["Acide folique 400 µg/jour", "Éviter alcool/tabac", "Premier RDV gynécologue"]'::jsonb,
'["حمض الفوليك 400 ميكروغرام يوميا", "تجنب الكحول والتبغ", "الزيارة الأولى لطبيب النساء"]'::jsonb),

(12, 'Semaine 12 — Premier trimestre', 'الأسبوع 12 - الثلث الأول', 'Citron (5 cm)', 'حبة ليمون',
'## Fin du premier trimestre

Le risque de fausse couche diminue significativement. Le bébé est entièrement formé.

### Examens recommandés
- **Échographie de datation** (semaine 11-13)
- **Dépistage trisomie 21** (clarté nucale + sang)
- **Bilan sanguin complet** : glycémie, sérologies (toxoplasmose, rubéole, syphilis, HIV, hépatite B)

### Symptômes
- Nausées qui s''atténuent
- Énergie qui revient',
'## نهاية الثلث الأول من الحمل

انخفاض كبير في خطر الإجهاض.',
'["Échographie 11-13 SA", "Dépistage T21", "Annoncer à votre entourage si vous le souhaitez"]'::jsonb,
'["الموجات فوق الصوتية 11-13 أسبوع", "فحص متلازمة داون", "الإعلان للعائلة إذا رغبت"]'::jsonb),

(20, 'Semaine 20 — Échographie morphologique', 'الأسبوع 20 - السونار التفصيلي', 'Banane (16 cm)', 'موزة',
'## Mi-grossesse

Le sexe du bébé peut être déterminé. Vous sentez peut-être les premiers mouvements.

### Examen clé
- **Échographie morphologique** (semaine 20-22) : vérifie organes, mensurations, position du placenta

### À surveiller
- Mouvements fœtaux quotidiens
- Tension artérielle
- Albuminurie

### Préparation
- Inscription maternité (si vous voulez choisir)
- Cours de préparation à l''accouchement',
'## منتصف الحمل

يمكن تحديد جنس الطفل.',
'["Échographie morphologique", "Premier mouvements fœtaux", "Inscription maternité"]'::jsonb,
'["السونار التفصيلي", "الحركة الأولى للجنين", "تسجيل المستشفى"]'::jsonb),

(32, 'Semaine 32 — Préparation', 'الأسبوع 32 - التحضير', 'Ananas (42 cm)', 'أناناس',
'## Dernier trimestre

Le bébé prend du poids rapidement. Il se positionne pour l''accouchement.

### Examens
- **3ème échographie** (semaine 32-34)
- **Test O''Sullivan** (diabète gestationnel) si pas fait
- **Streptocoque B** (vaginal) à 35-37 SA

### Préparation
- Sac de maternité prêt
- Plan de naissance avec le médecin
- Suivi mensuel devient bi-mensuel',
'## الثلث الأخير من الحمل

الطفل يكتسب الوزن بسرعة.',
'["3ème échographie", "Sac de maternité", "Plan de naissance"]'::jsonb,
'["السونار الثالث", "حقيبة المستشفى", "خطة الولادة"]'::jsonb),

(40, 'Semaine 40 — Terme', 'الأسبوع 40 - الموعد', 'Pastèque (50 cm)', 'بطيخة',
'## Date prévue d''accouchement

Le bébé est à terme. L''accouchement peut survenir entre la 37ème et la 42ème semaine.

### Signes du travail
- Contractions régulières (toutes les 5 min, 1 min, pendant 1h — règle 5-1-1)
- Perte du bouchon muqueux
- Rupture de la poche des eaux

### Quand aller à la maternité
- Contractions douloureuses régulières
- Saignement important
- Perte des eaux
- Diminution des mouvements fœtaux',
'## موعد الولادة

الطفل في موعده.',
'["Sac prêt", "Numéro maternité dans téléphone", "Conducteur de secours"]'::jsonb,
'["الحقيبة جاهزة", "رقم المستشفى في الهاتف", "سائق احتياطي"]'::jsonb)
ON CONFLICT (week_number) DO UPDATE SET
  title_fr = EXCLUDED.title_fr,
  content_md_fr = EXCLUDED.content_md_fr,
  baby_size_fr = EXCLUDED.baby_size_fr,
  tips_fr = EXCLUDED.tips_fr,
  updated_at = now();
