# Doktori Multi-Providers — Plan d'Exécution

> **Pour Achref :** Plan d'implémentation phase par phase pour étendre Doktori (annuaire médecins) en plateforme santé multi-providers (médecins / cliniques / **laboratoires** / **pharmacies** / **paramédicaux**).

**Spec source** : `docs/superpowers/specs/2026-05-08-multi-providers-spec.md` (1280 lignes)
**Décisions ADR** : `docs/superpowers/specs/2026-05-08-multi-providers-decisions.md` (6 ADRs à valider)
**Effort total** : 22-25 jours dev solo (12-14 jours en équipe de 2)
**Date** : 2026-05-08
**Tech stack** : Next.js 16 + Drizzle + PostgreSQL/Supabase + Meilisearch + R2 + 1Password + pnpm monorepo

---

## ⚠️ Pré-requis avant démarrage

Avant la 1ère ligne de code, valider avec Omar :

1. **ADR-1** : Tables séparées (recommandé) — pas de polymorphisme
2. **ADR-2** : Paramédicaux V1 = 3 professions (kiné/sage-femme/psychologue)
3. **ADR-3** : Livraison V1 = `internal` only, partenaire logistique en V2
4. **ADR-4-5-6** : Recommandations par défaut sauf opposition

**Obtenir ces validations en écrit avant Phase 1.** Sinon retravail massif.

---

## Branche de travail

```bash
cd ~/dev/doktori
git checkout main && git pull
git checkout -b feat/multi-providers
git push -u origin feat/multi-providers
```

PR daily updates avec preview Vercel-style (pas de Vercel sur Doktori — utiliser un docker compose local + tunnel temporaire si tests visuels nécessaires).

**Toutes les commandes de ce plan se lancent depuis `~/dev/doktori`.**

---

## Conventions

- **Commits** : conventional (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)
- **Migrations DB** : raw SQL dans `packages/db/migrations/00XX_*.sql` + tracking via `__doktori_migrations`
- **Drizzle schema** : `packages/db/src/schema.ts` mis à jour en parallèle (sinon types TS cassés)
- **Tests** : Vitest pour unit (`apps/web/__tests__/`), Playwright pour E2E (`apps/web/e2e/`)
- **TDD** : pour chaque feature, écrire le test d'abord, voir red, implémenter, voir green, commit
- **Snyk** : `mcp__Snyk__snyk_code_scan` après chaque phase, fix High/Critical
- **Audit log** : toute mutation admin via `withAdminAudit` (cf `apps/web/lib/admin/audit.ts`)
- **Secrets** : 1Password vault `Dartank-Infra` — JAMAIS hardcodé, toujours `op://`

---

## Sommaire des phases

| Phase | Focus | Effort | Dépendances |
|---|---|---|---|
| **Phase 1** | DB foundation : 7 nouvelles tables + Drizzle | 2j | ADRs validés |
| **Phase 2** | Auth + sessions multi-types (3 nouveaux providers NextAuth) | 1j | Phase 1 |
| **Phase 3** | Onboarding pros (3 flows) + admin verification | 3j | Phase 2 |
| **Phase 4** | Pages publiques pros + dossier patient unifié | 3j | Phase 3 |
| **Phase 5** | Lab : booking + résultats PDF + workflow | 4j | Phase 4 |
| **Phase 6** | Pharmacie : ordonnances + click&collect + livraison interne | 4j | Phase 4 |
| **Phase 7** | Paramédicaux : 3 professions + RDV simple | 2j | Phase 4 |
| **Phase 8** | Recherche unifiée Meilisearch + intégration globale | 2j | Phases 5/6/7 |
| **Phase 9** | Admin : modération multi-types, stats, comms | 2j | Phase 8 |
| **Phase 10** | QA + Snyk + perf + rollout progressif | 1-2j | Toutes |

**TOTAL** : 22-25 jours.

---

## PHASE 1 — DB Foundation (2 jours)

### Objectif

Créer les 7 nouvelles tables (laboratories, laboratory_analyses, laboratory_appointments, pharmacies, pharmacy_garde_calendar, prescription_orders, paramedicals, clinic_providers), updater Drizzle schema, créer la vue SQL `all_providers_v`, et seeder des données de test.

### Tasks

#### Task 1.1 — Créer migration 0091 : `laboratories` + `laboratory_analyses`

**Files** :
- Create : `packages/db/migrations/0091_laboratories.sql`
- Modify : `packages/db/src/schema.ts`

- [ ] Step 1 : Écrire SQL migration
  ```sql
  -- packages/db/migrations/0091_laboratories.sql

  CREATE TABLE laboratories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    photo_url TEXT,
    description TEXT,
    iso15189_accredited BOOLEAN DEFAULT FALSE,
    accreditation_url TEXT,
    cnam_conventionne BOOLEAN DEFAULT FALSE,
    home_collection BOOLEAN DEFAULT FALSE,
    opening_hours JSONB,
    rating NUMERIC(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    verification_status VARCHAR(20) DEFAULT 'pending', -- pending|verified|rejected
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_labs_city ON laboratories(city);
  CREATE INDEX idx_labs_slug ON laboratories(slug);
  CREATE INDEX idx_labs_status ON laboratories(verification_status);
  CREATE INDEX idx_labs_visible_active ON laboratories(is_active, is_visible);

  CREATE TABLE laboratory_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
    code_nabm VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price_dzd INTEGER, -- millimes
    fasting_required BOOLEAN DEFAULT FALSE,
    duration_hours INTEGER, -- délai résultat
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_lab_analyses_lab ON laboratory_analyses(laboratory_id);
  CREATE INDEX idx_lab_analyses_nabm ON laboratory_analyses(code_nabm);
  CREATE UNIQUE INDEX idx_lab_analyses_unique ON laboratory_analyses(laboratory_id, code_nabm);
  ```

