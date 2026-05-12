-- Medical certificates — parallel to prescriptions. Each row is one
-- certificate emitted by a doctor for a patient. Verification token
-- backs a public QR code; the doctor's signature_url is rendered on
-- the printable page just like for ordonnances.

CREATE TABLE IF NOT EXISTS "medical_certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "appointment_id" uuid REFERENCES "appointments"("id") ON DELETE CASCADE,
  "doctor_id" uuid NOT NULL REFERENCES "doctors"("id") ON DELETE CASCADE,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "verification_token" varchar(64),
  "template_id" uuid REFERENCES "prescription_templates"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "medical_certificates_appointment_idx"
  ON "medical_certificates" ("appointment_id");
CREATE INDEX IF NOT EXISTS "medical_certificates_patient_idx"
  ON "medical_certificates" ("patient_id");
CREATE INDEX IF NOT EXISTS "medical_certificates_doctor_idx"
  ON "medical_certificates" ("doctor_id");
CREATE INDEX IF NOT EXISTS "medical_certificates_verification_token_idx"
  ON "medical_certificates" ("verification_token");

-- Seed a handful of official certificate templates. We reuse the
-- existing prescription_templates table with target_type set to
-- 'certificat_medical' so the doctor's /modeles UI lists both kinds
-- side-by-side, distinguished by a tab/filter.
INSERT INTO "prescription_templates"
  ("title", "description", "language", "slug", "body_markdown", "target_type", "is_official")
VALUES
  (
    'Certificat médical d''arrêt de travail',
    'Certificat justifiant un arrêt de travail pour raison médicale.',
    'fr',
    'arret-travail',
    E'**CERTIFICAT MÉDICAL**\n\nJe soussigné(e), Dr **{{doctor_name}}**, {{doctor_specialty}}, certifie avoir examiné ce jour :\n\n**{{patient_first_name}} {{patient_last_name}}**, né(e) le {{patient_dob}}.\n\nL''état de santé du patient justifie un **arrêt de travail de _____ jour(s)**, à compter du {{date_today}}, sauf complication.\n\nCertificat établi à la demande de l''intéressé(e) et remis en main propre pour faire valoir ce que de droit.\n\nFait à {{doctor_city}}, le {{date_today}}.',
    'certificat_medical',
    true
  ),
  (
    'Certificat médical d''aptitude au sport',
    'Certificat de non contre-indication à la pratique sportive.',
    'fr',
    'aptitude-sport',
    E'**CERTIFICAT MÉDICAL DE NON CONTRE-INDICATION À LA PRATIQUE SPORTIVE**\n\nJe soussigné(e), Dr **{{doctor_name}}**, {{doctor_specialty}}, certifie avoir examiné ce jour :\n\n**{{patient_first_name}} {{patient_last_name}}**, né(e) le {{patient_dob}}.\n\nL''examen clinique ne révèle, à la date de ce jour, **aucune contre-indication à la pratique du sport en compétition et en loisir**.\n\nCertificat établi à la demande de l''intéressé(e) et remis en main propre pour faire valoir ce que de droit.\n\nFait à {{doctor_city}}, le {{date_today}}.',
    'certificat_medical',
    true
  ),
  (
    'Certificat médical de présence',
    'Atteste qu''un patient s''est présenté en consultation.',
    'fr',
    'presence-consultation',
    E'**CERTIFICAT MÉDICAL DE PRÉSENCE**\n\nJe soussigné(e), Dr **{{doctor_name}}**, {{doctor_specialty}}, certifie que :\n\n**{{patient_first_name}} {{patient_last_name}}**, né(e) le {{patient_dob}}, s''est présenté(e) ce jour à ma consultation, le {{date_today}}.\n\nCertificat établi à la demande de l''intéressé(e) et remis en main propre pour faire valoir ce que de droit.\n\nFait à {{doctor_city}}, le {{date_today}}.',
    'certificat_medical',
    true
  ),
  (
    'Certificat médical de bonne santé',
    'Certificat général attestant du bon état de santé.',
    'fr',
    'bonne-sante',
    E'**CERTIFICAT MÉDICAL DE BONNE SANTÉ**\n\nJe soussigné(e), Dr **{{doctor_name}}**, {{doctor_specialty}}, certifie avoir examiné ce jour :\n\n**{{patient_first_name}} {{patient_last_name}}**, né(e) le {{patient_dob}}.\n\nÀ l''examen clinique, le patient ne présente, à la date de ce jour, **aucune affection contagieuse ni contre-indication apparente**, et son état de santé général paraît compatible avec une vie sociale et professionnelle normale.\n\nCertificat établi à la demande de l''intéressé(e) et remis en main propre pour faire valoir ce que de droit.\n\nFait à {{doctor_city}}, le {{date_today}}.',
    'certificat_medical',
    true
  ),
  (
    'Certificat médical de dispense',
    'Dispense temporaire d''activité scolaire ou sportive.',
    'fr',
    'dispense',
    E'**CERTIFICAT MÉDICAL DE DISPENSE**\n\nJe soussigné(e), Dr **{{doctor_name}}**, {{doctor_specialty}}, certifie avoir examiné ce jour :\n\n**{{patient_first_name}} {{patient_last_name}}**, né(e) le {{patient_dob}}.\n\nSon état de santé justifie une **dispense de _____** (préciser : sport, EPS, activité scolaire, …) **pour une durée de _____ jour(s)** à compter du {{date_today}}.\n\nCertificat établi à la demande de l''intéressé(e) et remis en main propre pour faire valoir ce que de droit.\n\nFait à {{doctor_city}}, le {{date_today}}.',
    'certificat_medical',
    true
  )
ON CONFLICT DO NOTHING;
