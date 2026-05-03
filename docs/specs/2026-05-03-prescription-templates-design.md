---
name: Doktori — Templates de notes/ordonnances avec variables
description: Spec de la feature Templates inspirée de Dabadoc Connect Pro pour les médecins Doktori (MVP ordonnances, schéma extensible)
type: design-spec
status: approved
date: 2026-05-03
originSessionId: 8e28fc6f-aebf-4864-9153-1c74ceb14c01
---
# Doktori — Templates d'ordonnances avec variables

## Contexte

Inspiré de Dabadoc Connect Pro, où les médecins sauvent des modèles réutilisables (CM, Bilan Biologique, ATCD, etc.) avec placeholders `<first_name>`, `<weight>`, `<date>` qui se remplissent automatiquement depuis les données patient. **Killer feature absente de Doktori** alors que c'est l'un des gains de productivité quotidiens les plus visibles côté médecin.

Plateforme cible : Next.js 16 + Drizzle + Postgres, espace médecin déjà actif avec dossier patient + `prescriptions` + `consultation_notes`.

## Décisions cadres (validées en brainstorm 2026-05-03)

| # | Décision | Choix |
|---|---|---|
| 1 | Scope MVP | Ordonnances uniquement, schéma extensible pour notes en V2 |
| 2 | Origine des templates | Privés par médecin + bibliothèque officielle Doktori |
| 3 | UX d'application | Modal preview + édition avant insertion |
| 4 | Variables disponibles | 22 variables (patient/médecin/RDV/système) + `___` si manquant + compteur |
| 5 | Format de stockage | Markdown + syntaxe `{{variable}}` (Mustache) |
| 6 | Multi-langue | 1 template = 1 langue (FR ou AR séparément) |
| 7 | Clone autorisé | Médecin peut "Dupliquer dans mes modèles" un template officiel |

## Architecture

### Schéma DB — nouvelle table `prescription_templates`

```sql
CREATE TABLE prescription_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Owner (NULL pour les officiels Doktori)
  doctor_id       uuid REFERENCES doctors(id) ON DELETE CASCADE,
  -- Métadonnées
  title           varchar(120) NOT NULL,
  description     text,
  language        varchar(2) NOT NULL DEFAULT 'fr',  -- 'fr' | 'ar'
  -- Contenu
  body_markdown   text NOT NULL,
  -- Extensibilité (V2)
  target_type     varchar(20) NOT NULL DEFAULT 'prescription',
                  -- futurs: 'consultation_note', 'certificate', etc.
  -- Provenance
  is_official     boolean NOT NULL DEFAULT false,
  cloned_from_id  uuid REFERENCES prescription_templates(id) ON DELETE SET NULL,
  -- Stats (MVP)
  usage_count     integer NOT NULL DEFAULT 0,
  last_used_at    timestamptz,
  -- Audit
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,                       -- soft delete
  -- Contrainte ownership
  CONSTRAINT templates_ownership CHECK (
    (is_official = true AND doctor_id IS NULL)
    OR (is_official = false AND doctor_id IS NOT NULL)
  )
);

CREATE INDEX prescription_templates_doctor_idx
  ON prescription_templates(doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX prescription_templates_official_idx
  ON prescription_templates(is_official, language) WHERE deleted_at IS NULL AND is_official = true;
CREATE INDEX prescription_templates_target_idx
  ON prescription_templates(target_type) WHERE deleted_at IS NULL;
```

### Arborescence de code

```
apps/web/lib/templates/
├── variables.ts           # 22 variables + types + resolver
├── render.ts              # render(template, ctx) → { body, unresolved }
└── markdown-to-html.ts    # (existant probablement) sanitize + render

apps/web/app/api/medecin/templates/
├── route.ts               # GET (list) + POST (create)
├── [id]/route.ts          # GET / PATCH / DELETE
└── [id]/clone/route.ts    # POST clone

apps/web/app/api/medecin/patients/[id]/template-context/
└── route.ts               # GET context pour render

apps/web/app/api/admin/templates/
├── route.ts               # GET / POST (super_admin)
└── [id]/route.ts          # PATCH / DELETE (super_admin + audit)

apps/web/app/(medecin)/medecin/modeles/
├── page.tsx               # Liste (officiels + persos)
├── nouveau/page.tsx
├── [id]/edit/page.tsx
└── components/
    ├── template-list.tsx
    ├── template-editor.tsx          # Réutilisé par admin
    └── variable-helper-panel.tsx

apps/web/app/(medecin)/medecin/rendez-vous/[id]/components/
└── prescription-template-modal.tsx  # Modal d'application

apps/web/app/(admin)/admin/templates/
├── page.tsx
├── nouveau/page.tsx
└── [id]/edit/page.tsx
```