- [ ] Step 2 : Updater Drizzle schema (`packages/db/src/schema.ts`)
  ```ts
  export const laboratories = pgTable("laboratories", {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 255 }).unique().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    passwordHash: text("password_hash").notNull(),
    phone: varchar("phone", { length: 20 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    photoUrl: text("photo_url"),
    description: text("description"),
    iso15189Accredited: boolean("iso15189_accredited").default(false),
    accreditationUrl: text("accreditation_url"),
    cnamConventionne: boolean("cnam_conventionne").default(false),
    homeCollection: boolean("home_collection").default(false),
    openingHours: jsonb("opening_hours"),
    rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
    ratingCount: integer("rating_count").default(0),
    verificationStatus: varchar("verification_status", { length: 20 }).default("pending"),
    verificationNotes: text("verification_notes"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true),
    isVisible: boolean("is_visible").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  });

  export const laboratoryAnalyses = pgTable("laboratory_analyses", {
    id: uuid("id").primaryKey().defaultRandom(),
    laboratoryId: uuid("laboratory_id").notNull().references(() => laboratories.id, { onDelete: "cascade" }),
    codeNabm: varchar("code_nabm", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }),
    priceDzd: integer("price_dzd"),
    fastingRequired: boolean("fasting_required").default(false),
    durationHours: integer("duration_hours"),
    description: text("description"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  });

  export type Laboratory = InferSelectModel<typeof laboratories>;
  export type NewLaboratory = InferInsertModel<typeof laboratories>;
  ```

- [ ] Step 3 : Run migration locally
  ```bash
  # Local dev db
  pnpm --filter @doktori/db migrate
  # OU manuel via psql
  psql $DEV_DATABASE_URL -f packages/db/migrations/0091_laboratories.sql
  ```

- [ ] Step 4 : Smoke test schema TS
  ```bash
  pnpm --filter web typecheck
  ```
  Expected: no errors

- [ ] Step 5 : Commit
  ```bash
  git add packages/db/migrations/0091_laboratories.sql packages/db/src/schema.ts
  git commit -m "feat(db): add laboratories + analyses tables (multi-providers Phase 1)"
  ```

#### Task 1.2 — Migration 0092 : `laboratory_appointments`

Suivre le même pattern. Schema :
```sql
CREATE TABLE laboratory_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  type VARCHAR(20) DEFAULT 'on_site', -- 'on_site' | 'home_collection'
  status VARCHAR(20) DEFAULT 'pending', -- pending|confirmed|completed|cancelled|no_show
  prescription_url TEXT,
  analyses JSONB, -- array of {codeNabm, name, price}
  total_amount_dzd INTEGER,
  cnam_covered BOOLEAN DEFAULT FALSE,
  cnam_amount_dzd INTEGER,
  patient_notes TEXT,
  internal_notes TEXT,
  results_pdf_url TEXT,
  results_uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lab_appts_lab ON laboratory_appointments(laboratory_id);
CREATE INDEX idx_lab_appts_patient ON laboratory_appointments(patient_id);
CREATE INDEX idx_lab_appts_scheduled ON laboratory_appointments(scheduled_at);
CREATE INDEX idx_lab_appts_status ON laboratory_appointments(status);
```

Commit: `feat(db): add laboratory_appointments with results upload`

#### Task 1.3 — Migration 0093 : `pharmacies` + `pharmacy_garde_calendar`

```sql
CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  photo_url TEXT,
  description TEXT,
  pharmacist_name VARCHAR(255),
  pharmacist_diploma_url TEXT,
  -- License officielle pharmacien (autorisation Min Santé Tunisie)
  license_number VARCHAR(100),
  license_url TEXT,
  has_garde BOOLEAN DEFAULT FALSE,
  delivery_mode VARCHAR(20) DEFAULT 'internal', -- internal | none | doktori_partner (V2)
  delivery_fee_millimes INTEGER DEFAULT 0,
  delivery_radius_km INTEGER DEFAULT 5,
  click_collect BOOLEAN DEFAULT TRUE,
  opening_hours JSONB,
  cnam_conventionne BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  verification_status VARCHAR(20) DEFAULT 'pending',
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pharma_city ON pharmacies(city);
CREATE INDEX idx_pharma_slug ON pharmacies(slug);
CREATE INDEX idx_pharma_garde ON pharmacies(has_garde) WHERE has_garde = TRUE;

CREATE TABLE pharmacy_garde_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  garde_date DATE NOT NULL,
  garde_type VARCHAR(20) DEFAULT 'night', -- night | weekend | holiday
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_pharma_garde_unique ON pharmacy_garde_calendar(pharmacy_id, garde_date);
CREATE INDEX idx_pharma_garde_date ON pharmacy_garde_calendar(garde_date);
```

Commit: `feat(db): add pharmacies + garde calendar`

#### Task 1.4 — Migration 0094 : `prescription_orders`

