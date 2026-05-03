-- 0070_prescription_templates_seed — 10 modèles officiels Doktori (FR)
-- Idempotent via ON CONFLICT (slug) WHERE is_official = true AND deleted_at IS NULL DO NOTHING

INSERT INTO prescription_templates (
  doctor_id,
  title,
  description,
  language,
  slug,
  body_markdown,
  target_type,
  is_official
)
VALUES

-- 1. Ordonnance standard généraliste
(
  NULL,
  'Ordonnance standard – Médecine générale',
  'Modèle de base pour une ordonnance de médecine générale avec médicaments et posologie.',
  'fr',
  'ordonnance-standard-generaliste',
  $TPL$# Ordonnance

**Dr. {{doctor_name}}**
Spécialiste en {{doctor_specialty}}
{{doctor_city}} | {{doctor_phone}}

---

**Patient :** {{patient_first_name}} {{patient_last_name}}
**Date :** {{date_today}}

---

## Prescriptions

1. **[Médicament 1]** — [Posologie] pendant [Durée]
2. **[Médicament 2]** — [Posologie] pendant [Durée]

---

*Le médecin reste seul responsable de la prescription, des doses et de la pertinence clinique.*
$TPL$,
  'prescription',
  true
),

-- 2. Arrêt de travail
(
  NULL,
  'Arrêt de travail',
  'Certificat d''arrêt de travail avec durée et motif.',
  'fr',
  'arret-de-travail',
  $TPL$# Certificat d'arrêt de travail

**Dr. {{doctor_name}}**
{{doctor_specialty}} — {{doctor_city}}
Tél. : {{doctor_phone}}

---

Je soussigné, Dr. {{doctor_name}}, certifie que l'état de santé de :

**M./Mme {{patient_first_name}} {{patient_last_name}}**
né(e) le {{patient_dob}}

nécessite un arrêt de travail du **{{date_today}}** au **[Date de fin]** inclus, soit **[X] jour(s)**.

**Motif :** [Motif médical]

Fait à {{doctor_city}}, le {{date_today}}

*Signature et cachet du médecin*
$TPL$,
  'certificate',
  true
),

-- 3. Certificat médical général
(
  NULL,
  'Certificat médical général',
  'Attestation de consultation médicale avec état de santé général.',
  'fr',
  'certificat-medical-general',
  $TPL$# Certificat Médical

**Dr. {{doctor_name}}**
{{doctor_specialty}}
{{doctor_city}} | {{doctor_phone}}

---

Je soussigné, Dr. {{doctor_name}}, certifie avoir examiné ce jour :

**Nom :** {{patient_first_name}} {{patient_last_name}}
**Date de naissance :** {{patient_dob}}
**Date de consultation :** {{date_today}}

À l'issue de cet examen, le patient présente : [Description de l'état de santé]

Ce certificat est établi à la demande de l'intéressé(e) et remis en main propre.

Fait à {{doctor_city}}, le {{date_today}}

*Signature et cachet*
$TPL$,
  'certificate',
  true
),

-- 4. Ordonnance cardiologie
(
  NULL,
  'Ordonnance – Cardiologie',
  'Modèle adapté aux prescriptions cardiovasculaires avec surveillance tensionnelle.',
  'fr',
  'ordonnance-cardiologie',
  $TPL$# Ordonnance – Cardiologie

**Dr. {{doctor_name}}**
Cardiologue — {{doctor_city}}
Tél. : {{doctor_phone}}

---

**Patient :** {{patient_first_name}} {{patient_last_name}}
**Date de naissance :** {{patient_dob}}
**Date :** {{date_today}}

---

## Traitement cardiovasculaire

| Médicament | Dose | Fréquence | Durée |
|-----------|------|-----------|-------|
| [Médicament 1] | [Dose] | [Fréquence] | [Durée] |
| [Médicament 2] | [Dose] | [Fréquence] | [Durée] |

## Surveillance

- Contrôle de la pression artérielle : [Fréquence]
- Prochain RDV : [Date]
- ECG de contrôle : ☐ Oui  ☐ Non

---

*Médicaments à prendre avec eau abondante. Ne pas arrêter le traitement sans avis médical.*
$TPL$,
  'prescription',
  true
),