### Flux — appliquer un template

```
[Médecin sur fiche RDV] → clique "Choisir un modèle"
  ↓ GET /api/medecin/templates?language=fr
[Modal s'ouvre, liste templates persos + officiels]
  ↓ médecin sélectionne
  ↓ GET /api/medecin/patients/:id/template-context?appointmentId=:apptId
[render() côté client → preview avec variables remplies, ___ pour manquantes]
  ↓ médecin valide / édite
  ↓ "Insérer" → injection dans éditeur d'ordonnance
[Médecin sauvegarde] → POST /api/medecin/prescriptions { content: <rendu final> }
```

**Décisions** :
- Rendu **client-side** pour réactivité immédiate
- API ne renvoie **jamais** un template déjà résolu → permet ré-édit
- Stocker le **résultat rendu** dans `prescriptions.content`, pas le template source → traçabilité

## Variables (22)

### Mapping

```typescript
// apps/web/lib/templates/variables.ts

export const TEMPLATE_VARIABLES = {
  // Patient
  first_name:  { source: 'patient.first_name' },
  last_name:   { source: 'patient.last_name' },
  full_name:   { source: 'patient.first_name + " " + patient.last_name' },
  age:         { source: 'computed from patient.dob', format: 'number' },
  dob:         { source: 'patient.dob', format: 'date' },
  phone:       { source: 'patient.phone' },
  cin:         { source: 'patient.cin' },
  weight:      { source: 'patient_medical_profile.weight_kg', format: 'number' },
  height:      { source: 'patient_medical_profile.height_cm', format: 'number' },
  blood_type:  { source: 'patient_medical_profile.blood_type' },
  allergies:   { source: 'patient_medical_profile.allergies', format: 'list' },
  insurance:   { source: 'patient.insurance_provider' },

  // Médecin
  doctor_name:         { source: 'doctors.full_name' },
  doctor_specialty:    { source: 'doctors.specialty' },
  doctor_city:         { source: 'doctors.city' },
  doctor_phone:        { source: 'doctors.phone' },
  doctor_address:      { source: 'doctor_practices.address (primary)' },
  doctor_registration: { source: 'doctors.registration_number' },

  // RDV
  appointment_date:    { source: 'appointments.starts_at', format: 'date' },
  appointment_type:    { source: 'appointment_types.name' },

  // Système
  today:        { source: 'now()', format: 'date' },
  today_long:   { source: 'now()', format: 'date_long' },  // "3 mai 2026"
  time:         { source: 'now()', format: 'time' },
} as const;
```

### Formatage par locale

| `format` | FR | AR |
|---|---|---|
| `date` | `03/05/2026` | `2026/05/03` |
| `date_long` | `3 mai 2026` | `3 ماي 2026` |
| `time` | `14:30` | `14:30` |
| `number` | `1 234` | `1٬234` |
| `list` | `a, b, c` | `a، b، c` |

Implémentation : `Intl.DateTimeFormat` + `Intl.NumberFormat` avec `fr-TN` / `ar-TN`.

### Signature `render()`

```typescript
export interface TemplateContext {
  patient?: PatientWithProfile;
  doctor: Doctor;
  appointment?: Appointment;
  appointmentType?: AppointmentType;
  practice?: DoctorPractice;
  locale: 'fr' | 'ar';
}

export interface RenderResult {
  body: string;
  unresolved: TemplateVariable[];
}

export function render(template: string, ctx: TemplateContext): RenderResult;
```