```sql
CREATE TABLE prescription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  prescription_url TEXT NOT NULL,
  prescription_uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_mode VARCHAR(20) NOT NULL, -- 'click_collect' | 'delivery'
  delivery_address TEXT,
  delivery_fee_millimes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  -- pending | accepted | rejected | preparing | ready_for_pickup | out_for_delivery | delivered | cancelled
  rejection_reason TEXT,
  estimated_total_millimes INTEGER,
  actual_total_millimes INTEGER,
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending | paid | refunded
  payment_method VARCHAR(20), -- cash | card | flouci | paymee
  payment_reference TEXT,
  -- Livraison
  courier_partner VARCHAR(50), -- NULL si internal | yassir | etc V2
  courier_tracking_url TEXT,
  courier_eta TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  -- Communication
  patient_notes TEXT,
  pharmacy_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_presc_pharmacy ON prescription_orders(pharmacy_id);
CREATE INDEX idx_presc_patient ON prescription_orders(patient_id);
CREATE INDEX idx_presc_status ON prescription_orders(status);
CREATE INDEX idx_presc_pharmacy_status ON prescription_orders(pharmacy_id, status);
```

Commit: `feat(db): add prescription_orders with delivery workflow`

#### Task 1.5 — Migration 0095 : `paramedicals`

```sql
CREATE TYPE paramedical_profession AS ENUM (
  'kinesitherapeute',
  'sage_femme',
  'psychologue',
  -- V2 ↓
  'infirmier',
  'osteopathe',
  'dieteticien',
  'orthophoniste',
  'podologue'
);

CREATE TABLE paramedicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  profession paramedical_profession NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  photo_url TEXT,
  description TEXT,
  diploma_url TEXT,
  ordre_pro_membership_url TEXT, -- justif Ordre des Kinés / SF / etc
  speciality TEXT, -- ex: kiné sport, sage-femme accouchement, psy ado
  consultation_fee_millimes INTEGER,
  home_visit BOOLEAN DEFAULT FALSE,
  home_visit_fee_millimes INTEGER,
  rating NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  verification_status VARCHAR(20) DEFAULT 'pending',
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_paramed_profession ON paramedicals(profession);
CREATE INDEX idx_paramed_city ON paramedicals(city);
CREATE INDEX idx_paramed_slug ON paramedicals(slug);
```

**Note** : RDV paramédical = utilise `appointments` existante avec colonne polymorphique `provider_type='paramedical'` ou table dédiée `paramedical_appointments` à dupliquer (à clarifier avec Omar — recommander réutilisation `appointments` avec colonne nullable `paramedical_id` + CHECK constraint).

Commit: `feat(db): add paramedicals (3 professions V1 + 5 in V2 enum)`

#### Task 1.6 — Migration 0096 : `clinic_providers`

Pour gérer le multi-praticiens dans une clinique :
```sql
CREATE TABLE clinic_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id),
  paramedical_id UUID REFERENCES paramedicals(id),
  role VARCHAR(50), -- 'consultant' | 'employed' | 'visiting' | 'owner'
  hourly_rate_millimes INTEGER,
  schedule_template JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cp_one_provider CHECK (
    (doctor_id IS NOT NULL)::int + (paramedical_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX idx_cp_clinic ON clinic_providers(clinic_id);
CREATE INDEX idx_cp_doctor ON clinic_providers(doctor_id) WHERE doctor_id IS NOT NULL;
```

Commit: `feat(db): add clinic_providers junction table`

#### Task 1.7 — Migration 0097 : Vue SQL `all_providers_v`

```sql
CREATE OR REPLACE VIEW all_providers_v AS
  SELECT
    id, slug, 'doctor' AS provider_type, full_name AS name, email, phone, city,
    lat, lng, photo_url, rating, rating_count,
    verification_status, is_active, is_visible
  FROM doctors
  UNION ALL
  SELECT
    id, slug, 'clinic' AS provider_type, name, email, phone, city,
    lat, lng, photo_url, rating, rating_count,
    verification_status, is_active, is_visible
  FROM clinics
  UNION ALL
  SELECT
    id, slug, 'laboratory' AS provider_type, name, email, phone, city,
    lat, lng, photo_url, rating, rating_count,
    verification_status, is_active, is_visible
  FROM laboratories
  UNION ALL
  SELECT
    id, slug, 'pharmacy' AS provider_type, name, email, phone, city,
    lat, lng, photo_url, rating, rating_count,
    verification_status, is_active, is_visible
  FROM pharmacies
  UNION ALL
  SELECT
    id, slug, 'paramedical' AS provider_type,
    (first_name || ' ' || last_name) AS name,
    email, phone, city, lat, lng, photo_url, rating, rating_count,
    verification_status, is_active, is_visible
  FROM paramedicals;
```

⚠️ Si `doctors.full_name` n'existe pas (peut-être `name`), adapter. Vérifier avant.

Commit: `feat(db): unified provider view (all_providers_v)`

#### Task 1.8 — Seeder : 3 labos + 3 pharmas + 2 paramédicaux

**File** : `apps/web/scripts/seed-multi-providers.ts`

Créer données réalistes Tunis pour test : 1 labo (CIBM), 1 pharma centre-ville Tunis, 1 kiné. Avec mots de passe `Test1234!` (hashés bcrypt 10).

```bash
pnpm --filter web ts-node scripts/seed-multi-providers.ts
```

Commit: `chore: seed test data for multi-providers`

#### Task 1.9 — Snyk scan migrations

```bash
mcp__Snyk__snyk_code_scan path=/Users/omario/dev/doktori/packages/db
```

Fix High/Critical. Commit fixes si nécessaire.

### Validation Phase 1

- [ ] 7 migrations run sans erreur sur DB locale
- [ ] `pnpm typecheck` green
- [ ] Seeder produit 3+3+2 = 8 rows
- [ ] `SELECT * FROM all_providers_v LIMIT 20` retourne mix des 5 types
- [ ] Snyk green

---

## PHASE 2 — Auth multi-types (1 jour)

### Objectif

Ajouter 3 nouveaux providers NextAuth : `laboratory-credentials`, `pharmacy-credentials`, `paramedical-credentials`. Pattern copy-paste depuis `doctor-credentials`. Sessions JWT séparées par type.