-- 5. Ordonnance pédiatrique
(
  NULL,
  'Ordonnance pédiatrique',
  'Modèle pour les prescriptions d''enfants avec poids et posologie adaptée.',
  'fr',
  'ordonnance-pediatrique',
  $TPL$# Ordonnance Pédiatrique

**Dr. {{doctor_name}}**
{{doctor_specialty}} — {{doctor_city}}
Tél. : {{doctor_phone}}

---

**Enfant :** {{patient_first_name}} {{patient_last_name}}
**Date de naissance :** {{patient_dob}}
**Poids :** {{patient_weight_kg}} kg
**Date :** {{date_today}}

---

## Prescriptions

1. **[Médicament 1]**
   - Dose : [X mg/kg/jour] soit **[Dose totale]** par prise
   - [X] fois par jour pendant [Durée]
   - Forme : sirop / comprimé / suppositoire

2. **[Médicament 2]**
   - [Posologie adaptée au poids]

---

> Allergie(s) connue(s) : {{patient_allergies}}

*À administrer sous surveillance parentale. Conserver hors de portée des enfants.*
$TPL$,
  'prescription',
  true
),

-- 6. Demande d'examens biologiques
(
  NULL,
  'Demande d''examens biologiques',
  'Bilan biologique avec liste de tests à cocher.',
  'fr',
  'demande-examens-biologiques',
  $TPL$# Demande d'Examens Biologiques

**Dr. {{doctor_name}}**
{{doctor_specialty}} — {{doctor_city}}

---

**Patient :** {{patient_first_name}} {{patient_last_name}}
**Date :** {{date_today}}

---

## Bilan demandé

### Hématologie
- ☐ NFS (Numération Formule Sanguine)
- ☐ VS (Vitesse de sédimentation)
- ☐ TP/INR

### Biochimie
- ☐ Glycémie à jeun
- ☐ HbA1c
- ☐ Bilan lipidique (CT, LDL, HDL, TG)
- ☐ Créatininémie / Urée
- ☐ Transaminases (ASAT, ALAT)
- ☐ TSH

### Autres
- ☐ [Examen spécifique]

---

**Motif :** [Indication clinique]
**Urgence :** ☐ Non  ☐ Oui — Résultat souhaité avant le : [Date]
$TPL$,
  'prescription',
  true
),

-- 7. Demande d'imagerie médicale
(
  NULL,
  'Demande d''imagerie médicale',
  'Bon de demande d''imagerie (radio, échographie, scanner, IRM).',
  'fr',
  'demande-imagerie',
  $TPL$# Demande d'Imagerie Médicale

**Dr. {{doctor_name}}**
{{doctor_specialty}} — {{doctor_city}}
Tél. : {{doctor_phone}}

---

**Patient :** {{patient_first_name}} {{patient_last_name}}
**Date de naissance :** {{patient_dob}}
**Date :** {{date_today}}

---

## Type d'examen demandé

- ☐ **Radiographie** — Région anatomique : [Zone]
- ☐ **Échographie** — Type : [Abdominale / Cardiaque / Ostéo-articulaire / Autre]
- ☐ **Scanner (TDM)** — Région : [Zone] — Injection de PDC : ☐ Oui ☐ Non
- ☐ **IRM** — Région : [Zone] — Séquences : [Séquences]
- ☐ **Autre** : [Préciser]

---

**Indication clinique :** [Description des symptômes / motif]

**Urgence :** ☐ Non  ☐ Oui
$TPL$,
  'prescription',
  true
),