### Cas particuliers

1. Variable inconnue (`{{firstname}}`) → préservée + log warning (pas d'erreur)
2. `age` quand `dob` null → `___`
3. `full_name` partiel → on retourne ce qu'on a
4. Arrays/JSONB (`allergies`, `insurance`) → join avec `, ` (FR) / `، ` (AR)
5. Patient sans `medical_profile` → toutes variables médicales = `___`

## UI

### Page liste `/medecin/modeles`

- Section "Officiels Doktori" (lecture seule, action principale `Dupliquer`)
- Section "Mes modèles" (action `Éditer` + soft delete)
- Recherche full-text titre + body
- Filtres : langue, type
- Empty state sur "Mes modèles" : *"Aucun modèle perso. Dupliquez un modèle officiel ou créez le vôtre."*

### Page éditeur `/medecin/modeles/nouveau` et `[id]/edit`

Layout 2 colonnes :
- **Gauche** : champs Titre / Description / Langue + textarea contenu (markdown, font-mono, syntax highlight cyan sur `{{var}}`)
- **Droite haut** : panneau "Variables" — 22 vars groupées par catégorie, copy-to-clipboard
- **Droite bas** : aperçu en direct avec patient fictif (Sami Trabelsi, 34 ans, 72 kg, allergique pénicilline)
- Validation au save : variables inconnues bloquent + suggestions (`firstname` → `first_name`)
- `beforeunload` warning si modifs non sauvegardées

### Modal d'application sur fiche RDV

- Liste à gauche / Aperçu à droite
- Compteur visible "2 variables non résolues : poids, n° d'inscription"
- Aperçu éditable en place (le médecin complète les `___` avant)
- `[Insérer]` injecte le markdown rendu dans l'éditeur d'ordonnance principal

### Composant réutilisable

`<TemplateEditor>` partagé entre médecin et admin :
- `mode: 'doctor' | 'admin'` (active toggle "officiel")
- `audit: boolean` (admin → wrap mutations dans `withAdminAudit()`)

## API

### Médecin

```
GET    /api/medecin/templates?language=&q=        # liste filtrable
POST   /api/medecin/templates                     # crée perso
GET    /api/medecin/templates/[id]
PATCH  /api/medecin/templates/[id]                # owner uniquement
DELETE /api/medecin/templates/[id]                # soft delete
POST   /api/medecin/templates/[id]/clone          # clone officiel ou perso
GET    /api/medecin/patients/[id]/template-context?appointmentId=
```

### Admin

```
GET    /api/admin/templates                       # tous (avec filtres)
POST   /api/admin/templates                       # crée officiel
PATCH  /api/admin/templates/[id]                  # withAdminAudit
DELETE /api/admin/templates/[id]                  # soft delete
```

## Bibliothèque seed initiale (10 templates FR)

| # | Titre | Cas d'usage |
|---|---|---|
| 1 | Antibio amoxicilline 7j | Infection ORL adulte |
| 2 | Antibio amoxi pédiatrie | Otite enfant 1-12 ans |
| 3 | Antalgique simple paracétamol | Douleur légère |
| 4 | AINS courte durée | Ibuprofène 3j |
| 5 | Bilan biologique de routine | NFS + glycémie + créat + lipides |
| 6 | Bilan diabète T2 trimestriel | HbA1c + glycémie + bilan rénal |
| 7 | Bilan thyroïdien | TSH + T3 + T4 + Ac anti-TPO |
| 8 | Certificat médical aptitude sport | Sport non compétitif |
| 9 | Certificat dispense scolaire | Repos enfant 3j |
| 10 | Esoméprazole 20 mg | RGPO/dyspepsie 4 sem |

Migration `0067_prescription_templates_seed.sql` avec `INSERT ... VALUES` dollar-quoted.

## Disclaimer juridique (BLOQUANT avant prod)

Sur templates officiels, lors du clone, en footer du modal d'application :

> ⚠️ Les modèles fournis par Doktori sont des aides à la rédaction. **Le médecin reste seul responsable de la prescription**, des doses, et de la pertinence clinique. Adaptez à chaque patient.

Texte à valider par équipe légale avant mise en prod.

## Error handling

### API

| Cas | Statut | Body |
|---|---|---|
| Template inexistant | 404 | `{ error: 'TEMPLATE_NOT_FOUND' }` |
| Médecin édite officiel | 403 | `{ error: 'OFFICIAL_TEMPLATE_READ_ONLY' }` |
| Cross-doctor edit | 403 | `{ error: 'FORBIDDEN' }` |
| Body vide | 400 | `{ error: 'BODY_REQUIRED' }` |
| Body > 10 KB | 400 | `{ error: 'BODY_TOO_LARGE', max: 10000 }` |
| Variable inconnue au save | 400 | `{ error: 'UNKNOWN_VARIABLES', variables: [...], suggestions: {...} }` |
| Patient context introuvable | 404 | `{ error: 'PATIENT_CONTEXT_NOT_FOUND' }` |
| Limite atteinte | 403 | `{ error: 'TEMPLATE_LIMIT_REACHED', limit: 100 }` |

### UI

- Toast d'erreur via `sonner`
- Modal app : si fetch context échoue → fallback `___` + bandeau "Données patient indisponibles"
- Éditeur : pas d'autosave MVP — bouton "Enregistrer" + warning beforeunload
- Aperçu : si markdown invalide → catch + affiche "Impossible de générer l'aperçu"

### DB

- FK avec `ON DELETE` explicite (CASCADE pour clones, SET NULL pour `cloned_from_id`)
- Transaction sur clone : `BEGIN ; INSERT clone ; UPDATE source.usage_count++ ; COMMIT`
- Soft delete partout, query filtrent `WHERE deleted_at IS NULL`

## Limits / Anti-spam

- 100 templates par médecin (check au POST)
- Title ≤ 120 chars, body ≤ 10 KB
- Rate limit : 30 mutations/min par doctor_id (rate-limit existant Doktori)

## Tests

### Unit (`apps/web/lib/templates/render.test.ts`)
- ✓ Remplacement variable
- ✓ Variable manquante → `___` + ajout `unresolved`
- ✓ Format date FR / AR
- ✓ Variable inconnue préservée
- ✓ Allergies array → join
- ✓ `age` null si `dob` null
- ✓ Perf 100 vars

### Integration (`apps/web/__tests__/api/medecin/templates.test.ts`)
- ✓ POST crée pour le doctor authentifié
- ✓ POST rejette > 10 KB
- ✓ PATCH cross-doctor = 403
- ✓ PATCH sur officiel = 403
- ✓ Clone copie body + reset doctor_id
- ✓ Clone incrémente `usage_count`
- ✓ DELETE = soft (deleted_at set)
- ✓ GET retourne officiels + persos triés

### E2E (`apps/web/e2e/templates.spec.ts`)
- ✓ Médecin crée template → utilise dans ordonnance → sauve → contenu rendu OK
- ✓ Clone d'officiel + édition → original officiel intact
- ✓ Patient consulte ordonnance imprimée → pas de `{{x}}` restant

## Rollout (4 semaines)

| Sem | Livrable | Vérification |
|---|---|---|
| W1 | Schéma DB + migration + endpoints CRUD doctor + tests unit + integration | `apply-migrations-prod.sh --status` montre 1 nouvelle |
| W2 | UI éditeur + helper variables + aperçu live | Médecin pilote crée 3 templates en < 10 min |
| W3 | Modal application + intégration éditeur ordo + E2E | Test bout-en-bout : template → ordo imprimée OK |
| W4 | Admin UI + seed 10 officiels + disclaimer juridique | 10 templates visibles en prod |

**Feature flag** : `prescription_templates_enabled` (table `feature_flags` Wave 13). OFF par défaut, allumée pour 3 médecins pilotes en W3, full rollout après W4.

## Métriques de succès

À monitorer via Monitor.dartank.com :
- Templates créés par médecin actif (cible ≥ 3 / médecin / mois)
- % d'ordonnances utilisant un template (cible ≥ 30% en M3)
- Temps de rédaction d'ordonnance avant/après (cible -50%)

## Effort

| Composant | Effort |
|---|---|
| Migration + schéma | 1h |
| API CRUD doctor (4 routes) + tests | 6h |
| API admin (4 routes) + audit + tests | 4h |
| Lib `templates/variables.ts` + `render.ts` + tests | 4h |
| UI liste médecin | 4h |
| UI éditeur (syntax highlight + helper) | 8h |
| UI modal application | 6h |
| UI admin (réutilise éditeur) | 2h |
| Seed 10 templates officiels | 2h (relus par médecin) |
| E2E Playwright | 3h |
| Disclaimer légal + revue | 1h |
| **Total** | **~41h** |

= 1 personne × 1 semaine intense, ou 2 devs × 2-3 jours.

## Hors scope V1 (V2+)

- Notes de consultation (target_type='consultation_note')
- Certificats médicaux structurés (target_type='certificate')
- Partage entre médecins (publication publique ou aux connexions)
- Mise à jour cascade des clones quand un officiel change
- Import/export JSON pour backup médecin
- Statistiques d'usage côté médecin (mes templates les plus utilisés)
- Dictaphone (vocal-to-text)
- Pièces jointes attachées au template

---

# Corrections V2 — post code-reviewer (2026-05-03)

Le spec V1 a été reviewé par un agent indépendant qui a identifié 5 blockers + suggestions. Cette section patche les sections concernées. **Toutes les corrections sont normatives et remplacent V1 sur les points listés.**

## B1 — Sécurité XSS via interpolation de variables (BLOCKER)

**Risque** : un patient saisit `<img onerror="alert(1)">` dans son `first_name`. Le template `{{first_name}}` interpolé sans escape casse la sandbox du sanitizer markdown.

**Correctif** dans `apps/web/lib/templates/render.ts` :

```typescript
import { escape as escapeHtml } from 'lodash-es';  // ou impl maison

function safeInterpolate(value: unknown, format?: VariableFormat): string {
  if (value === null || value === undefined || value === '') return '___';
  const formatted = formatValue(value, format);
  // Échappement HTML systématique avant insertion dans le markdown
  return escapeHtml(formatted);
}
```

**Côté affichage** : le markdown rendu passe **obligatoirement** par `rehype-sanitize` (allowlist stricte : pas de `script`, `iframe`, `object`, `embed`, `style`, ni de `on*` handlers). Configuration appliquée à la fois pour le preview live, le PDF, et l'impression.

**Côté serveur** : le `body_markdown` saisi est validé au POST/PATCH via `rehype-parse` + `rehype-sanitize` ; toute balise interdite → `400 UNSAFE_MARKDOWN` avec liste des éléments retirés.

## B2 — IDOR sur `/template-context` (BLOCKER)

**Risque** : un médecin récupère le contexte d'un patient qu'il ne suit pas en devinant un UUID.

**Correctif** : l'endpoint `GET /api/medecin/patients/[id]/template-context?appointmentId=:apptId` doit valider en transaction :

1. `appointment.doctor_id === session.user.id` (médecin connecté = médecin du RDV)
2. `appointment.patient_id === patientId` (RDV concerne ce patient)
3. Sinon → `403 FORBIDDEN` (pas 404, pour ne pas révéler l'existence)

**`appointmentId` devient OBLIGATOIRE** (pas optionnel comme V1). Pour les tests "à blanc" depuis l'éditeur, utiliser un endpoint séparé `GET /api/medecin/template-context/preview` qui retourne un patient fictif sans accès DB patient.

## B3 — Ambiguïté `usage_count` (BLOCKER léger)

**Risque** : V1 incrémente `usage_count` au clone, mais "usage" devrait refléter l'application réelle dans une ordonnance.

**Correctif** : remplacer le champ unique par deux champs distincts :

```sql
ALTER TABLE prescription_templates
  -- Supprimer: usage_count integer
  ADD COLUMN apply_count integer NOT NULL DEFAULT 0,   -- nb d'insertions dans une prescription réelle
  ADD COLUMN clone_count integer NOT NULL DEFAULT 0;   -- nb de duplications dans des perso
```

- `clone_count` incrémenté par le endpoint `/clone`
- `apply_count` incrémenté par le hook qui crée la `prescription` (si `template_id` est passé — voir B4)

## B4 — Traçabilité `prescriptions.template_id` (BLOCKER léger)

**Risque** : impossible de mesurer la métrique "% d'ordonnances utilisant un template" sans lien explicite.

**Correctif** : ajout d'une colonne nullable sur `prescriptions` :

```sql
ALTER TABLE prescriptions
  ADD COLUMN template_id uuid REFERENCES prescription_templates(id) ON DELETE SET NULL;

CREATE INDEX prescriptions_template_idx
  ON prescriptions(template_id) WHERE template_id IS NOT NULL;
```

Lors de la création d'une ordonnance, si le médecin a inséré depuis un template, on stocke l'`id` du template source. Permet :
- Métrique de succès officielle
- Debug "quelle template a généré cette ordo bizarre"
- Audit clinique en cas de litige

## B5 — Audit médecin manquant (BLOCKER)

**Risque** : santé = données sensibles, audit doit être bilatéral. V1 ne loggait que les actions admin.

**Correctif** : nouvelle table `template_audit_logs` (similaire à `admin_audit_logs` mais côté médecin) :

```sql
CREATE TABLE template_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  varchar(10) NOT NULL,   -- 'doctor' | 'admin'
  actor_id    uuid NOT NULL,
  template_id uuid NOT NULL,
  action      varchar(20) NOT NULL,   -- created | edited | cloned | deleted | applied
  before      jsonb,
  after       jsonb,
  context     jsonb,                  -- ip, user_agent, etc.
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX template_audit_actor_idx ON template_audit_logs(actor_type, actor_id, created_at DESC);
CREATE INDEX template_audit_template_idx ON template_audit_logs(template_id, created_at DESC);
```

Wrapper helper `withTemplateAudit({ actorType, action, getBefore, getAfter })` analogue à `withAdminAudit`. Toutes les mutations doctor + admin l'utilisent.

## B6 — RGPD / soft delete sur cascade médecin (BLOCKER léger)

**Risque** : `doctor_id ON DELETE CASCADE` détruit en dur les templates persos quand un médecin est supprimé. Perd l'audit.

**Correctif** : changer la cascade et adapter la contrainte :

```sql
-- Schéma révisé
doctor_id  uuid REFERENCES doctors(id) ON DELETE SET NULL,
-- ...
CONSTRAINT templates_ownership CHECK (
  (is_official = true AND doctor_id IS NULL)            -- officiel
  OR (is_official = false AND doctor_id IS NOT NULL)    -- perso actif
  OR (is_official = false AND doctor_id IS NULL AND deleted_at IS NOT NULL)  -- orphan archivé
)
```

Trigger `BEFORE DELETE ON doctors` qui soft-delete les templates persos avant le SET NULL :

```sql
CREATE OR REPLACE FUNCTION soft_delete_doctor_templates() RETURNS trigger AS $$
BEGIN
  UPDATE prescription_templates SET deleted_at = now() WHERE doctor_id = OLD.id;
  RETURN OLD;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER doctors_before_delete_templates
  BEFORE DELETE ON doctors
  FOR EACH ROW EXECUTE FUNCTION soft_delete_doctor_templates();
```

## B7 — `age` ambigu : maintenant ou au RDV ?

**Risque** : ré-imprimer une ordonnance d'un RDV passé re-calcule l'âge à `now()` → faux.

**Correctif** : variable explicite séparée :

| Variable | Calcul |
|---|---|
| `{{age}}` | Âge **au moment de l'application du template** (today). Pour use-cases simples. |
| `{{age_at_appointment}}` | Âge **au moment du RDV** (`appointment.starts_at - patient.dob`). À utiliser dans les ordonnances pédiatriques. |

Documentée dans le helper panel + commentaire dans le seed des templates pédiatriques (#2 et #9 utilisent `{{age_at_appointment}}` explicitement).

## B8 — Single-query `template-context` (perf)

**Correctif** : la query Drizzle doit être unique avec `with` relations :

```typescript
const ctx = await db.query.appointments.findFirst({
  where: and(
    eq(appointments.id, appointmentId),
    eq(appointments.doctorId, session.user.id),       // B2
    eq(appointments.patientId, patientId)             // B2
  ),
  with: {
    patient: { with: { medicalProfile: true } },
    doctor: { with: { primaryPractice: true } },
    appointmentType: true,
  },
});
```

Une seule requête SQL avec JOINs (Drizzle gère). Pas de N+1.

## Suggestions adoptées

- **`language` en `char(2)` + CHECK** :
  ```sql
  language char(2) NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'ar'))
  ```
- **Index trigram** pour search :
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX prescription_templates_title_trgm
    ON prescription_templates USING gin (title gin_trgm_ops) WHERE deleted_at IS NULL;
  ```
- **Versioning léger** :
  ```sql
  ALTER TABLE prescription_templates
    ADD COLUMN version int NOT NULL DEFAULT 1;
  -- Incrémenté à chaque PATCH (trigger ou côté API)
  ```
- **Seed idempotent avec `slug`** :
  ```sql
  ALTER TABLE prescription_templates
    ADD COLUMN slug varchar(60);
  CREATE UNIQUE INDEX prescription_templates_official_slug_uidx
    ON prescription_templates(slug) WHERE is_official = true AND deleted_at IS NULL;

  -- Seed devient :
  INSERT INTO prescription_templates (slug, doctor_id, is_official, ...)
  VALUES ('antibio-amoxi-7j', NULL, true, ...)
  ON CONFLICT (slug) WHERE is_official = true DO NOTHING;
  ```
- **Bouton "Tester avec un vrai patient"** dans l'éditeur : combobox patients du médecin → permet de tester rendu avec données réelles. Behind feature flag `template_preview_real_patient` pour activer prudemment.

## Réponses aux questions ouvertes

- **Officiel supprimé + clones existants** : `cloned_from_id ON DELETE SET NULL`. Côté UI, badge "(modèle retiré)" affiché si `cloned_from_id` mais original `deleted_at IS NOT NULL`. Le clone reste utilisable.
- **DPO Tunisie loi 2004-63** : médecin authentifié sur SA fiche RDV → pas de fuite (auth + IDOR check B2). À documenter dans le registre des traitements (Doktori → DPO contact).
- **Multi-langue 1 template = 1 langue** : confirmé pour MVP. **Ajout V2** : bouton "Cloner en AR" qui pré-remplit la traduction via Google Translate API + révision médecin obligatoire avant publication. Pas dans le scope V1.
- **Limite 100 templates/médecin** : relevée à **200** par défaut, configurable via `feature_flags.template_limit_per_doctor` (Wave 13). Spécialistes (cardio, derma) en ont souvent 100-150.
- **`prescriptions.template_id`** : ajoutée (voir B4). Métrique de succès officielle s'appuie dessus.

## Migrations finales révisées

L'ordre des migrations devient :

1. `0067_prescription_templates.sql` — table principale + indexes + contraintes V2 + triggers
2. `0068_prescriptions_template_link.sql` — `ALTER TABLE prescriptions ADD COLUMN template_id`
3. `0069_template_audit_logs.sql` — table audit
4. `0070_prescription_templates_seed.sql` — 10 officiels avec slugs + ON CONFLICT idempotent

Toutes en `IF NOT EXISTS` / dollar-quoted, traçables via `apply-migrations-prod.sh`.

## Effort révisé

L'effort initial de 41h passe à **~52h** avec les corrections V2 :
- +3h : escape HTML + sanitization markdown serveur
- +2h : IDOR check + endpoint preview séparé
- +3h : table + helper audit médecin
- +2h : trigger soft-delete cascade
- +1h : variable `age_at_appointment` + variable explicite

Soit ~6.5 jours-homme pour 1 dev, ou 3 jours en parallèle 2 devs.

## Status

- V1 : approved en brainstorm 2026-05-03
- V2 : corrections post-review 2026-05-03 — **APPROVED** prêt pour writing-plans
- Avant W1 : disclaimer juridique validé par équipe légale (toujours bloquant V1+V2)