### Tasks

#### Task 2.1 — Étendre `apps/web/lib/auth.ts`

**Files** :
- Modify : `apps/web/lib/auth.ts`
- Modify : `apps/web/types/next-auth.d.ts`

- [ ] Step 1 : Lire `apps/web/lib/auth.ts` pour comprendre pattern `doctor-credentials` actuel
- [ ] Step 2 : Ajouter 3 providers en suivant le pattern (CredentialsProvider, name unique, authorize callback bcrypt compare)
- [ ] Step 3 : Étendre type `Session` avec `role: 'laboratory' | 'pharmacy' | 'paramedical' | ...`
- [ ] Step 4 : Tests Vitest pour chaque provider (login OK / mauvais mdp / suspendu)
- [ ] Step 5 : Commit `feat(auth): laboratory/pharmacy/paramedical NextAuth providers`

#### Task 2.2 — Pages login

**Files Create** :
- `apps/web/app/laboratoire-login/page.tsx`
- `apps/web/app/pharmacie-login/page.tsx`
- `apps/web/app/paramedical-login/page.tsx`

Pattern copy depuis `apps/web/app/connexion/page.tsx` (médecin login) avec adaptation copy + redirection finale.

Commit : `feat(auth): login pages for lab/pharma/paramed`

#### Task 2.3 — Middleware role guards

**Files** :
- Modify : `apps/web/middleware.ts`

Ajouter route protection pour `/laboratoire/**`, `/pharmacie/**`, `/paramedical/**` (redirect login si pas le bon role dans session).

Commit : `feat(auth): middleware route guards for new pro types`

### Validation Phase 2

- [ ] Login lab/pharma/paramed via UI marche en local
- [ ] JWT session contient le bon `role`
- [ ] Middleware bloque accès cross-type (ex: lab session ne peut pas accéder `/pharmacie/dashboard`)
- [ ] Tests Vitest: 9 cas (3 types × 3 scenarios) green

---

## PHASE 3 — Onboarding pros + verification admin (3 jours)

### Objectif

Créer 3 flows onboarding (`/inscription/laboratoire`, `/inscription/pharmacie`, `/inscription/paramedical`) avec upload diplôme/license/accréditation, et page admin `/admin/verifications` pour valider/rejeter.

### Tasks

#### Task 3.1 — Onboarding laboratoire

**Files Create** :
- `apps/web/app/inscription/laboratoire/page.tsx` (server component)
- `apps/web/app/inscription/laboratoire/registration-form.tsx` (client)
- `apps/web/app/api/laboratories/register/route.ts` (POST)

**Spec form fields** :
- Section 1 (identité) : nom labo, email pro, téléphone, mdp + confirm
- Section 2 (adresse) : rue, ville (autocomplete Tunisia), gouvernorat
- Section 3 (légal) : numéro accréditation ISO 15189 (optionnel), upload PDF accréditation
- Section 4 (services) : checkbox "collecte à domicile", checkbox "convention CNAM"
- Section 5 (validation) : CGU + politique confidentialité

Backend : créer row `laboratories` avec `verification_status='pending'`, `is_visible=false`. Email notification admin via Resend (`'New lab registered: ${name}'`).

Tests :
- Vitest unit : POST /api/laboratories/register avec body invalide → 400
- Vitest unit : POST avec body valid → row créée, status pending
- Playwright E2E : full form submission → success page

Commit : `feat(onboarding): laboratory registration form + API`

#### Task 3.2 — Onboarding pharmacie

Pattern similaire. Form fields spécifiques :
- Pharmacien titulaire : nom, prénom
- License professionnelle (numéro + upload PDF)
- Diplôme docteur en pharmacie (upload)
- Service "garde de nuit" (checkbox)
- Service "click & collect" (checkbox, default true)
- Service "livraison" (radio: aucune / interne <X km)

Commit : `feat(onboarding): pharmacy registration form + API`

#### Task 3.3 — Onboarding paramédical

3 professions à supporter en V1 (kiné/SF/psy). Form fields :
- Profession (select 3 options V1)
- Identité + email + mdp
- Diplôme professionnel (upload PDF)
- Justificatif Ordre Pro (upload PDF) — Ordre des Kinés / Ordre des SF / Ordre des Psy
- Spécialité (text libre)
- Tarif consultation (millimes)
- Domicile possible (checkbox + tarif)

Commit : `feat(onboarding): paramedical registration form + API`

#### Task 3.4 — Admin verification page

**Files Create** :
- `apps/web/app/admin/verifications/page.tsx`
- `apps/web/app/api/admin/verifications/[type]/[id]/route.ts` (PATCH approve/reject)

UI : tabs par type (Médecins / Cliniques / Labos / Pharmas / Paramed) avec liste pending. Click row → modal avec docs uploaded preview + boutons Approve/Reject + textarea raison.

Backend : utilise `withAdminAudit` wrapper. Sur approve → `is_visible=true`, send email félicitations. Sur reject → email avec raison.

Commit : `feat(admin): verification panel for all provider types`

#### Task 3.5 — Email templates

**Files Create** : `apps/web/lib/email/templates/verification-approved.tsx`, `verification-rejected.tsx`

React Email templates simples (logo, message, lien dashboard).

Commit : `feat(email): verification status templates`

### Validation Phase 3

- [ ] 3 onboarding forms fonctionnels (test soumission complète)
- [ ] Upload R2 marche (lab uploadé un PDF, retrieve URL)
- [ ] Admin verification : approve labo → row.is_visible=true, email envoyé
- [ ] Admin verification : reject pharma → audit log écrit
- [ ] Snyk green sur upload + auth flow

