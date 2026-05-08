# Doktori — Multi-Providers Platform Spec

**Date** : 2026-05-08
**Status** : Spec exhaustive prête à exécuter — destinée à Achref
**Périmètre** : Étendre Doktori d'un annuaire médecins à une plateforme santé tunisienne complète (médecins + cliniques + laboratoires + pharmacies + paramédicaux), avec workflows patient / professionnel / admin pour chaque type.

---

## Table des matières

1. [Contexte & objectifs](#1-contexte--objectifs)
2. [Benchmark concurrents](#2-benchmark-concurrents-dabadoc--doctolib--tunisien)
3. [Acteurs et types de structures](#3-acteurs-et-types-de-structures)
4. [Schema DB cible](#4-schema-db-cible)
5. [Workflows patient](#5-workflows-patient)
6. [Workflows professionnel par type](#6-workflows-professionnel-par-type)
7. [Workflows admin](#7-workflows-admin)
8. [Routes API](#8-routes-api)
9. [Pages UI — inventaire complet](#9-pages-ui--inventaire-complet)
10. [Plan de migration depuis l'état actuel](#10-plan-de-migration-depuis-létat-actuel)
11. [Effort estimé](#11-effort-estimé--14-tracks)
12. [Risques & mitigations](#12-risques--mitigations)
13. [Hors scope V1 (V2/V3)](#13-hors-scope-v1)

---

## 1. Contexte & objectifs

### État actuel (2026-05-08)

Doktori est aujourd'hui :
- Annuaire **médecins** (~69 médecins actifs) + cliniques (multi-pratiques, secrétaires)
- Booking RDV cabinet, téléconsultation, visite domicile, SOS Docteur
- Coach IA (Kimi via OpenRouter), Paiements (Stripe + virement + cash + Flouci)
- Espace patient (recherche, RDV, dossier médical, ordonnances, parrainage)
- Espace médecin (agenda, patients, ordonnances, modèles, finances, conventions CNAM)
- Espace clinique (planning équipe, statistiques)
- Espace secrétaire (multi-médecins)
- Espace admin (14 waves : RBAC, audit, doctors, patients, appointments, reviews, finance, SOS, comms, clinics, catalog, RBAC UI, analytics, platform ops)

### Gaps majeurs identifiés

1. **Aucun support laboratoires d'analyses biologiques** — table 0, page 0
2. **Aucun support pharmacies** — table 0, page 0
3. **Pas de workflow Click & Collect ordonnance** patient → pharmacie
4. **Pas de booking analyses bio** patient → labo
5. **Pas d'upload résultats analyses** labo → patient
6. **Pas de ciblage paramédicaux** (sages-femmes, infirmiers, kiné, ostéo, psy non-médecin)
7. **Sous-pages SEO catégories** absentes (`/laboratoires/tunis`, `/pharmacies-de-garde/sfax`)
8. **Pas de module pharmacies de garde** (calendrier officiel régional)
9. **Pas de commande de médicament en ligne** (livraison)

### Objectifs V1

Étendre Doktori pour couvrir le parcours santé complet du patient tunisien :
- Trouver tout type de provider (médecin, labo, pharmacie, paramédical, clinique)
- Réserver / déposer une ordonnance / commander selon le type
- Recevoir résultats / médicaments / consultations dans un dossier unifié
- Permettre à chaque type de provider de gérer son activité depuis un espace pro adapté
- Permettre à l'admin Doktori de superviser tous les types depuis un back-office cohérent

### Non-objectifs V1

- Stock médicaments en temps réel (nécessite intégration ERP pharmacie)
- Téléconsultation labo→médecin direct (workflow trop complexe V1)
- API SEED CNAM (pas encore disponible côté CNAM, V2 prévu 2027)
- Mobile app — voir plan séparé `docs/superpowers/plans/2026-04-12-doktori-mobile-app.md`

---

## 2. Benchmark concurrents (Dabadoc + Doctolib + tunisien)

### 2.1 Dabadoc Connect Pro (Maroc) — 38 features auditées (mémoire 2026-05-03)

**Tarification** : 475-575 MAD/mois selon plan (Connect / Connect Pro avec salle d'attente + paiement).

#### Côté professionnel

| # | Feature | Statut Doktori | Action V1 |
|---|---|---|---|
| 1 | Templates ordonnances avec variables (`<first_name>`, `<reference_id>`, `<weight>`, etc.) | ✅ shipped (Templates ordonnances) | — |
| 2 | Dictaphone dans éditeur notes médicales | ❌ | V2 |
| 3 | DocShare — messagerie inter-médecins avec pièces jointes | ❌ | V1 (Wave 13 mobile) |
| 4 | Salles d'attente virtuelles (gestion file) | ❌ | V2 |
| 5 | Gestion paiements add-on | ✅ shipped (Phase 2 #2) | — |
| 6 | Catégories RDV colorées dans agenda | ❌ | V1 (mineur) |
| 7 | 4 vues agenda (Mois/Semaine/Jour/Planning) | partiel | V1 (compléter) |
| 8 | ID patient auto-généré format `DDMMYY-NNNN` | ❌ uses UUID | V1 (display only) |
| 9 | Profil cabinet avec Google Maps pin éditable | partiel (lat/lng existe) | V1 (UI map) |
| 10 | Compteurs dossier patient (Consultations / Absences / Notes / Ordonnances) | ❌ | V1 (mineur) |
| 11 | Boîte messages patient intégrée | partiel | V1 |
| 12 | Aide intégrée videos Wistia | ❌ | V2 |
| 13 | Tag "NOUVEAU" sur features récentes | ❌ | V1 (mineur) |
| 14 | Notifications desktop banner | ✅ shipped (push notifications) | — |
| 15 | PWA Installer bouton orange | partiel | V1 (compléter) |
| 16 | Stats since signup (RDV / SMS / Visites profil) | partiel (analytics admin) | V1 (médecin self-stats) |
| 17 | Champs patient enrichis (RIB, CIE, Diplôme, Cabinet présentation, Langues parlées) | partiel | V1 (compléter) |
| 18 | Indicateur "Profil 91% complet" | ❌ | V1 (mineur) |
| 19 | Lien profil short copiable (`https://www.dabadoc.com/d/JbXF`) | partiel (slug existe) | V1 (short URL) |
| 20 | Actions inline colorées dans listes | partiel | V1 (UX polish) |

#### Côté patient

| # | Feature | Statut Doktori | Action V1 |
|---|---|---|---|
| 21 | Recherche 4 onglets (Cabinet / Vidéo / Domicile / Clinique) | partiel (filtres existent) | V1 (UX hero) |
| 22 | Slots cliquables dans liste résultats | ✅ shipped | — |
| 23 | Carte Leaflet sticky droite avec pins clusterisés | partiel | V1 (compléter) |
| 24 | Tags actes médicaux (Cataracte, Lasik) | ❌ | V1 (long-tail SEO) |
| 25 | Mosaïque témoignages vidéo médecins | ❌ | V2 |
| 26 | Logos presse confiance (FT, Forbes) | ❌ | V1 (si placement obtenu) |
| 27 | Galerie photos cabinet | ✅ shipped v1.8.0 | — |
| 28 | Reviews 2 critères (Ponctualité + Évaluation globale) | ✅ shipped | — |
| 29 | Téléphone caché derrière "Afficher Tél" | ❌ | V1 (anti-scraping) |
| 30 | Cards produits modulaires (Mind/Live/Consult/Corporate) | partiel | V1 (homepage cards) |
| 31 | Bandeau RGPD/HIPAA bouclier | ❌ | V1 (loi tunisienne 2004-63) |
| 32 | Mascotte 404 illustrée | ❌ | V1 (mineur) |
| 33 | Breadcrumb SEO | partiel | V1 (compléter) |
| 34 | Recherches fréquentes en footer | ❌ | V1 (SEO statique) |
| 35 | Pages SEO ville×spé indexables | ✅ shipped | — |
| 36 | Badge ancienneté médecin ("10 years") | ❌ | V1 (mineur) |
| 37 | Multi-pays footer | ❌ | hors scope (Doktori = Tunisie only) |
| 38 | Bouton "Envoyer un message" alternatif au booking | partiel | V1 (compléter) |

### 2.2 Avantages Doktori vs Dabadoc (à conserver/améliorer)

- SOS Docteur (urgences/visites) — Dabadoc 404 sur `/sos-medecin`
- Visite à domicile dédiée — Dabadoc 404
- Système d'avis publics avec modération
- Multi-pratiques avec invitations secrétaires
- Vérification médecin avec workflow CNOM
- **Coach IA Kimi** — pas chez Dabadoc
- **Paiements multiples** (Stripe + virement + cash + Flouci) — Dabadoc CMI/WafaCash uniquement
- **Génération PDF Bulletin de Soins CNAM** auto — Dabadoc n'a pas ça (Maroc différent)

### 2.3 Doctolib — features à reprendre

- **Annuaire pharmacies de garde** (Doctolib propose pharmacies via partenariat)
- **Annuaire labos** avec créneaux prélèvement
- **Mes documents** unifiés (ordonnances + résultats + comptes-rendus)
- **Vaccination COVID/grippe** — créneaux dédiés (V2 si pertinent Tunisie)
- **Dossier médical partagé** entre médecins (avec consentement)

### 2.4 Spécificités tunisiennes à intégrer

- **CNAM Tunisie** — Tiers payant + Bulletin Soins (BS1) — déjà partiellement shipped
- **Pharmacies de garde** — calendrier officiel publié hebdo par les délégations régionales
- **Conventionnement** par caisse (CNAM, CNRPS, conventions privées)
- **Carte Labess** (e-CNAM) — généralisation 2027
- **Loi 2004-63 sur protection données** (équivalent RGPD allégé)
- **Multilingue FR/AR** obligatoire pour adoption mass-market

---

## 3. Acteurs et types de structures

### 3.1 Acteurs (personas)

| Persona | Description | Auth | Espace dédié |
|---|---|---|---|
| Patient | Utilisateur final, peut être membre de famille | Phone OTP / email+pw | `/mon-espace` |
| Médecin | Praticien CNOM-vérifié | email+pw + 2FA optional | `/dashboard` |
| Secrétaire | Personnel cabinet médecin | email+pw | `/secretaire` |
| Clinique | Établissement multi-médecins | email+pw | `/clinique` |
| **Laboratoire** | Établissement d'analyses bio | email+pw | `/laboratoire` (NOUVEAU) |
| **Pharmacie** | Officine pharmaceutique | email+pw | `/pharmacie` (NOUVEAU) |
| **Paramédical** | Kiné/sage-femme/infirmier/ostéo/psy | email+pw | `/paramedical` (NOUVEAU, ou réutiliser `/dashboard` médecin avec rôle différencié) |
| Admin Doktori | Équipe interne | NextAuth + RBAC roles | `/admin` |

### 3.2 Types de structures (entities)

| Type | Table | Champs spécifiques | Booking | Workflow particulier |
|---|---|---|---|---|
| **Doctor** | `doctors` (existant) | CNOM, spécialité, conventionnement | RDV cabinet/visio/domicile | Ordonnance, BS CNAM |
| **Clinic** | `clinics` (existant) | type (privée/publique), agréments | Multi-médecins | Planning équipe |
| **Laboratory** | `laboratories` (NEW) | accréditations (ISO 15189), agréments CNAM | Créneaux prélèvement (par tube/type) | Réception ordonnance, upload résultats |
| **Pharmacy** | `pharmacies` (NEW) | type (officine/grossiste), garde-rotation | Click&Collect, livraison | Réception ordonnance, préparation, dispensation |
| **Paramedical** | `paramedicals` (NEW) ou rôle dans `doctors` | profession (kiné/sage-femme/...), diplôme, ordre | RDV cabinet/domicile | Suivi long-terme (cures kiné) |

### 3.3 Décision : table dédiée vs polymorphisme

**Option A — Table par type** (recommandée V1)
- `doctors`, `clinics`, `laboratories`, `pharmacies`, `paramedicals` séparées
- Champs communs partagés (name, slug, email, phone, address, photoUrl, etc.) mais pas via héritage SQL
- Plus simple à query, Drizzle joins clairs, RLS par type plus facile
- Coût : duplication des champs communs

**Option B — Table unique `providers` polymorphique avec discriminant `type`**
- Plus DRY mais joints fastidieux
- Migration depuis `doctors` existant compliquée
- Indexes par type à gérer

**Décision V1 : Option A** — table par type, avec une vue SQL `all_providers_v` UNION ALL pour la recherche cross-type unifiée.

---

## 4. Schema DB cible

### 4.1 Nouvelles tables

#### `laboratories`

```sql
CREATE TABLE laboratories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(30),
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  photo_url TEXT,
  cabinet_gallery_urls JSONB DEFAULT '[]'::jsonb,
  bio TEXT,
  opening_hours JSONB,  -- {mon: [{open: '08:00', close: '18:00'}], tue: ...}
  -- Spécifique labo
  iso15189_accredited BOOLEAN DEFAULT FALSE,
  iso15189_number VARCHAR(50),
  cnam_conventioned BOOLEAN DEFAULT FALSE,
  cnam_convention_number VARCHAR(50),
  bio_fields JSONB DEFAULT '[]'::jsonb,  -- ["hématologie", "biochimie", "microbiologie", ...]
  home_collection BOOLEAN DEFAULT FALSE,  -- prélèvement à domicile
  -- Verification + status
  verification_status VARCHAR(20) DEFAULT 'pending',  -- pending | approved | rejected
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  -- Stats agrégées
  rating NUMERIC(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### `laboratory_analyses` (catalogue d'analyses proposées par labo)

```sql
CREATE TABLE laboratory_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  -- Code de référence (ex NABM en France, code CNAM en Tunisie)
  code VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),  -- hématologie | biochimie | microbiologie | hormonologie | sérologie | ...
  sample_type VARCHAR(50),  -- sang | urine | selles | prélèvement vaginal | ...
  fasting_required BOOLEAN DEFAULT FALSE,
  duration_hours INTEGER,  -- temps de rendu résultats
  fee INTEGER,  -- millimes
  cnam_reimbursable BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX laboratory_analyses_lab_idx ON laboratory_analyses(laboratory_id);
CREATE INDEX laboratory_analyses_category_idx ON laboratory_analyses(category);
```

#### `laboratory_appointments`

```sql
CREATE TABLE laboratory_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  -- Liée optionnellement à une ordonnance médicale source
  prescribing_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  prescription_id UUID,  -- FK lazy vers prescriptions ou patient_attachments
  -- Créneau
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending | confirmed | sample_taken | analysed | results_ready | delivered | cancelled
  type VARCHAR(20) DEFAULT 'on_site',  -- on_site | home_collection
  -- Liste des analyses demandées
  requested_analyses JSONB,  -- [{code: 'NFS', name: 'Numération formule sanguine', fee: 25000}, ...]
  total_fee INTEGER,
  -- CNAM
  cnam_number VARCHAR(30),
  cnam_third_party BOOLEAN DEFAULT FALSE,  -- tiers payant
  -- Résultats
  results_pdf_url TEXT,  -- R2 URL
  results_uploaded_at TIMESTAMPTZ,
  results_validated_by_lab_user_id UUID,
  notes TEXT,
  -- Paiement
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_amount INTEGER,
  payment_provider VARCHAR(20),
  payment_method VARCHAR(30),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX lab_appt_lab_date_idx ON laboratory_appointments(laboratory_id, starts_at);
CREATE INDEX lab_appt_patient_idx ON laboratory_appointments(patient_id);
CREATE INDEX lab_appt_status_idx ON laboratory_appointments(status);
```

#### `pharmacies`

```sql
CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(30),
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  photo_url TEXT,
  cabinet_gallery_urls JSONB DEFAULT '[]'::jsonb,
  bio TEXT,
  opening_hours JSONB,
  -- Pharmacie-spécifique
  type VARCHAR(20) DEFAULT 'officine',  -- officine | hospitaliere | grossiste
  pharmacist_name VARCHAR(255) NOT NULL,
  pharmacist_diploma_url TEXT,
  cnam_conventioned BOOLEAN DEFAULT FALSE,
  cnam_convention_number VARCHAR(50),
  delivery_available BOOLEAN DEFAULT FALSE,
  delivery_radius_km INTEGER,
  delivery_fee INTEGER,  -- millimes
  click_collect_available BOOLEAN DEFAULT TRUE,
  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending',
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  -- Stats
  rating NUMERIC(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### `pharmacy_garde_calendar` (garde rotation officielle)

```sql
CREATE TABLE pharmacy_garde_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  garde_date DATE NOT NULL,
  garde_type VARCHAR(20) NOT NULL,  -- nuit | jour_ferie | nuit_ferie | weekend
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(50),  -- "delegation_tunis" | "manual_admin" | etc
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX pharmacy_garde_date_idx ON pharmacy_garde_calendar(garde_date);
CREATE INDEX pharmacy_garde_pharmacy_idx ON pharmacy_garde_calendar(pharmacy_id);
```

#### `prescription_orders` (ordonnance déposée à pharmacie)

```sql
CREATE TABLE prescription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  prescribing_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  -- Source ordonnance
  prescription_pdf_url TEXT NOT NULL,  -- R2 URL (patient upload OR doctor-generated)
  prescription_uploaded_by VARCHAR(20) DEFAULT 'patient',  -- patient | doctor | secretary
  -- Workflow
  status VARCHAR(30) DEFAULT 'submitted',  -- submitted | accepted | preparing | ready | delivered | rejected | expired
  reject_reason TEXT,
  -- Click & Collect vs livraison
  fulfillment_type VARCHAR(20) NOT NULL,  -- click_collect | delivery | in_store_pickup
  -- Livraison
  delivery_address TEXT,
  delivery_phone VARCHAR(30),
  delivery_eta TIMESTAMPTZ,
  delivery_courier_name VARCHAR(255),
  delivered_at TIMESTAMPTZ,
  -- Préparation
  prepared_by_user_id UUID,
  prepared_at TIMESTAMPTZ,
  -- Coût
  total_amount INTEGER,  -- millimes
  cnam_third_party BOOLEAN DEFAULT FALSE,
  cnam_amount INTEGER,
  patient_amount INTEGER,
  -- Communication
  patient_notes TEXT,
  pharmacy_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX prescription_orders_pharmacy_idx ON prescription_orders(pharmacy_id);
CREATE INDEX prescription_orders_patient_idx ON prescription_orders(patient_id);
CREATE INDEX prescription_orders_status_idx ON prescription_orders(status);
```

#### `paramedicals` (sages-femmes, infirmiers, kiné, ostéo, psy non-médecin)

```sql
CREATE TABLE paramedicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(30),
  -- Profession
  profession VARCHAR(50) NOT NULL,  -- sage_femme | infirmier | kine | osteo | psychologue | dieteticien | orthophoniste | podologue
  diploma_url TEXT,
  professional_order VARCHAR(100),  -- ordre professionnel d'inscription
  professional_order_number VARCHAR(50),
  -- Cabinet (réutilise pattern doctors)
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  photo_url TEXT,
  cabinet_gallery_urls JSONB DEFAULT '[]'::jsonb,
  bio TEXT,
  consultation_fee INTEGER,
  consultation_mode VARCHAR(20) DEFAULT 'cabinet_only',
  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending',
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  rating NUMERIC(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX paramedicals_profession_idx ON paramedicals(profession);
CREATE INDEX paramedicals_city_idx ON paramedicals(city);
```

### 4.2 Vue SQL unifiée (recherche cross-type)

```sql
CREATE OR REPLACE VIEW all_providers_v AS
SELECT
  id, slug, 'doctor' AS type, name, city, address, latitude, longitude,
  photo_url, rating, rating_count, is_active, is_visible, verification_status,
  specialty AS sub_category
FROM doctors
UNION ALL
SELECT
  id, slug, 'paramedical' AS type, name, city, address, latitude, longitude,
  photo_url, rating, rating_count, is_active, is_visible, verification_status,
  profession AS sub_category
FROM paramedicals
UNION ALL
SELECT
  id, slug, 'laboratory' AS type, name, city, address, latitude, longitude,
  photo_url, rating, rating_count, is_active, is_visible, verification_status,
  NULL::varchar AS sub_category
FROM laboratories
UNION ALL
SELECT
  id, slug, 'pharmacy' AS type, name, city, address, latitude, longitude,
  photo_url, rating, rating_count, is_active, is_visible, verification_status,
  NULL::varchar AS sub_category
FROM pharmacies
UNION ALL
SELECT
  id, slug, 'clinic' AS type, name, city, address, latitude, longitude,
  photo_url, NULL::numeric AS rating, NULL::integer AS rating_count,
  is_active, is_visible, verification_status,
  NULL::varchar AS sub_category
FROM clinics;
```

### 4.3 Modifications tables existantes

#### `patients` — ajouts dossier

```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_laboratory_id UUID REFERENCES laboratories(id) ON DELETE SET NULL;
```

#### `prescriptions` (existante) — élargissement

Ajouter pour permettre le tracking d'envoi :

```sql
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS sent_to_pharmacy_order_id UUID REFERENCES prescription_orders(id);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS sent_to_laboratory_appointment_id UUID REFERENCES laboratory_appointments(id);
```

### 4.4 Index cross-type pour recherche performante

```sql
-- Vue Meilisearch consolidée pour la recherche unifiée /recherche
CREATE INDEX laboratories_city_idx ON laboratories(city);
CREATE INDEX laboratories_search_idx ON laboratories USING GIN (to_tsvector('french', name || ' ' || COALESCE(bio, '')));

CREATE INDEX pharmacies_city_idx ON pharmacies(city);
CREATE INDEX pharmacies_search_idx ON pharmacies USING GIN (to_tsvector('french', name || ' ' || COALESCE(bio, '')));
```

---

## 5. Workflows patient

### 5.1 Découverte / recherche

#### W1 — Recherche unifiée

Sur `/recherche`, ajouter un sélecteur de type avec 6 onglets :

```
[Médecins] [Paramédicaux] [Laboratoires] [Pharmacies] [Cliniques] [Tout]
```

Sous chaque onglet, filtres pertinents :
- **Médecins** : spécialité, ville, mode consultation, conventionnement, langue
- **Paramédicaux** : profession (kiné/sage-femme/...), ville
- **Laboratoires** : ville, accréditation ISO 15189, prélèvement domicile, conventionné CNAM
- **Pharmacies** : ville, garde aujourd'hui (toggle), livraison disponible
- **Cliniques** : type, ville, agréments

#### W2 — Pages SEO ville × type

URL pattern : `/{type}/{ville}` (déjà actif pour médecins via `/[ville]/[specialite]`).

Nouvelles pages :
- `/laboratoires` — annuaire labos Tunisie
- `/laboratoires/{ville}` — labos d'une ville
- `/laboratoires/{ville}/{slug}` — fiche labo
- `/pharmacies` — annuaire pharmacies
- `/pharmacies/{ville}` — pharmacies d'une ville
- `/pharmacies-de-garde` — pharmacies de garde aujourd'hui (toutes villes)
- `/pharmacies-de-garde/{ville}` — pharmacies de garde dans une ville
- `/pharmacies/{ville}/{slug}` — fiche pharmacie
- `/paramedicaux` — annuaire paramédicaux
- `/paramedicaux/{profession}` — par profession (kiné, sage-femme, etc.)
- `/paramedicaux/{profession}/{ville}` — par profession + ville

#### W3 — Géolocalisation

- Bouton "Près de moi" (HTML5 Geolocation) dans la barre de recherche
- Sort by `ST_Distance` (PostGIS déjà installé)
- Carte Leaflet sticky droite avec markers clusterisés (déjà partial)

#### W4 — Ordre de tri par défaut

1. Pertinence (Meilisearch ranking)
2. Distance si géoloc activée
3. Note moyenne (descending)
4. Nombre d'avis (tie-breaker)

### 5.2 Réservation analyses bio (laboratoire)

#### W5 — Booking créneau prélèvement

Sur fiche labo `/laboratoires/{ville}/{slug}` :
- Onglets : "Au labo" / "À domicile" (si home_collection)
- Calendrier des créneaux disponibles (par tranches de 15 min, configurable par labo)
- Patient sélectionne un créneau

Étape 2 :
- Liste des analyses demandées (search dans le catalogue du labo)
- OU upload d'une ordonnance PDF (auto-parsing futur, V2)
- OU "J'ai déjà mon ordonnance papier" → labo verra à l'arrivée

Étape 3 :
- CNAM : matricule + tiers payant ?
- Total estimé (sum des fees)
- Paiement (Stripe / virement / cash sur place)

Étape 4 :
- Confirmation + email/SMS avec QR code à présenter au labo
- Rappel jeûne si nécessaire (24h avant si analyse fasting_required)

#### W6 — Réception résultats

- Notification push + email "Vos résultats sont disponibles"
- Patient consulte sur `/mon-espace/dossier-medical/analyses/{appointmentId}`
- Téléchargement PDF résultats
- Partage avec un médecin (sélecteur dans dossier patient → "Envoyer à Dr X")
  → ajoute dans `patient_attachments` + notif au médecin

### 5.3 Dépôt ordonnance pharmacie

#### W7 — Click & Collect

Sur fiche pharmacie `/pharmacies/{ville}/{slug}` :
- Bouton "Déposer mon ordonnance"

Étape 1 :
- Source ordonnance : (a) Choisir parmi mes ordonnances Doktori (filtre `prescriptions` du patient) | (b) Upload PDF/photo
- Validations : taille ≤5 MB, type webp/jpeg/png/pdf

Étape 2 :
- Mode : Click & Collect (retrait pharmacie) | Livraison (si disponible)
- Si livraison : adresse + téléphone + window de livraison
- Notes pour pharmacien (allergie, etc.)

Étape 3 :
- Tiers payant CNAM ? (toggle, si patient a `cnamNumber`)
- Récap

Étape 4 :
- Notification SMS "Votre ordonnance a été reçue par {pharmacie}"
- Tracking statut sur `/mon-espace/ordonnances/{orderId}` : reçue → préparée → prête / livrée

#### W8 — Suivi commande

Statuts visibles :
- `submitted` (envoyée)
- `accepted` (pharmacien a vu)
- `preparing` (en préparation)
- `ready` (prête au retrait — notification push)
- `delivered` (livrée — confirmation)
- `rejected` (refusée — raison affichée)

### 5.4 Pharmacies de garde

#### W9 — Trouver une pharmacie de garde

URL `/pharmacies-de-garde` → liste cards :
- Filtre ville (default = ville du patient si geoloc)
- Date selector (default = aujourd'hui, peut voir week ahead)
- Liste pharmacies avec garde active, triées par distance
- Pour chacune : nom, adresse, téléphone, horaires de garde, bouton "Itinéraire"

Source données : `pharmacy_garde_calendar`. Backfill admin manuel + scraping OPF (Ordre des Pharmaciens) hebdo.

### 5.5 Dossier médical unifié

#### W10 — Vue agrégée

Sur `/mon-espace/dossier-medical`, agréger :

- **Consultations** (existant — appointments avec status='completed')
- **Ordonnances** (existant — prescriptions)
- **Analyses bio** (NEW — laboratory_appointments avec results_pdf_url IS NOT NULL)
- **Médicaments commandés** (NEW — prescription_orders avec status='delivered')
- **Vaccinations** (existant ?)
- **Allergies** (existant — patient_medical_profile)
- **Antécédents** (existant)

Vue chronologique (timeline reverse), filtres par type, export PDF "Mon dossier médical".

### 5.6 Coach IA enrichi

Le Coach IA actuel (Kimi) oriente vers spécialités médicales. **Étendre** :
- Si symptôme nécessite analyse bio → suggérer également labo proche
- Si médicament en vente libre suggéré → "Trouver une pharmacie ouverte près de moi"
- Si sage-femme/kiné applicable → suggérer paramédical de la profession

Pas d'auto-routing — toujours suggestion de spécialité, le patient choisit.

---

## 6. Workflows professionnel par type

### 6.1 Médecin (existant — extensions)

#### M1 — Ordonnance étendue : envoi direct

Dans le module "Ordonnances" du médecin, après création :

- Bouton "Envoyer à une pharmacie" → sélecteur des pharmacies favorites du patient OR autocomplete
- Bouton "Envoyer à un labo" (pour bilans bio) → sélecteur labos favoris

Au clic, crée respectivement :
- `prescription_orders` (status=submitted, fulfillment_type=click_collect par default)
- `laboratory_appointments` (status=pending, requested_analyses pré-remplies depuis l'ordonnance parsée)

Notification push au patient + à la pharmacie/labo.

#### M2 — Carnet d'adresses pharmacies/labos partenaires

Espace médecin nouvelle page `/dashboard/partenaires` :
- Liste des pharmacies/labos avec qui le médecin envoie le plus
- Configuration : pharmacies à proposer en priorité aux patients

#### M3 — Réception résultats analyses

Page `/dashboard/resultats-analyses` :
- Liste des résultats labo qu'un patient a partagé avec lui
- Filtre par patient, par date, par analyse
- Action "Marquer comme lu", "Ajouter au dossier patient"

### 6.2 Laboratoire (NEW)

#### L1 — Espace `/laboratoire`

Layout sidebar similaire au `/dashboard` médecin :

```
- Tableau de bord (KPIs : RDV à venir, analyses en cours, résultats à uploader)
- Agenda
  - Vue jour/semaine/mois avec créneaux disponibles
  - Ajouter un créneau / bloquer un créneau
- Patients
  - Liste des patients ayant des RDV
  - Recherche par nom/téléphone
- Catalogue
  - Liste des analyses proposées + tarifs
  - Ajouter/modifier une analyse
- Résultats à uploader
  - File de RDV "sample_taken" en attente d'upload
- Conventions
  - CNAM convention details + management
- Statistiques
  - RDV mensuels, revenus, taux honoré
- Profil & paramètres
  - Photos labo, horaires, accréditations
- Equipe
  - Comptes utilisateurs (techniciens, secrétaire labo)
```

#### L2 — Workflow réception RDV

1. Patient prend RDV → status='pending'
2. Labo voit dans son agenda + reçoit notification
3. Patient arrive → labo clique "Marquer arrivé" → status='confirmed'
4. Prélèvement effectué → status='sample_taken'
5. Analyses faites → labo upload PDF résultats → status='analysed' puis 'results_ready'
6. Patient reçoit notif "Résultats disponibles"
7. Si patient a partagé avec un médecin → médecin reçoit notif aussi

#### L3 — Tiers payant CNAM (labo)

Si `cnam_third_party=true` sur le RDV :
- Labo génère feuille de soins labo (similaire à BS1 médecin mais codes NABM)
- Upload sur portail e-CNAM ou dépôt physique
- Status RDV évolue : `cnam_submitted` → `cnam_approved` / `cnam_rejected`

### 6.3 Pharmacie (NEW)

#### P1 — Espace `/pharmacie`

```
- Tableau de bord (commandes en attente, livraisons en cours, stats)
- Commandes
  - Vue file : Reçues / En préparation / Prêtes / Livrées / Refusées
  - Action sur chaque card : Accepter, Préparer, Prête, Livrée, Refuser
  - Filtre par patient, par date
- Garde
  - Calendrier des gardes assignées
  - Toggle "Pharmacie de garde aujourd'hui" si applicable
- Livraison
  - Liste des commandes à livrer
  - Assignation à un livreur (interne ou externe partenaire)
- Stats
  - Commandes/jour, panier moyen, taux acceptation
- Profil
  - Photos, horaires, services (livraison ou non, rayon, fee)
- Equipe
  - Comptes utilisateurs (préparateurs, caissiers)
```

#### P2 — Workflow Click & Collect

1. Patient envoie ordonnance → status='submitted', notification pharmacien
2. Pharmacien ouvre la commande → status='accepted' (auto-set lors de l'ouverture)
3. Pharmacien prépare → status='preparing' (manuel via bouton)
4. Si médicament manquant → option "Demander substitution" qui notifie le patient
5. Préparation finie → status='ready' (notif push patient "Votre commande est prête")
6. Patient vient au comptoir → status='delivered' (action pharmacien)

#### P3 — Workflow livraison

Étapes 1-4 idem Click & Collect, puis :

5. Status='ready' + livraison sélectionnée → assignation livreur
6. Livreur récupère → status='out_for_delivery' (avec ETA)
7. Patient reçoit → status='delivered'

V1 : livraison interne (la pharmacie a son propre livreur, statuts gérés à la main).
V2 : intégration partenaires logistiques (Yassir, Glovo Tunisia ?).

#### P4 — Tiers payant CNAM (pharmacie)

Si `cnam_third_party=true` :
- Pharmacien valide auprès de la CNAM via leur portail
- Trois cas : (a) accepté → patient paie ticket modérateur ; (b) refusé → patient paie 100% ; (c) en attente → préparation but pickup possible
- Status orderable indépendamment via `cnam_status` (pending / approved / rejected)

### 6.4 Paramédical (NEW)

Réutilise massivement le pattern médecin (`/dashboard`) avec :
- Profession au lieu de spécialité
- Pas de prescription (sauf sage-femme)
- Pas de Coach IA dans leur flow patient (le patient consulte un paramédical pour suivi, pas pour orientation)

Espace pro `/paramedical` mirror de `/dashboard` avec ces différences cosmétiques.

### 6.5 Clinique (existant — extensions)

#### C1 — Multi-providers dans clinique

Une clinique peut désormais héberger non seulement des médecins mais aussi :
- Un labo (souvent sur place)
- Une pharmacie (rare)
- Des paramédicaux

Donc table `clinic_providers` (m2m) avec :

```sql
CREATE TABLE clinic_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  provider_type VARCHAR(20) NOT NULL,  -- doctor | laboratory | pharmacy | paramedical
  provider_id UUID NOT NULL,  -- polymorphic — FK by provider_type
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

Page `/clinique/providers` pour gérer les associations (invitations, retraits).

---

## 7. Workflows admin

### 7.1 Vérification multi-types

Page `/admin/validation` étendue :

- Onglets : Médecins / Paramédicaux / Cliniques / Laboratoires / Pharmacies
- Pour chaque type, liste des `verification_status='pending'`
- Action "Vérifier" qui ouvre le détail :
  - Documents fournis (diplôme, agrément, ISO 15189, ordre pro, etc.)
  - Bouton "Approuver" / "Rejeter avec raison"
- Audit log à chaque action

### 7.2 Catalogue admin étendu

`/admin/catalog` :

- Sous-pages existantes : spécialités, villes, assurances (NEW), motifs (NEW), synonymes (NEW)
- Sous-pages NEW :
  - **Analyses bio standardisées** (codes NABM, descriptions, catégories) — utilisé par les labos comme référence
  - **Médicaments référence DCI** — autocomplete pour ordonnances (utopique sans BdD pharmaceutique tunisienne ; commencer par seed top 200 médicaments)
  - **Pharmacies de garde** : import calendrier officiel par délégation régionale (CSV upload)

### 7.3 Modération étendue

Avis sur tous les types : médecins (existant), labos (NEW), pharmacies (NEW), paramédicaux (NEW).

Page `/admin/reviews` filtrable par type provider.

### 7.4 Stats globales

`/admin/analytics` :

- KPIs par type : nombre actifs, RDV/commandes/mois, revenus
- Conversion : recherche → fiche → réservation (par type)
- Top providers (par volume)
- Heatmap géographique

### 7.5 Comms

Étendre `/admin/communications` :

- Templates SMS/email/push par type provider (relance RDV labo, notification pharmacie de garde, etc.)
- Broadcast ciblé : "patients de Sfax avec ordonnance non livrée depuis 7 jours"

### 7.6 Finance

Étendre `/admin/finance` :

- Revenus consolidés par type
- Commission Doktori par type (configurable per type via `platform_settings`)
- Refunds par type
- Stripe webhook gère tous les types (extension du schema actuel)

### 7.7 Système

`/admin/systeme` :

- Health checks pour chaque pipeline (Meilisearch index par type, etc.)
- Calendrier garde pharmacies — last sync date

### 7.8 Onboarding

Nouveau flow `/inscription/{type}` :

- `/inscription/medecin` (existant)
- `/inscription/laboratoire` (NEW)
- `/inscription/pharmacie` (NEW)
- `/inscription/paramedical` (NEW)
- `/inscription/clinique` (existant)

Chaque flow demande les documents spécifiques au type.

---

## 8. Routes API

### 8.1 Patient — recherche & booking

```
GET  /api/search?type=&city=&q=&lat=&lng=&...
GET  /api/laboratories?city=&analyses=
GET  /api/laboratories/[slug]
POST /api/laboratories/[id]/appointments
GET  /api/laboratories/[id]/availability?date=
GET  /api/pharmacies?city=&garde_today=&delivery=
GET  /api/pharmacies/[slug]
POST /api/pharmacies/[id]/orders         # patient envoie ordonnance
GET  /api/paramedicals?profession=&city=
GET  /api/paramedicals/[slug]
POST /api/paramedicals/[id]/appointments
```

### 8.2 Laboratoire — espace pro

```
GET  /api/laboratoire/me
PATCH /api/laboratoire/profile
GET  /api/laboratoire/appointments?status=&from=&to=
PATCH /api/laboratoire/appointments/[id]    # status transitions
POST /api/laboratoire/appointments/[id]/results-upload  # multipart PDF → R2
GET  /api/laboratoire/analyses              # catalogue
POST /api/laboratoire/analyses
PATCH /api/laboratoire/analyses/[id]
DELETE /api/laboratoire/analyses/[id]
GET  /api/laboratoire/stats?period=
```

### 8.3 Pharmacie — espace pro

```
GET  /api/pharmacie/me
PATCH /api/pharmacie/profile
GET  /api/pharmacie/orders?status=&from=
PATCH /api/pharmacie/orders/[id]            # status transitions
POST /api/pharmacie/orders/[id]/reject
POST /api/pharmacie/orders/[id]/assign-courier
GET  /api/pharmacie/garde
PATCH /api/pharmacie/garde/[id]
GET  /api/pharmacie/stats
```

### 8.4 Paramédical — espace pro

Similaire au médecin sur structure (`/api/paramedical/...`) avec adaptations.

### 8.5 Admin — multi-types

```
GET  /api/admin/laboratories
PATCH /api/admin/laboratories/[id]/verify
GET  /api/admin/pharmacies
PATCH /api/admin/pharmacies/[id]/verify
GET  /api/admin/paramedicals
PATCH /api/admin/paramedicals/[id]/verify
GET  /api/admin/garde-calendar               # vue admin du calendrier garde
POST /api/admin/garde-calendar/import        # CSV upload
GET  /api/admin/catalog/medicaments
POST /api/admin/catalog/medicaments
GET  /api/admin/catalog/analyses             # catalogue référence NABM
POST /api/admin/catalog/analyses
```

Toutes les routes mutation utilisent `withAdminAudit` (commit 424b751).

### 8.6 Search engine (Meilisearch)

Indices Meilisearch :
- `doctors` (existant)
- `clinics` (existant)
- `laboratories` (NEW)
- `pharmacies` (NEW)
- `paramedicals` (NEW)

Endpoint `POST /api/search/sync` (existant) à étendre pour réindexer les 3 nouveaux indices.

Endpoint `/api/search?type=...` consulte le bon index selon le type.

---

## 9. Pages UI — inventaire complet

### 9.1 Pages publiques

| URL | Description | Type | Existant |
|---|---|---|---|
| `/` | Homepage | Public | ✅ |
| `/recherche` | Recherche unifiée multi-types | Public | ✅ extension |
| `/medecin/[slug]` | Fiche médecin | Public | ✅ |
| `/[ville]/[specialite]` | SEO ville × spécialité | Public | ✅ |
| `/laboratoires` | Annuaire labos | Public | NEW |
| `/laboratoires/[ville]` | Labos par ville | Public | NEW |
| `/laboratoires/[ville]/[slug]` | Fiche labo + booking | Public | NEW |
| `/pharmacies` | Annuaire pharmacies | Public | NEW |
| `/pharmacies/[ville]` | Pharmacies par ville | Public | NEW |
| `/pharmacies/[ville]/[slug]` | Fiche pharmacie + Click&Collect | Public | NEW |
| `/pharmacies-de-garde` | Pharmacies de garde aujourd'hui | Public | NEW |
| `/pharmacies-de-garde/[ville]` | Garde par ville | Public | NEW |
| `/paramedicaux` | Annuaire paramédicaux | Public | NEW |
| `/paramedicaux/[profession]` | Par profession | Public | NEW |
| `/paramedicaux/[profession]/[ville]` | Profession × ville | Public | NEW |
| `/paramedicaux/[profession]/[ville]/[slug]` | Fiche paramédical | Public | NEW |
| `/inscription/[type]` | Onboarding pro par type | Public | NEW (étendre existant) |

### 9.2 Espace patient

| URL | Description | Existant |
|---|---|---|
| `/mon-espace` | Dashboard patient | ✅ |
| `/mes-rdv` | RDV médecin + labo + paramédical (unifié) | extension |
| `/mes-ordonnances` | Ordonnances + commandes pharmacie | NEW |
| `/mes-analyses` | RDV labos + résultats | NEW |
| `/mes-pharmacies-favorites` | Gestion favoris | NEW |
| `/mes-labos-favoris` | Idem | NEW |
| `/dossier-medical` | Vue unifiée | extension |

### 9.3 Espace médecin (existant — extensions)

| URL | Description | Action |
|---|---|---|
| `/dashboard/resultats-analyses` | Résultats labos partagés | NEW |
| `/dashboard/partenaires` | Pharmacies/labos favoris | NEW |
| `/dashboard/ordonnances` | Avec bouton "Envoyer à pharmacie/labo" | extension |

### 9.4 Espace laboratoire (NEW)

```
/laboratoire/dashboard
/laboratoire/agenda
/laboratoire/agenda/[appointmentId]
/laboratoire/patients
/laboratoire/patients/[id]
/laboratoire/catalogue              # analyses proposées
/laboratoire/catalogue/[analyseId]
/laboratoire/resultats              # à uploader
/laboratoire/conventions
/laboratoire/statistiques
/laboratoire/profil
/laboratoire/equipe
/laboratoire/parametres
```

### 9.5 Espace pharmacie (NEW)

```
/pharmacie/dashboard
/pharmacie/commandes
/pharmacie/commandes/[orderId]
/pharmacie/garde
/pharmacie/livraison
/pharmacie/livraison/[orderId]
/pharmacie/statistiques
/pharmacie/profil
/pharmacie/equipe
/pharmacie/parametres
```

### 9.6 Espace paramédical (NEW)

Mirror de `/dashboard` médecin avec adaptations cosmétiques.

### 9.7 Espace clinique (extensions)

| URL | Description | Action |
|---|---|---|
| `/clinique/providers` | Médecins + labos + pharmacies + paramédicaux associés | NEW |
| `/clinique/providers/inviter` | Workflow invitation | NEW |

### 9.8 Espace admin (extensions)

| URL | Description | Action |
|---|---|---|
| `/admin/laboratoires` | Liste + verification | NEW |
| `/admin/laboratoires/[id]` | Détail + verification | NEW |
| `/admin/pharmacies` | Idem | NEW |
| `/admin/pharmacies/[id]` | Idem | NEW |
| `/admin/paramedicaux` | Idem | NEW |
| `/admin/paramedicaux/[id]` | Idem | NEW |
| `/admin/catalog/analyses` | Catalogue référence NABM | NEW |
| `/admin/catalog/medicaments` | Catalogue DCI | NEW |
| `/admin/catalog/garde-calendar` | Import + édition calendrier garde | NEW |
| `/admin/validation` | Onglets multi-types | extension |
| `/admin/finance/[type]` | Drill-down par type provider | extension |
| `/admin/communications/templates` | Templates par type | extension |

---

## 10. Plan de migration depuis l'état actuel

### 10.1 Phase 1 — Fondations DB (1-2 jours)

1. Migrations `0091_laboratories.sql`, `0092_laboratory_analyses.sql`, `0093_laboratory_appointments.sql`
2. Migrations `0094_pharmacies.sql`, `0095_pharmacy_garde.sql`, `0096_prescription_orders.sql`
3. Migrations `0097_paramedicals.sql`, `0098_clinic_providers.sql`
4. Migration `0099_patient_preferred_providers.sql` (preferred_pharmacy_id, preferred_laboratory_id)
5. Vue SQL `0100_all_providers_view.sql`
6. Drizzle schema entries pour les 7 nouvelles tables + types
7. Apply via `apply-migrations-prod.sh`

### 10.2 Phase 2 — NextAuth + onboarding (2 jours)

1. Étendre `lib/auth.ts` avec providers : `laboratory-credentials`, `pharmacy-credentials`, `paramedical-credentials`
2. Pages `/inscription/laboratoire`, `/inscription/pharmacie`, `/inscription/paramedical`
3. Pages login `/laboratoire-login`, `/pharmacie-login`, `/paramedical-login`
4. Middleware route guards (étendre `route-groups.ts`)
5. Email verification + verification queue admin

### 10.3 Phase 3 — Espaces pros (~10 jours)

Par ordre de priorité :

1. **Laboratoire** (3 jours) — agenda + catalogue analyses + RDV + résultats upload
2. **Pharmacie** (3 jours) — workflow commandes + garde + livraison
3. **Paramédical** (1 jour) — clone simplifié médecin
4. **Clinique extensions** (1 jour) — multi-providers
5. **Médecin extensions** (1 jour) — partenaires + envoi direct ordonnance
6. **Pages publiques** (1 jour) — fiches & annuaires

### 10.4 Phase 4 — Patient (3 jours)

1. Recherche unifiée multi-types (1 jour)
2. Booking labo + dépôt pharmacie (1 jour)
3. Dossier médical unifié + dossiers spéciaux (1 jour)

### 10.5 Phase 5 — Admin (3 jours)

1. Validation multi-types
2. Catalogues étendus (analyses, médicaments, garde)
3. Stats consolidées
4. Comms templates

### 10.6 Phase 6 — SEO + Meilisearch (2 jours)

1. Indices Meilisearch pour 3 nouveaux types
2. Pages SEO ville × type × profession
3. Sitemaps étendus
4. Métadonnées structured-data (LocalBusiness schema.org)

### 10.7 Phase 7 — Tests + QA (2 jours)

1. Tests E2E par type (Playwright)
2. Tests intégration (Vitest)
3. Snyk security scan
4. Lighthouse 90+ sur toutes nouvelles pages

### 10.8 Phase 8 — Données seed (1-2 jours)

1. Importer 50 labos majeurs Tunisie (Pasteur, Cunipath, etc.) + leurs analyses
2. Importer 200 pharmacies majeures (5-10 par grande ville)
3. Importer calendrier garde pharmacies (CSV des délégations régionales)
4. Importer 500 médicaments référence DCI
5. Importer 200 codes NABM

**Total Phase 1-8 : ~25 jours dev (un dev seul) ou ~3 sem en équipe 2 dev**

---

## 11. Effort estimé — 14 tracks

| # | Track | Effort dev | Bloqueurs externes |
|---|---|---|---|
| 1 | Migrations DB + Drizzle schema (Phase 1) | 1-2j | — |
| 2 | NextAuth providers + onboarding (Phase 2) | 2j | — |
| 3 | Espace laboratoire complet | 3j | — |
| 4 | Espace pharmacie complet | 3j | — |
| 5 | Espace paramédical | 1j | — |
| 6 | Extensions clinique multi-providers | 1j | — |
| 7 | Extensions médecin (envoi pharmacie/labo) | 1j | — |
| 8 | Pages publiques (annuaires + fiches) | 1j | — |
| 9 | Patient — recherche unifiée + booking | 1j | — |
| 10 | Patient — dossier médical unifié | 1j | — |
| 11 | Admin — validation + catalogues étendus | 2j | — |
| 12 | Admin — stats + finance par type | 1j | — |
| 13 | Meilisearch + SEO ville × type | 2j | — |
| 14 | Tests + QA + Snyk + Lighthouse | 2j | — |
| 15 | Seed data (labos, pharmacies, garde, méds, NABM) | 1-2j | — |

**Total : 22-25 jours dev** (Achref seul, tempo classique)

Avec 2 devs en parallèle : **~12-14 jours**

---

## 12. Risques & mitigations

| Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|
| Données pharmacies de garde difficiles à scraper | UX dégradé | High | Backfill manuel admin par délégation régionale ; partenariat Ordre Pharmaciens à terme |
| Pharmacies/labos faible adoption initiale | Annuaire vide | High | Phase de seed admin manuelle (50 labos + 200 pharmacies) avant ouverture publique |
| Confusion patient avec types multiples | Conversion baisse | Medium | UX hero clair avec 4-5 onglets nettement distincts ; tutoriel onboarding |
| Conformité CNAM par type différente | Bug juridique | Medium | Audit chaque flow avec un expert CNAM ; flag chaque transmission |
| Stockage R2 résultats analyses (scaling) | Coûts | Low | R2 actuel = pennies/GB, archivage auto >2 ans en `cold storage` |
| Sécurité ordonnances (PHI sensible) | Breach | High | Chiffrement at-rest R2 + URLs signées 7j max + audit access logs |
| Mauvaise saisie ordonnance par patient | Erreur médicament | High | Dual review : pharmacien doit valider avant préparation ; PDF original toujours visible |
| Refus CNAM tiers payant | Patient mécontent | Medium | Status `cnam_pending`/`cnam_rejected` clair, fallback paiement direct |
| Cannibalisation médecins existants | Adoption méd. baisse | Low | Médecins gagnent avec envoi direct labos/pharmacies (efficience) |
| Galerie photos lab/pharma faible | Sérieux dégradé | Low | Comme phase 2 photos secondaires : default placeholders + admin upload |

---

## 13. Hors scope V1

À garder en backlog pour V2/V3 :

### V2 (3-6 mois après V1)

- **Stock médicaments temps réel** (intégration ERP pharmacies — Pharmunit, Pharmasoft)
- **Livraison via partenaires logistiques** (Yassir/Glovo/InDriver)
- **Auto-parsing ordonnance PDF** (OCR + NER medicaments)
- **Téléconsult labo→médecin** (résultats inquiétants → call médecin)
- **Système de fidélité patient** (points sur achats pharmacie, RDV médecin)
- **Doktori Connect Pro** (équivalent Dabadoc Connect Pro — abonnements pros premium)
- **Mode "Salle d'attente virtuelle"** pour cabinet médecin
- **Dictaphone notes médicales**

### V3 (6-12 mois)

- **API SEED CNAM** (quand disponible côté CNAM, prévu 2027)
- **DocShare inter-médecins** avec pièces jointes
- **Carte Labess (e-CNAM)** intégration NFC pour identification patient
- **Vaccinations programmées** (créneaux dédiés campagnes)
- **Expansion Maghreb** (Maroc, Algérie) — multi-pays footer
- **App mobile native** (déjà spec à `docs/superpowers/plans/2026-04-12-doktori-mobile-app.md`)

---

## Annexe A — Sources & inspirations

- **Dabadoc Connect Pro** (Maroc) — audit complet 2026-05-03 (38 features)
- **Doctolib** (France) — observation non-systématique (annuaire, dossier médical)
- **CNAM Tunisie** — site officiel cnam.nat.tn + projet SEED 2027
- **Ordre des Pharmaciens de Tunisie** — calendrier garde
- Existing Doktori specs : `humble-enchanting-parasol.md` (14 waves admin), `2026-05-06-payments-stripe-bank-design.md`, `2026-05-06-coach-ia-design.md`

## Annexe B — Décisions architecturales actées

1. Tables séparées par type (vs polymorphisme) — voir 3.3
2. Vue SQL `all_providers_v` pour recherche unifiée
3. Meilisearch indices séparés (pas index unifié) — facilite la pertinence par type
4. Audit log via `withAdminAudit` pour toutes mutations admin (pattern existant)
5. R2 pour tous fichiers (résultats labos, ordonnances PDF, photos)
6. Stripe = provider unique paiement V1 ; Konnect/Paymee non-bloquant
7. Notifications via Twilio SMS + push FCM + email (pattern existant)

## Annexe C — Endpoints intégration externes

| Externe | Usage | API officielle ? | Remplacement V1 |
|---|---|---|---|
| CNAM télétransmission | Tiers payant labos/pharmacies | ❌ pas avant 2027 | PDF + dépôt manuel |
| CNAM verification matricule | Validation patient | ❌ | Saisie manuelle |
| Ordre Pharmaciens calendrier garde | Pharmacies garde | ❌ | Backfill admin manuel |
| Yassir Logistique | Livraison médicaments | ❌ pas testé | Livraison interne pharmacies |
| Stripe | Paiement | ✅ | OK |
| Twilio | SMS Tunisie | ✅ | OK |
| FCM (Firebase) | Push notif | ✅ | OK |
| OpenRouter (Kimi) | Coach IA | ✅ | OK |

---

## Annexe D — Checklist livrables exécution

- [ ] Phase 1 : 9 migrations DB appliquées en prod via `apply-migrations-prod.sh`
- [ ] Phase 2 : 4 nouveaux flows onboarding fonctionnels
- [ ] Phase 3 : 5 espaces pros opérationnels
- [ ] Phase 4 : Recherche unifiée + dossier patient unifié
- [ ] Phase 5 : Admin valide les 3 nouveaux types
- [ ] Phase 6 : Meilisearch indexe 5 types, SEO pages générées
- [ ] Phase 7 : 100% tests verts + Snyk clean + Lighthouse > 90
- [ ] Phase 8 : ≥ 50 labos + 200 pharmacies seedés en prod
- [ ] Doc utilisateur publique sur l'espace dédié pros (`/pour-les-laboratoires`, etc.)
- [ ] Communiqués presse + démarche commerciale providers

---

**Cette spec est destinée à Achref pour exécution.** Tout le contenu est prêt à être traduit en plan d'implémentation détaillé via la skill `writing-plans` (subagent), puis executé via `subagent-driven-development`.

**Pour toute question de cadrage avant exécution** : Omar.