-- 8. Lettre de référence spécialiste
(
  NULL,
  'Lettre de référence spécialiste',
  'Lettre adressée à un spécialiste pour orientation d''un patient.',
  'fr',
  'lettre-reference-specialiste',
  $TPL$# Lettre de Référence

**De :** Dr. {{doctor_name}}
{{doctor_specialty}} — {{doctor_city}}
Tél. : {{doctor_phone}}

**À :** Dr. [Nom du spécialiste]
[Spécialité]

**Date :** {{date_today}}

---

Cher Confrère / Chère Consœur,

Je vous adresse, pour avis spécialisé, mon patient(e) :

**{{patient_first_name}} {{patient_last_name}}**, né(e) le {{patient_dob}}.

---

### Motif de consultation

[Description du motif principal]

### Antécédents pertinents

[Antécédents médicaux, chirurgicaux, familiaux]

### Traitement en cours

[Liste des médicaments et posologies]

### Bilan déjà réalisé

[Résultats biologiques, imagerie, etc.]

---

Je reste à votre disposition pour tout renseignement complémentaire.

Confraternellement,

Dr. {{doctor_name}}
$TPL$,
  'letter',
  true
),

-- 9. Compte rendu de consultation
(
  NULL,
  'Compte rendu de consultation',
  'Structure complète d''un compte rendu médical post-consultation.',
  'fr',
  'compte-rendu-consultation',
  $TPL$# Compte Rendu de Consultation

**Médecin :** Dr. {{doctor_name}}
**Spécialité :** {{doctor_specialty}}
**Date :** {{date_today}}

---

**Patient :** {{patient_first_name}} {{patient_last_name}}
**Date de naissance :** {{patient_dob}}
**Groupe sanguin :** {{patient_blood_type}}

---

## Motif de consultation

[Motif principal]

## Anamnèse

[Histoire de la maladie, durée des symptômes, facteurs déclenchants]

## Examen clinique

- **État général :** [Bon / Moyen / Altéré]
- **Poids :** {{patient_weight_kg}} kg — **Taille :** {{patient_height_cm}} cm
- **Pression artérielle :** [PA] mmHg — **Fréquence cardiaque :** [FC] bpm
- **Température :** [T°C]
- **Examen spécifique :** [Résultats]

## Conclusion et diagnostic

[Diagnostic retenu]

## Plan thérapeutique

[Traitement prescrit / examens complémentaires / suivi]

---

*Document confidentiel — usage médical uniquement.*
$TPL$,
  'certificate',
  true
),

-- 10. Renouvellement ordonnance maladie chronique
(
  NULL,
  'Renouvellement – Maladie chronique',
  'Renouvellement simplifié pour patients avec traitement au long cours (HTA, diabète, etc.).',
  'fr',
  'renouvellement-maladie-chronique',
  $TPL$# Renouvellement d'Ordonnance — Traitement au Long Cours

**Dr. {{doctor_name}}**
{{doctor_specialty}} — {{doctor_city}}
Tél. : {{doctor_phone}}

---

**Patient :** {{patient_first_name}} {{patient_last_name}}
**Date de naissance :** {{patient_dob}}
**Date :** {{date_today}}

---

## Renouvellement du traitement habituel

> Pathologie(s) traitée(s) : [HTA / Diabète type 2 / Hypothyroïdie / Autre]

| Médicament | Dose | Posologie | Quantité |
|-----------|------|-----------|---------|
| [Médicament 1] | [Dose] | [1 cp/j matin] | [30 cp] |
| [Médicament 2] | [Dose] | [2 cp/j] | [60 cp] |

**Durée de prescription :** [1 mois / 3 mois / 6 mois]

---

## Surveillance recommandée

- ☐ Glycémie / HbA1c à [X] mois
- ☐ Bilan rénal à [X] mois
- ☐ Pression artérielle : auto-mesure hebdomadaire
- ☐ Prochain RDV : [Date]

---

*Traitement à ne pas interrompre sans avis médical. En cas d'effets secondaires, contacter le médecin.*
$TPL$,
  'prescription',
  true
)

ON CONFLICT (slug) WHERE is_official = true AND deleted_at IS NULL DO NOTHING;