---

## PHASE 4 — Pages publiques + dossier patient unifié (3 jours)

### Objectif

Ajouter pages publiques par type provider (avec SEO, schema.org) et étendre le dossier patient pour gérer multi-providers.

### Tasks

#### Task 4.1 — Pages publiques labos

**Files Create** :
- `apps/web/app/laboratoires/page.tsx` (liste annuaire)
- `apps/web/app/laboratoires/[ville]/page.tsx`
- `apps/web/app/laboratoire/[slug]/page.tsx` (fiche détail)

Composants :
- `lib/seo.ts` : `generateLabMetadata({ slug, city })` retourne title/description/og
- Schema.org JSON-LD `MedicalBusiness` injecté côté server

Filtres liste : ville, accréditation, CNAM, collecte domicile.

Tests :
- Server-side tests : metadata correcte
- Playwright : annuaire filtre ville → liste filtrée

Commit : `feat(public): laboratory listing + detail pages with SEO`

#### Task 4.2 — Pages publiques pharmacies + garde

**Files Create** :
- `apps/web/app/pharmacies/page.tsx`
- `apps/web/app/pharmacies/garde/page.tsx` (page garde du jour avec géoloc)
- `apps/web/app/pharmacie/[slug]/page.tsx`

Page garde : query `pharmacy_garde_calendar WHERE date=CURRENT_DATE`. Ordonner par distance si géoloc patient.

Commit : `feat(public): pharmacy listing + garde page (geo-aware)`

#### Task 4.3 — Pages publiques paramédicaux

**Files Create** :
- `apps/web/app/paramedicaux/page.tsx`
- `apps/web/app/paramedicaux/[profession]/page.tsx`
- `apps/web/app/paramedicaux/[profession]/[ville]/page.tsx`
- `apps/web/app/paramedical/[slug]/page.tsx`

Commit : `feat(public): paramedical pages by profession + city`

#### Task 4.4 — Patient dossier unifié

**Files** :
- Modify : `apps/web/app/(patient)/dossier-medical/page.tsx`
- Create : `apps/web/components/patient/medical-timeline.tsx`

Étendre dossier pour afficher :
- Consultations médecin (existant)
- Analyses bio (depuis `laboratory_appointments` avec `results_pdf_url`)
- Ordonnances (depuis `prescription_orders`)
- Soins paramédicaux (séances kiné, etc.)

Timeline triée par date desc avec icônes par type.

Tests Vitest : composant rendu OK avec mix de 4 types d'events.

Commit : `feat(patient): unified medical timeline (5 sources)`

#### Task 4.5 — Patient mes RDV étendu

**Files** :
- Modify : `apps/web/app/(patient)/mes-rdv/page.tsx`
- Modify : `apps/web/app/api/patients/appointments/route.ts`

Inclure RDV labo + commandes pharma (avec statuts) + RDV paramed dans la liste.

Commit : `feat(patient): unified appointments list across provider types`

### Validation Phase 4

- [ ] `/laboratoires/tunis` retourne liste 1+ row test seedée
- [ ] `/laboratoire/cibm-tunis` page detail avec map, services, analyses
- [ ] `/pharmacies/garde` montre 1 pharma de garde test
- [ ] Dossier patient affiche analyses + ordonnances seedées
- [ ] Lighthouse perf score > 80 sur pages annuaires (next-image, ISR)

---

## PHASE 5 — Lab booking + résultats (4 jours)

### Objectif

Workflow complet labo : patient cherche analyse → upload prescription → choisit créneau → labo confirme → patient se présente → labo upload résultats PDF.

### Tasks

#### Task 5.1 — Lab dashboard pro

**Files Create** :
- `apps/web/app/(laboratory)/laboratoire/dashboard/page.tsx`
- `apps/web/app/(laboratory)/laboratoire/layout.tsx`
- `apps/web/components/laboratory/sidebar.tsx`

Dashboard : tiles RDV jour, RDV semaine, résultats à uploader, revenus mois.

Commit : `feat(lab): pro dashboard skeleton`

#### Task 5.2 — Lab catalogue analyses (CRUD)

**Files Create** :
- `apps/web/app/(laboratory)/laboratoire/analyses/page.tsx`
- `apps/web/app/api/laboratory/analyses/route.ts` (GET list, POST create)
- `apps/web/app/api/laboratory/analyses/[id]/route.ts` (PATCH, DELETE)

UI : table avec ajout/édition (code NABM, name, prix, durée, jeûne).

Tests : Vitest CRUD route, RBAC (lab ne peut éditer que ses analyses).

Commit : `feat(lab): analyses CRUD with NABM codes`

#### Task 5.3 — Lab schedule (créneaux dispos)

**Files Create** :
- `apps/web/app/(laboratory)/laboratoire/disponibilites/page.tsx`
- Réutiliser pattern `apps/web/app/api/schedules/route.ts` du médecin

Commit : `feat(lab): availability schedule per slot`

#### Task 5.4 — Patient booking flow

**Files Create** :
- `apps/web/app/(patient)/laboratoire/[slug]/reserver/page.tsx` (wizard 4 steps)
- `apps/web/app/api/laboratory-appointments/route.ts` (POST)

Wizard :
1. Sélectionner analyses (search par NABM, ajout panier)
2. Upload prescription (R2)
3. Choisir créneau (dispo lab)
4. Récap + confirm

Tests Playwright E2E : full booking flow.

Commit : `feat(lab): patient booking wizard 4 steps`

#### Task 5.5 — Lab gestion RDV

**Files Create** :
- `apps/web/app/(laboratory)/laboratoire/rendez-vous/page.tsx`
- `apps/web/app/api/laboratory-appointments/[id]/route.ts` (PATCH status)

UI : table RDV jour avec actions (Confirmer, Marquer présent, Marquer no-show).

Commit : `feat(lab): appointments management UI`

#### Task 5.6 — Lab upload résultats

**Files Create** :
- `apps/web/app/(laboratory)/laboratoire/rendez-vous/[id]/resultats/page.tsx`
- `apps/web/app/api/laboratory-appointments/[id]/results/route.ts` (POST upload R2)

Backend : upload R2 + update `results_pdf_url` + send email patient + audit log.

Tests : POST sans PDF → 400, POST avec PDF → 200 + email envoyé.

Commit : `feat(lab): results PDF upload with patient notification`

#### Task 5.7 — Patient consult résultats (URL signée 24h)

**Files Create** :
- `apps/web/app/(patient)/dossier-medical/analyses/[id]/page.tsx`
- `apps/web/app/api/patient/results/[id]/signed-url/route.ts` (GET)

Backend : check ownership patient → générer signed URL R2 24h → redirect.

Audit row à chaque accès (table `audit_log` extension).

Tests : RBAC (autre patient → 403), URL expirée 24h plus tard.

Commit : `feat(patient): consult lab results with audit + signed URLs`

#### Task 5.8 — Notifications

- Email patient : RDV confirmé / résultats prêts
- SMS optionnel V2 (Twilio) — défer

Commit : `feat(lab): email notifications RDV + results ready`

### Validation Phase 5

- [ ] Patient peut réserver un RDV labo avec analyses + prescription upload
- [ ] Lab voit RDV dans dashboard, peut confirmer
- [ ] Lab peut upload résultats, patient reçoit email
- [ ] Patient voit résultat avec URL signée 24h
- [ ] E2E Playwright complet OK

---

## PHASE 6 — Pharmacie : ordonnances + workflow (4 jours)

### Objectif

Patient envoie ordonnance scannée → pharmacie évalue → estime prix → patient valide → click&collect ou livraison interne.

### Tasks

#### Task 6.1 — Pharma dashboard pro

**Files Create** :
- `apps/web/app/(pharmacy)/pharmacie/dashboard/page.tsx`
- `apps/web/app/(pharmacy)/pharmacie/layout.tsx`

Tiles : commandes pending, en préparation, prêtes click&collect, livraisons en cours.

Commit : `feat(pharma): pro dashboard skeleton`

#### Task 6.2 — Patient envoi ordonnance

**Files Create** :
- `apps/web/app/(patient)/pharmacie/[slug]/commander/page.tsx`
- `apps/web/app/api/prescription-orders/route.ts` (POST)

Form : upload ordonnance (PDF/image R2), mode (click&collect | delivery), si delivery: adresse + tel, notes, payment method (cash | card V2).

Tests Vitest : POST sans prescription → 400, POST OK → row pending.

Commit : `feat(pharma): patient prescription order submission`

#### Task 6.3 — Pharma gestion commandes

**Files Create** :
- `apps/web/app/(pharmacy)/pharmacie/commandes/page.tsx`
- `apps/web/app/(pharmacy)/pharmacie/commandes/[id]/page.tsx`

Liste filtrable par statut. Détail : ordonnance preview + actions (Accepter/Refuser, Estimer prix, Marquer prêt, Marquer livré).

Backend : transitions statuts via API `PATCH /api/prescription-orders/[id]` (validation transitions valides).

Tests : transitions invalides rejetées (ex: pending → delivered direct = 400).

Commit : `feat(pharma): order management workflow with status transitions`

#### Task 6.4 — Estimation prix + confirmation patient

**Files** :
- Modify : `apps/web/app/api/prescription-orders/[id]/route.ts`
- Create : `apps/web/components/pharmacy/price-estimation-form.tsx`

Pharma saisit montant estimé → patient reçoit notif → patient confirme/refuse via lien email.

Email template : "Votre commande X est estimée à Y DT, confirmez sous 1h".

Commit : `feat(pharma): price estimation + patient confirmation flow`

#### Task 6.5 — Click & collect

UI patient : show statut "prête à retirer" + pharmacie info + heures ouverture.
Pharma marque "delivered" quand patient retire (au scan QR ou bouton manuel).

Commit : `feat(pharma): click & collect status workflow`

#### Task 6.6 — Livraison interne

**Files** :
- `apps/web/app/(pharmacy)/pharmacie/livraisons/page.tsx`
- `apps/web/app/api/prescription-orders/[id]/dispatch/route.ts`

UI : marquer "out_for_delivery" + champ téléphone livreur.
Patient reçoit SMS/email avec téléphone livreur (V1 simple, pas de tracking GPS).

V2 : intégration partenaire logistique (différé selon ADR-3).

Commit : `feat(pharma): internal delivery workflow (V1)`

#### Task 6.7 — Garde calendar admin

**Files Create** :
- `apps/web/app/admin/pharmacies/garde/page.tsx`
- `apps/web/app/api/admin/pharmacies/[id]/garde/route.ts`

UI admin : sélectionner pharma + dates → bulk insert garde.

Source données possibles : Ordre des Pharmaciens publie planning mensuel — à scraper/parser ou saisie manuelle V1.

Commit : `feat(admin): pharmacy garde calendar management`

### Validation Phase 6

- [ ] Patient envoie ordonnance via UI → row pending
- [ ] Pharma accepte → estime → patient confirme → préparation → ready
- [ ] Click & collect : patient voit statut, pharma marque delivered
- [ ] Livraison : pharma dispatch, patient reçoit numéro livreur
- [ ] Admin gère garde calendar
- [ ] Snyk green

---

## PHASE 7 — Paramédicaux (2 jours)

### Objectif

3 professions (kiné/SF/psy) avec espace pro simple, RDV via `appointments` étendu, page publique.

### Tasks

#### Task 7.1 — Paramed dashboard pro

**Files Create** :
- `apps/web/app/(paramedical)/paramedical/dashboard/page.tsx`
- `apps/web/app/(paramedical)/paramedical/layout.tsx`

Pattern simple : RDV jour, RDV semaine, profile.

Commit : `feat(paramed): pro dashboard skeleton`

#### Task 7.2 — RDV paramed (réutiliser appointments)

**Files** :
- Modify : `packages/db/migrations/0098_appointments_paramed.sql`

```sql
ALTER TABLE appointments ADD COLUMN paramedical_id UUID REFERENCES paramedicals(id);
ALTER TABLE appointments ADD CONSTRAINT appt_one_provider CHECK (
  (doctor_id IS NOT NULL)::int + (paramedical_id IS NOT NULL)::int = 1
);
CREATE INDEX idx_appts_paramed ON appointments(paramedical_id) WHERE paramedical_id IS NOT NULL;
```

Modify Drizzle schema. Modify API routes pour accepter paramed.

Commit : `feat(db): extend appointments to paramedicals`

#### Task 7.3 — Patient booking paramed

**Files Create** :
- `apps/web/app/(patient)/paramedical/[slug]/reserver/page.tsx`

Pattern simple : choisir créneau, confirmer.

Commit : `feat(paramed): patient booking flow`

#### Task 7.4 — Paramed schedule + RDV management

Réutiliser composants médecin avec adaptations cosmétiques.

Commit : `feat(paramed): schedule + appointment management`

### Validation Phase 7

- [ ] Patient peut book RDV avec un kiné test
- [ ] Kiné voit RDV dans son dashboard
- [ ] Sage-femme + psy idem (test seedé)
- [ ] Tests E2E Playwright OK

---

## PHASE 8 — Recherche unifiée + integration (2 jours)

### Objectif

Étendre Meilisearch pour indexer tous les types, créer page `/recherche` unifiée, étendre nav.

### Tasks

#### Task 8.1 — Indexes Meilisearch par type

**Files Create** :
- `apps/web/scripts/reindex-meilisearch-multi.ts`
- `apps/web/lib/meilisearch/index-builders.ts`

Créer 4 nouveaux indexes : `laboratories`, `pharmacies`, `paramedicals`, `clinics`. Settings searchable/filterable adaptés par type.

Cron quotidien réindex : `crontab` sur prod.

Commit : `feat(search): meilisearch indexes for new provider types`

#### Task 8.2 — API search unifiée

**Files Create** :
- `apps/web/app/api/search/unified/route.ts`

Body : `{ query, types: ['doctor','laboratory'], filters: { city, ... } }` → query 1-N indexes en // → merge + sort par score.

Tests Vitest : query simple, filter type, filter ville.

Commit : `feat(search): unified search API across types`

#### Task 8.3 — Page recherche unifiée

**Files** :
- Modify : `apps/web/app/recherche/page.tsx`

Filtres : type provider (chips), ville, spécialité (si médecin), accréditation (si labo), garde (si pharma), profession (si paramed).
Map view + list view.

Commit : `feat(search): unified search UI with type filters`

#### Task 8.4 — Nav globale étendue

**Files** :
- Modify : `apps/web/components/navbar.tsx`

Ajouter dropdown "Trouver un service" : Médecins / Cliniques / Labos / Pharmacies / Paramed / Garde.

Commit : `feat(ui): extended nav menu with all provider types`

#### Task 8.5 — Coach IA contextualisé

**Files** :
- Modify : `apps/web/lib/coach-ai/system-prompt.ts`

Étendre prompt pour orienter vers labo/pharma/paramed selon symptôme. Ex: "douleur dos → kiné", "ordonnance médicaments → pharma proche".

Commit : `feat(coach): multi-provider routing in AI prompt`

### Validation Phase 8

- [ ] Recherche "Tunis" retourne mix 5 types triés par pertinence
- [ ] Filter type=lab → seulement labos
- [ ] Carte affiche markers colorés par type
- [ ] Coach IA suggère kiné quand patient mentionne mal de dos

---

## PHASE 9 — Admin tools (2 jours)

### Objectif

Modération multi-types, stats globales, comms ciblées par type.

### Tasks

#### Task 9.1 — Dashboard admin étendu

**Files** :
- Modify : `apps/web/app/admin/page.tsx`

Tiles : Médecins (active/pending), Cliniques, Labos, Pharmas, Paramed.
Charts : evolution counts par type sur 90j.

Commit : `feat(admin): dashboard with multi-provider stats`

#### Task 9.2 — CRUD admin par type

**Files Create** :
- `apps/web/app/admin/laboratoires/page.tsx`
- `apps/web/app/admin/pharmacies/page.tsx`
- `apps/web/app/admin/paramedicaux/page.tsx`

Pattern existant médecins admin (table + filtres + edit modal). Wrap toutes mutations dans `withAdminAudit`.

Commit : `feat(admin): CRUD pages for new provider types`

#### Task 9.3 — Bulk actions

Permet admin : suspend N labos, send email à tous pharmas garde, etc.

Commit : `feat(admin): bulk actions per provider type`

#### Task 9.4 — Stats financières

**Files Create** :
- `apps/web/app/admin/finances/multi-providers/page.tsx`

Revenus par type provider, commission Doktori (si applicable V2), top 10 par revenu.

Commit : `feat(admin): multi-provider revenue stats`

### Validation Phase 9

- [ ] Admin voit dashboard avec stats correctes
- [ ] Admin peut suspendre un labo → labo perd accès dashboard
- [ ] Audit log écrit pour chaque action
- [ ] Snyk green

---

## PHASE 10 — QA + Snyk + perf + rollout (1-2 jours)

### Objectif

Tests E2E end-to-end, perf checks, security audit, rollout staged en prod.

### Tasks

#### Task 10.1 — Tests E2E Playwright complets

**Files Create** :
- `apps/web/e2e/multi-providers/lab-booking.spec.ts`
- `apps/web/e2e/multi-providers/pharma-order.spec.ts`
- `apps/web/e2e/multi-providers/paramed-booking.spec.ts`
- `apps/web/e2e/multi-providers/admin-verification.spec.ts`

Couvre : onboarding pro → admin verify → patient book → flow complet.

Run : `pnpm --filter web test:e2e`.

Commit : `test(e2e): full multi-providers flows`

#### Task 10.2 — Lighthouse perf

Pages annuaires < 80, pages détail < 90 sur mobile.

Si < seuil : optimisations next-image, ISR, defer scripts.

Commit : `perf: optimize multi-providers public pages`

#### Task 10.3 — Snyk full scan

```bash
mcp__Snyk__snyk_code_scan path=/Users/omario/dev/doktori
```

Fix tout High/Critical. Document Low en backlog.

Commit : `chore(security): fix Snyk findings`

#### Task 10.4 — Migration prod

```bash
ssh root@157.90.152.204 'cd /opt/doktori && git fetch && git checkout feat/multi-providers && ./scripts/deploy.sh'
```

Le `deploy.sh` applique migrations auto (déjà patché).

⚠️ **Avant deploy** :
- Backup DB prod : `pg_dump $DATABASE_URL > backup-$(date +%F).sql`
- Validate avec Omar
- Plan rollback : revert tag + restore backup si KO

Commit : `chore(release): multi-providers v1`

#### Task 10.5 — Rollout progressif

- Jour 1 prod : `is_visible=false` pour TOUS les nouveaux providers (table seedée mais invisibles publiquement)
- Tests internes Omar/Achref
- Jour 2-3 : activer 5-10 providers test (vrais labos volontaires)
- Jour 7+ : open registration publique

#### Task 10.6 — Documentation

**Files Create** :
- `docs/multi-providers/onboarding-laboratoire.md` (guide pour les labos)
- `docs/multi-providers/onboarding-pharmacie.md`
- `docs/multi-providers/onboarding-paramedical.md`

Commit : `docs: onboarding guides for multi-providers`

#### Task 10.7 — Merge to main + tag

```bash
git checkout main
git merge --no-ff feat/multi-providers
git tag multi-providers-v1
git push origin main --tags
```

### Validation finale

- [ ] Tous les tests E2E passent
- [ ] Lighthouse > seuils
- [ ] Snyk: 0 High/Critical
- [ ] Prod stable 24h après deploy
- [ ] Rollback testé en local
- [ ] Doc onboarding lue/validée par Omar

---

## Effort Tracker

| Phase | Effort estimé | Effort réel | Notes |
|---|---|---|---|
| 1 - DB | 2j | _ | |
| 2 - Auth | 1j | _ | |
| 3 - Onboarding | 3j | _ | |
| 4 - Pages publiques | 3j | _ | |
| 5 - Lab | 4j | _ | |
| 6 - Pharma | 4j | _ | |
| 7 - Paramed | 2j | _ | |
| 8 - Search | 2j | _ | |
| 9 - Admin | 2j | _ | |
| 10 - QA + rollout | 1-2j | _ | |
| **TOTAL** | **24-25j** | _ | |

---

## Checkpoints (validation Omar requise)

Achref doit demander OK Omar avant :

1. **Avant Phase 1** : ADRs validés (cf decisions.md)
2. **Après Phase 1** : Schema DB review (avant Phase 2 démarre)
3. **Après Phase 4** : Pages publiques review UX (avant Phase 5)
4. **Avant Task 10.4** : Deploy prod (high blast radius)
5. **Avant Task 10.5** : Rollout progressif (timing + comms)

---

## Red flags — escalader Omar

- Migration DB échoue en prod → **STOP** + restore backup
- Snyk High/Critical pas fixable simplement → discuter
- Tests E2E flakys → ne pas merger main
- Workflow status transitions ambigu → demander clarification métier
- Upload R2 timeout → discuter chunked upload V2

---

## Outils et helpers à utiliser

- **Skills** :
  - `/plan` avant chaque phase (review breakdown)
  - `/tdd` pour features (test first)
  - `/security-audit` après Phase 5/6 (PHI)
  - `/verification-before-completion` avant chaque commit final phase
  - `/review-pr` avant merge main
- **MCP** :
  - `mcp__Snyk__snyk_code_scan` après chaque phase
  - `mcp__plugin_playwright_playwright__*` pour E2E
  - `mcp__plugin_claude-mem_mcp-search__smart_search` pour recall décisions passées
- **Context7** : pour Drizzle/Next.js APIs

---

## Done ! Achref part de là.

Lecture order recommandée :
1. `docs/superpowers/specs/2026-05-08-multi-providers-spec.md` (le QUOI)
2. `docs/superpowers/specs/2026-05-08-multi-providers-decisions.md` (le POURQUOI — ADRs)
3. `docs/superpowers/plans/2026-05-08-multi-providers-execution-plan.md` (le COMMENT — ce doc)

Avant 1er commit : confirmer ADRs avec Omar.

Bonne route Achref 🚀
