# Doktori Prescription Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre aux médecins de créer, partager et appliquer des modèles d'ordonnance avec variables auto-remplies depuis les données patient (`{{first_name}}`, `{{weight}}`, `{{today_long}}`, etc.), incluant 10 modèles officiels Doktori pré-fournis.

**Architecture:** Nouvelle table `prescription_templates` (officiels NULL doctor + persos avec doctor_id), moteur de rendu Markdown côté client avec escape HTML strict (anti-XSS), audit bilatéral (table `template_audit_logs`), modal de preview/édition avant insertion dans l'ordonnance principale. Schéma extensible via `target_type` pour notes/certificats en V2.

**Tech Stack:** Next.js 16 + Drizzle ORM + PostgreSQL 15 + React 19 + Tailwind + shadcn primitives + lucide-react + rehype-sanitize + pg_trgm.

**Spec source:**
- Local: `/Users/omario/.claude/projects/-Users-omario/memory/doktori_templates_design_20260503.md`
- GitHub: https://github.com/omario75013/doktori/blob/main/docs/specs/2026-05-03-prescription-templates-design.md

**Constraints (NON-NEGOTIABLE):**
- TDD-first sur **toute** logique métier (variables, render, sanitization)
- 5 blockers V2 à respecter strictement : XSS sanitization, IDOR check, audit médecin bilatéral, soft-delete cascade, séparation `apply_count`/`clone_count`
- Migration tracking via `__doktori_migrations` table, déploiement via `/opt/doktori/apply-migrations-prod.sh` (zero régression policy Omar)
- Disclaimer juridique validé par équipe légale **AVANT** le seed des 10 templates officiels (bloquant W4)
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`)

---

## File Structure

### Migrations (à créer)
```
packages/db/migrations/
├── 0067_prescription_templates.sql        # table principale + indexes + triggers
├── 0068_prescriptions_template_link.sql   # ALTER prescriptions ADD template_id
├── 0069_template_audit_logs.sql           # table audit bilatéral
└── 0070_prescription_templates_seed.sql   # 10 templates officiels FR + slug + ON CONFLICT
```

### Schema (à modifier)
```
packages/db/src/schema.ts                  # +prescriptionTemplates, +templateAuditLogs, +prescriptions.template_id
```

### Lib templates (à créer)
```
apps/web/lib/templates/
├── variables.ts                           # 22 variables registry + types + resolveVariable
├── render.ts                              # render(template, ctx) → { body, unresolved }
├── sanitize.ts                            # sanitize markdown server-side (rehype-sanitize)
├── audit.ts                               # withTemplateAudit() helper
├── variables.test.ts                      # tests resolveVariable
├── render.test.ts                         # tests render() — XSS, formats, locale, missing
└── sanitize.test.ts                       # tests sanitize XSS
```

### API doctor (à créer)
```
apps/web/app/api/medecin/templates/
├── route.ts                               # GET list + POST create
├── [id]/route.ts                          # GET / PATCH / DELETE (soft)
└── [id]/clone/route.ts                    # POST clone

apps/web/app/api/medecin/patients/[id]/template-context/
└── route.ts                               # GET context for render (IDOR-safe)

apps/web/app/api/medecin/template-context/preview/
└── route.ts                               # GET fictive context for editor preview
```

### API admin (à créer)
```
apps/web/app/api/admin/templates/
├── route.ts                               # GET list + POST create (super_admin)
└── [id]/route.ts                          # PATCH / DELETE (super_admin + audit)
```

### UI medecin (à créer)
```
apps/web/app/(medecin)/medecin/modeles/
├── page.tsx                               # Liste officiels + persos
├── nouveau/page.tsx                       # Form création
├── [id]/edit/page.tsx                     # Form édition
└── components/
    ├── template-list.tsx                  # Liste avec sections + filtres
    ├── template-editor.tsx                # Editor 2 cols (réutilisé admin)
    ├── variable-helper-panel.tsx          # Sidebar des 22 vars
    └── template-preview.tsx               # Live preview avec patient fictif
```

### UI medecin — modal application (à créer)
```
apps/web/app/(medecin)/medecin/rendez-vous/[id]/components/
└── prescription-template-modal.tsx        # Modal application sur fiche RDV
```

### UI admin (à créer)
```
apps/web/app/(admin)/admin/templates/
├── page.tsx
├── nouveau/page.tsx
└── [id]/edit/page.tsx
```

### Tests (à créer)
```
apps/web/__tests__/api/medecin/templates.test.ts
apps/web/__tests__/api/medecin/template-context.test.ts
apps/web/__tests__/api/admin/templates.test.ts
apps/web/e2e/templates.spec.ts
```

### Modifications (existant)
```
apps/web/app/(medecin)/medecin/rendez-vous/[id]/components/prescription-editor.tsx
                                           # ajouter bouton "Choisir un modèle" + intégration modal
apps/web/lib/feature-flags.ts (ou équivalent)
                                           # ajouter prescription_templates_enabled
```

---

# Phase W1 — Backend foundation (15-18 tasks, ~16h)

**Goal:** Schéma DB + migrations + moteur de variables + API doctor avec tests verts.
**Definition of Done:** Médecin authentifié peut créer/lire/modifier/supprimer ses templates via API, avec audit log écrit.

---

### Task W1.1 — Bootstrap : créer la branche feature

**Files:**
- N/A (git only)

- [ ] **Step 1: Créer la branche dans le repo Doktori (côté dev VM, ssh dev-nizar ou dev-ashraf)**

```bash
ssh root@65.21.89.105 "ssh root@10.10.10.101 'cd /home/nizar/doktori && git fetch origin && git checkout -b feat/prescription-templates origin/main'"
```

Expected: branche créée, HEAD à `fc2b376` ou plus récent.

- [ ] **Step 2: Vérifier le repo est propre**

Run: `git status` (sur la VM dev)
Expected: `nothing to commit, working tree clean`

---

### Task W1.2 — Migration 0067 : table principale `prescription_templates`

**Files:**
- Create: `packages/db/migrations/0067_prescription_templates.sql`

- [ ] **Step 1: Créer le fichier de migration**

```sql
-- 0067_prescription_templates — Templates de notes/ordonnances avec variables
-- Idempotent. Soft-delete pattern. Officiels (doctor_id NULL) vs persos (doctor_id NOT NULL).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS prescription_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Owner (NULL pour les officiels Doktori)
  doctor_id       uuid REFERENCES doctors(id) ON DELETE SET NULL,
  -- Métadonnées
  title           varchar(120) NOT NULL,
  description     text,
  language        char(2) NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'ar')),
  slug            varchar(60),                                       -- pour seed idempotent
  -- Contenu
  body_markdown   text NOT NULL,
  -- Extensibilité
  target_type     varchar(20) NOT NULL DEFAULT 'prescription',
  -- Provenance
  is_official     boolean NOT NULL DEFAULT false,
  cloned_from_id  uuid REFERENCES prescription_templates(id) ON DELETE SET NULL,
  -- Stats
  apply_count     integer NOT NULL DEFAULT 0,
  clone_count     integer NOT NULL DEFAULT 0,
  last_used_at    timestamptz,
  -- Versioning
  version         integer NOT NULL DEFAULT 1,
  -- Audit
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  -- Contrainte ownership (officiel | perso actif | orphan archivé)
  CONSTRAINT templates_ownership CHECK (
    (is_official = true AND doctor_id IS NULL)
    OR (is_official = false AND doctor_id IS NOT NULL)
    OR (is_official = false AND doctor_id IS NULL AND deleted_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS prescription_templates_doctor_idx
  ON prescription_templates(doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS prescription_templates_official_idx
  ON prescription_templates(is_official, language) WHERE deleted_at IS NULL AND is_official = true;
CREATE INDEX IF NOT EXISTS prescription_templates_target_idx
  ON prescription_templates(target_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS prescription_templates_title_trgm
  ON prescription_templates USING gin (title gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS prescription_templates_official_slug_uidx
  ON prescription_templates(slug) WHERE is_official = true AND deleted_at IS NULL;

-- Trigger : si un médecin est supprimé, soft-delete ses templates persos avant le SET NULL
CREATE OR REPLACE FUNCTION soft_delete_doctor_templates() RETURNS trigger AS $$
BEGIN
  UPDATE prescription_templates
    SET deleted_at = now(), updated_at = now()
    WHERE doctor_id = OLD.id AND deleted_at IS NULL;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS doctors_before_delete_templates ON doctors;
CREATE TRIGGER doctors_before_delete_templates
  BEFORE DELETE ON doctors
  FOR EACH ROW EXECUTE FUNCTION soft_delete_doctor_templates();

-- Trigger : auto-update updated_at + version sur PATCH
CREATE OR REPLACE FUNCTION bump_template_version() RETURNS trigger AS $$
BEGIN
  IF NEW.body_markdown IS DISTINCT FROM OLD.body_markdown
     OR NEW.title IS DISTINCT FROM OLD.title THEN
    NEW.version = OLD.version + 1;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prescription_templates_bump_version ON prescription_templates;
CREATE TRIGGER prescription_templates_bump_version
  BEFORE UPDATE ON prescription_templates
  FOR EACH ROW EXECUTE FUNCTION bump_template_version();
```

- [ ] **Step 2: Tester la migration en local (dev VM)**

```bash
cd /home/nizar/doktori/packages/db
DATABASE_URL=postgresql://doktori:doktori_dev_2026@localhost:5434/doktori \
  psql $DATABASE_URL -v ON_ERROR_STOP=1 -f migrations/0067_prescription_templates.sql
```

Expected: `CREATE EXTENSION`, `CREATE TABLE`, `CREATE INDEX × 5`, `CREATE FUNCTION × 2`, `CREATE TRIGGER × 2` sans erreur.

- [ ] **Step 3: Vérifier la table**

```bash
psql $DATABASE_URL -c "\d prescription_templates"
```

Expected: 16 colonnes, 5 indexes, 2 triggers visibles.

- [ ] **Step 4: Commit**

```bash
git add packages/db/migrations/0067_prescription_templates.sql
git commit -m "feat(db): add prescription_templates table with triggers"
```

---

### Task W1.3 — Migration 0068 : link `prescriptions.template_id`

**Files:**
- Create: `packages/db/migrations/0068_prescriptions_template_link.sql`

- [ ] **Step 1: Créer le fichier**

```sql
-- 0068 — Track which template generated each prescription (for metrics + debug)
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES prescription_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS prescriptions_template_idx
  ON prescriptions(template_id) WHERE template_id IS NOT NULL;
```

- [ ] **Step 2: Apply + verify**

```bash
psql $DATABASE_URL -v ON_ERROR_STOP=1 -f migrations/0068_prescriptions_template_link.sql
psql $DATABASE_URL -c "\d prescriptions" | grep template_id
```

Expected: `template_id | uuid | | |` visible.

- [ ] **Step 3: Commit**

```bash
git add packages/db/migrations/0068_prescriptions_template_link.sql
git commit -m "feat(db): link prescriptions to source template via template_id"
```

---

### Task W1.4 — Migration 0069 : `template_audit_logs`

**Files:**
- Create: `packages/db/migrations/0069_template_audit_logs.sql`

- [ ] **Step 1: Créer le fichier**

```sql
-- 0069 — Bilateral audit (doctor + admin) for template mutations
CREATE TABLE IF NOT EXISTS template_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  varchar(10) NOT NULL CHECK (actor_type IN ('doctor', 'admin')),
  actor_id    uuid NOT NULL,
  template_id uuid NOT NULL,
  action      varchar(20) NOT NULL CHECK (action IN ('created', 'edited', 'cloned', 'deleted', 'applied')),
  before      jsonb,
  after       jsonb,
  context     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS template_audit_actor_idx
  ON template_audit_logs(actor_type, actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_audit_template_idx
  ON template_audit_logs(template_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_audit_action_idx
  ON template_audit_logs(action);
```

- [ ] **Step 2: Apply + commit**

```bash
psql $DATABASE_URL -v ON_ERROR_STOP=1 -f migrations/0069_template_audit_logs.sql
git add packages/db/migrations/0069_template_audit_logs.sql
git commit -m "feat(db): add template_audit_logs for bilateral audit"
```

---

### Task W1.5 — Drizzle schema : ajouter les tables au schema.ts

**Files:**
- Modify: `packages/db/src/schema.ts`

- [ ] **Step 1: Identifier la section où ajouter**

Run: `grep -n "export const prescriptions" packages/db/src/schema.ts`
Expected: une seule ligne, ex `export const prescriptions = pgTable(`.

- [ ] **Step 2: Ajouter `template_id` à `prescriptions`**

Localiser la déclaration `prescriptions` et ajouter dans le bloc colonnes :

```typescript
templateId: uuid("template_id").references(() => prescriptionTemplates.id, { onDelete: "set null" }),
```

- [ ] **Step 3: Ajouter `prescriptionTemplates` après `prescriptions`**

```typescript
export const prescriptionTemplates = pgTable("prescription_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  language: varchar("language", { length: 2 }).notNull().default("fr"),
  slug: varchar("slug", { length: 60 }),
  bodyMarkdown: text("body_markdown").notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull().default("prescription"),
  isOfficial: boolean("is_official").notNull().default(false),
  clonedFromId: uuid("cloned_from_id"),
  applyCount: integer("apply_count").notNull().default(0),
  cloneCount: integer("clone_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type PrescriptionTemplate = typeof prescriptionTemplates.$inferSelect;
export type NewPrescriptionTemplate = typeof prescriptionTemplates.$inferInsert;
```

- [ ] **Step 4: Ajouter `templateAuditLogs`**

```typescript
export const templateAuditLogs = pgTable("template_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorType: varchar("actor_type", { length: 10 }).notNull(),
  actorId: uuid("actor_id").notNull(),
  templateId: uuid("template_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  context: jsonb("context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TemplateAuditLog = typeof templateAuditLogs.$inferSelect;
export type NewTemplateAuditLog = typeof templateAuditLogs.$inferInsert;
```

- [ ] **Step 5: Vérifier le typecheck**

```bash
pnpm --filter @doktori/db typecheck
```

Expected: zero erreur.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/schema.ts
git commit -m "feat(db): add Drizzle schema for prescription_templates + audit"
```

---

### Task W1.6 — Lib variables : registry des 22 variables (TDD)

**Files:**
- Create: `apps/web/lib/templates/variables.ts`
- Create: `apps/web/lib/templates/variables.test.ts`

- [ ] **Step 1: Écrire le test FIRST**

```typescript
// apps/web/lib/templates/variables.test.ts
import { describe, it, expect } from "vitest";
import { TEMPLATE_VARIABLES, resolveVariable, type TemplateContext } from "./variables";

describe("TEMPLATE_VARIABLES registry", () => {
  it("contains exactly 22 variables", () => {
    expect(Object.keys(TEMPLATE_VARIABLES)).toHaveLength(22);
  });

  it("includes all patient variables", () => {
    const patient = ["first_name", "last_name", "full_name", "age", "dob", "phone", "cin", "weight", "height", "blood_type", "allergies", "insurance"];
    for (const name of patient) expect(TEMPLATE_VARIABLES).toHaveProperty(name);
  });
});

describe("resolveVariable", () => {
  const baseCtx: TemplateContext = {
    patient: {
      id: "p1", firstName: "Sami", lastName: "Trabelsi",
      dob: new Date("1991-03-15"), phone: "+216 22 123 456",
      cin: "12345678", insuranceProvider: "CNAM",
    } as any,
    medicalProfile: { weightKg: 72, heightCm: 175, bloodType: "O+", allergies: ["Pénicilline"] } as any,
    doctor: { id: "d1", fullName: "Dr Karim Ben Ali", specialty: "Médecin Généraliste", city: "La Marsa", phone: "+216 71", registrationNumber: "CNOM 12345" } as any,
    appointment: { id: "a1", startsAt: new Date("2026-05-03T14:30:00") } as any,
    appointmentType: { name: "Consultation suivi" } as any,
    practice: { address: "12 Av. Habib Bourguiba, La Marsa" } as any,
    locale: "fr",
    now: new Date("2026-05-03T10:00:00"),
  };

  it("resolves first_name", () => {
    expect(resolveVariable("first_name", baseCtx)).toBe("Sami");
  });

  it("resolves full_name", () => {
    expect(resolveVariable("full_name", baseCtx)).toBe("Sami Trabelsi");
  });

  it("computes age from dob", () => {
    expect(resolveVariable("age", baseCtx)).toBe(35);  // 2026 - 1991, mars donc anniversaire passé
  });

  it("computes age_at_appointment differently from age", () => {
    const ctxOldAppt = { ...baseCtx, appointment: { startsAt: new Date("2024-04-10") } as any };
    expect(resolveVariable("age_at_appointment", ctxOldAppt)).toBe(33);
    expect(resolveVariable("age", ctxOldAppt)).toBe(35);  // age uses now, not appointment
  });

  it("returns null when patient missing", () => {
    expect(resolveVariable("first_name", { ...baseCtx, patient: undefined })).toBeNull();
  });

  it("returns null when dob missing for age", () => {
    expect(resolveVariable("age", { ...baseCtx, patient: { ...baseCtx.patient, dob: null } as any })).toBeNull();
  });

  it("joins allergies array", () => {
    expect(resolveVariable("allergies", baseCtx)).toBe("Pénicilline");
    const multi = { ...baseCtx, medicalProfile: { ...baseCtx.medicalProfile, allergies: ["Pénicilline", "Arachides"] } as any };
    expect(resolveVariable("allergies", multi)).toBe("Pénicilline, Arachides");
  });
});
```

- [ ] **Step 2: Run test → fail**

```bash
pnpm --filter web vitest run apps/web/lib/templates/variables.test.ts
```

Expected: FAIL `Cannot find module './variables'`.

- [ ] **Step 3: Implement minimal**

```typescript
// apps/web/lib/templates/variables.ts
import type { Doctor, Patient, Appointment, AppointmentType, DoctorPractice } from "@doktori/db";

export type VariableFormat = "date" | "date_long" | "time" | "number" | "list" | "text";

export interface TemplateContext {
  patient?: Patient;
  medicalProfile?: { weightKg?: number | null; heightCm?: number | null; bloodType?: string | null; allergies?: string[] | null };
  doctor: Doctor;
  appointment?: Appointment;
  appointmentType?: AppointmentType;
  practice?: DoctorPractice;
  locale: "fr" | "ar";
  now: Date;
}

interface VariableDef {
  format?: VariableFormat;
  resolve: (ctx: TemplateContext) => unknown;
}

export const TEMPLATE_VARIABLES = {
  // ── Patient ───────────────────────────────────────────
  first_name:  { resolve: (c) => c.patient?.firstName ?? null },
  last_name:   { resolve: (c) => c.patient?.lastName ?? null },
  full_name:   { resolve: (c) => {
    if (!c.patient) return null;
    return `${c.patient.firstName ?? ""} ${c.patient.lastName ?? ""}`.trim() || null;
  }},
  age: { format: "number", resolve: (c) => {
    if (!c.patient?.dob) return null;
    return computeAge(new Date(c.patient.dob), c.now);
  }},
  age_at_appointment: { format: "number", resolve: (c) => {
    if (!c.patient?.dob || !c.appointment?.startsAt) return null;
    return computeAge(new Date(c.patient.dob), new Date(c.appointment.startsAt));
  }},
  dob: { format: "date", resolve: (c) => c.patient?.dob ?? null },
  phone: { resolve: (c) => c.patient?.phone ?? null },
  cin: { resolve: (c) => c.patient?.cin ?? null },
  weight: { format: "number", resolve: (c) => c.medicalProfile?.weightKg ?? null },
  height: { format: "number", resolve: (c) => c.medicalProfile?.heightCm ?? null },
  blood_type: { resolve: (c) => c.medicalProfile?.bloodType ?? null },
  allergies: { format: "list", resolve: (c) => c.medicalProfile?.allergies ?? null },
  insurance: { resolve: (c) => c.patient?.insuranceProvider ?? null },
  // ── Doctor ────────────────────────────────────────────
  doctor_name: { resolve: (c) => c.doctor.fullName ?? null },
  doctor_specialty: { resolve: (c) => c.doctor.specialty ?? null },
  doctor_city: { resolve: (c) => c.doctor.city ?? null },
  doctor_phone: { resolve: (c) => c.doctor.phone ?? null },
  doctor_address: { resolve: (c) => c.practice?.address ?? null },
  doctor_registration: { resolve: (c) => c.doctor.registrationNumber ?? null },
  // ── Appointment ───────────────────────────────────────
  appointment_date: { format: "date", resolve: (c) => c.appointment?.startsAt ?? null },
  appointment_type: { resolve: (c) => c.appointmentType?.name ?? null },
  // ── System ────────────────────────────────────────────
  today: { format: "date", resolve: (c) => c.now },
  today_long: { format: "date_long", resolve: (c) => c.now },
  time: { format: "time", resolve: (c) => c.now },
} as const satisfies Record<string, VariableDef>;

export type TemplateVariable = keyof typeof TEMPLATE_VARIABLES;

export function resolveVariable(name: TemplateVariable, ctx: TemplateContext): unknown {
  const def = TEMPLATE_VARIABLES[name];
  if (!def) return null;
  const raw = def.resolve(ctx);
  if (raw === null || raw === undefined || raw === "") return null;
  if (Array.isArray(raw)) {
    return raw.length === 0 ? null : raw.join(ctx.locale === "ar" ? "، " : ", ");
  }
  return raw;
}

function computeAge(dob: Date, ref: Date): number {
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
}
```

Note: `age_at_appointment` est en bonus (mentionné dans la spec V2 B7). Le total devient 23 — ajuster le test `expect(...).toHaveLength(22)` à `toHaveLength(23)` ou retirer `age_at_appointment` du registry et le mettre dans `render.ts` comme alias spécial. Décision retenue : **garder dans le registry à 23**.

Modifier le test : `expect(...).toHaveLength(23)`.

- [ ] **Step 4: Run test → pass**

```bash
pnpm --filter web vitest run apps/web/lib/templates/variables.test.ts
```

Expected: 8 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/templates/variables.ts apps/web/lib/templates/variables.test.ts
git commit -m "feat(templates): variables registry + resolveVariable (TDD, 8 tests)"
```

---

### Task W1.7 — Lib render : moteur d'interpolation avec escape XSS (TDD critique)

**Files:**
- Create: `apps/web/lib/templates/render.ts`
- Create: `apps/web/lib/templates/render.test.ts`

- [ ] **Step 1: Écrire les tests — XSS prioritaire (BLOCKER B1)**

```typescript
// apps/web/lib/templates/render.test.ts
import { describe, it, expect } from "vitest";
import { render } from "./render";
import type { TemplateContext } from "./variables";

const ctx = (override: Partial<TemplateContext> = {}): TemplateContext => ({
  patient: { firstName: "Sami", lastName: "Trabelsi", dob: new Date("1991-03-15") } as any,
  medicalProfile: { weightKg: 72, allergies: ["Pénicilline"] } as any,
  doctor: { fullName: "Dr Karim Ben Ali", specialty: "Médecin Généraliste" } as any,
  locale: "fr",
  now: new Date("2026-05-03T10:00:00"),
  ...override,
});

describe("render() — basics", () => {
  it("replaces {{first_name}} with patient first name", () => {
    const r = render("Bonjour {{first_name}}", ctx());
    expect(r.body).toBe("Bonjour Sami");
    expect(r.unresolved).toEqual([]);
  });

  it("replaces multiple variables", () => {
    const r = render("{{first_name}} {{last_name}}, {{age}} ans", ctx());
    expect(r.body).toBe("Sami Trabelsi, 35 ans");
  });

  it("returns ___ for missing variables and tracks them", () => {
    const r = render("Poids: {{weight}} kg, Taille: {{height}} cm",
      ctx({ medicalProfile: { weightKg: 72 } as any })
    );
    expect(r.body).toBe("Poids: 72 kg, Taille: ___ cm");
    expect(r.unresolved).toEqual(["height"]);
  });

  it("preserves unknown variables as-is", () => {
    const r = render("{{firstname}} {{first_name}}", ctx());  // typo
    expect(r.body).toBe("{{firstname}} Sami");
  });
});

describe("render() — XSS sanitization (BLOCKER B1)", () => {
  it("escapes HTML in patient data", () => {
    const malicious = ctx({
      patient: { firstName: '<img src=x onerror=alert(1)>', lastName: 'Test', dob: new Date("1991-03-15") } as any
    });
    const r = render("Bonjour {{first_name}}", malicious);
    expect(r.body).not.toContain("<img");
    expect(r.body).toContain("&lt;img");
    expect(r.body).toContain("&gt;");
  });

  it("escapes script tags", () => {
    const malicious = ctx({
      patient: { firstName: '<script>fetch("/steal")</script>', lastName: '', dob: new Date("1991-03-15") } as any
    });
    const r = render("{{first_name}}", malicious);
    expect(r.body).not.toContain("<script>");
    expect(r.body).toContain("&lt;script&gt;");
  });

  it("escapes ampersands and quotes", () => {
    const malicious = ctx({
      patient: { firstName: 'Test & "quotes"', lastName: '', dob: new Date("1991-03-15") } as any
    });
    const r = render("{{first_name}}", malicious);
    expect(r.body).toBe("Test &amp; &quot;quotes&quot;");
  });
});

describe("render() — formatting locale", () => {
  it("formats today_long in French", () => {
    const r = render("{{today_long}}", ctx({ now: new Date("2026-05-03T10:00:00"), locale: "fr" }));
    expect(r.body).toMatch(/3 mai 2026/);
  });

  it("formats today_long in Arabic", () => {
    const r = render("{{today_long}}", ctx({ now: new Date("2026-05-03T10:00:00"), locale: "ar" }));
    expect(r.body).toMatch(/2026/);  // contient l'année au minimum
  });

  it("formats date as DD/MM/YYYY in French", () => {
    const r = render("{{today}}", ctx({ now: new Date("2026-05-03T10:00:00"), locale: "fr" }));
    expect(r.body).toBe("03/05/2026");
  });

  it("joins allergies with comma in French", () => {
    const r = render("{{allergies}}",
      ctx({ medicalProfile: { allergies: ["Pénicilline", "Arachides"] } as any })
    );
    expect(r.body).toBe("Pénicilline, Arachides");
  });
});

describe("render() — performance", () => {
  it("handles 100 variables in <50ms", () => {
    const tpl = Array(100).fill("{{first_name}}").join(" ");
    const t0 = performance.now();
    render(tpl, ctx());
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
```

- [ ] **Step 2: Run → fail**

```bash
pnpm --filter web vitest run apps/web/lib/templates/render.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement render.ts avec escape strict**

```typescript
// apps/web/lib/templates/render.ts
import { TEMPLATE_VARIABLES, resolveVariable, type TemplateContext, type TemplateVariable, type VariableFormat } from "./variables";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function formatValue(value: unknown, format: VariableFormat | undefined, locale: "fr" | "ar"): string {
  if (value === null || value === undefined) return "";
  const intlLocale = locale === "ar" ? "ar-TN" : "fr-TN";
  switch (format) {
    case "date":
      return new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value as any));
    case "date_long":
      return new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(value as any));
    case "time":
      return new Intl.DateTimeFormat(intlLocale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value as any));
    case "number":
      return new Intl.NumberFormat(intlLocale).format(Number(value));
    case "list":
    case "text":
    default:
      return String(value);
  }
}

export interface RenderResult {
  body: string;
  unresolved: TemplateVariable[];
}

export function render(template: string, ctx: TemplateContext): RenderResult {
  const unresolved: TemplateVariable[] = [];
  const body = template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    if (!(name in TEMPLATE_VARIABLES)) return match; // unknown → preserve as-is
    const value = resolveVariable(name as TemplateVariable, ctx);
    if (value === null || value === undefined || value === "") {
      unresolved.push(name as TemplateVariable);
      return "___";
    }
    const fmt = (TEMPLATE_VARIABLES as any)[name].format;
    const formatted = formatValue(value, fmt, ctx.locale);
    return escapeHtml(formatted);  // ← BLOCKER B1
  });
  return { body, unresolved };
}
```

- [ ] **Step 4: Run → pass**

```bash
pnpm --filter web vitest run apps/web/lib/templates/render.test.ts
```

Expected: 12 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/templates/render.ts apps/web/lib/templates/render.test.ts
git commit -m "feat(templates): render() with strict HTML escape (XSS B1) and locale formatting"
```

---

### Task W1.8 — Lib sanitize : Markdown server-side sanitization (TDD)

**Files:**
- Create: `apps/web/lib/templates/sanitize.ts`
- Create: `apps/web/lib/templates/sanitize.test.ts`

- [ ] **Step 1: Tests d'abord**

```typescript
// apps/web/lib/templates/sanitize.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeMarkdown, validateMarkdown } from "./sanitize";

describe("sanitizeMarkdown", () => {
  it("preserves safe markdown", () => {
    const input = "# Title\n\n**bold** _italic_\n- list item";
    const out = sanitizeMarkdown(input);
    expect(out).toContain("# Title");
    expect(out).toContain("**bold**");
  });

  it("strips script tags", () => {
    const out = sanitizeMarkdown("Hello <script>alert(1)</script>");
    expect(out).not.toContain("<script>");
  });

  it("strips iframe", () => {
    const out = sanitizeMarkdown("<iframe src='evil'></iframe>");
    expect(out).not.toContain("<iframe");
  });

  it("strips on* event handlers", () => {
    const out = sanitizeMarkdown("<img src=x onerror='alert(1)'>");
    expect(out).not.toMatch(/onerror/i);
  });
});

describe("validateMarkdown", () => {
  it("accepts safe markdown", () => {
    const r = validateMarkdown("# Hello {{first_name}}");
    expect(r.ok).toBe(true);
  });

  it("rejects body > 10KB", () => {
    const r = validateMarkdown("a".repeat(10_001));
    expect(r.ok).toBe(false);
    expect(r.error).toBe("BODY_TOO_LARGE");
  });

  it("rejects empty body", () => {
    const r = validateMarkdown("");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("BODY_REQUIRED");
  });

  it("rejects unsafe tags", () => {
    const r = validateMarkdown("<script>x</script>");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("UNSAFE_MARKDOWN");
  });
});
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm --filter web add rehype-sanitize rehype-parse rehype-stringify unified
```

- [ ] **Step 3: Implement**

```typescript
// apps/web/lib/templates/sanitize.ts
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

const SAFE_SCHEMA = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    // Markdown-friendly extras
  ].filter((t) => !["script", "iframe", "object", "embed", "style", "form", "input"].includes(t)),
  attributes: {
    ...(defaultSchema.attributes || {}),
    "*": [...(defaultSchema.attributes?.["*"] || []), "className"].filter((a) => typeof a !== "string" || !/^on/i.test(a)),
  },
};

const processor = unified().use(rehypeParse, { fragment: true }).use(rehypeSanitize, SAFE_SCHEMA).use(rehypeStringify);

export function sanitizeMarkdown(input: string): string {
  // Sanitize HTML inline, preserve markdown syntax
  return processor.processSync(input).toString();
}

const MAX_BODY_BYTES = 10_000;
const FORBIDDEN_PATTERNS = [/<script/i, /<iframe/i, /<object/i, /<embed/i, /\son\w+=/i, /javascript:/i];

export type ValidateResult =
  | { ok: true }
  | { ok: false; error: "BODY_REQUIRED" | "BODY_TOO_LARGE" | "UNSAFE_MARKDOWN"; details?: string[] };

export function validateMarkdown(input: string): ValidateResult {
  if (!input || input.trim().length === 0) return { ok: false, error: "BODY_REQUIRED" };
  if (Buffer.byteLength(input, "utf8") > MAX_BODY_BYTES) return { ok: false, error: "BODY_TOO_LARGE" };
  const matches = FORBIDDEN_PATTERNS.filter((p) => p.test(input)).map((p) => p.source);
  if (matches.length > 0) return { ok: false, error: "UNSAFE_MARKDOWN", details: matches };
  return { ok: true };
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter web vitest run apps/web/lib/templates/sanitize.test.ts
git add apps/web/lib/templates/sanitize.ts apps/web/lib/templates/sanitize.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(templates): server-side markdown sanitization + validation"
```

---

### Task W1.9 — Helper `withTemplateAudit`

**Files:**
- Create: `apps/web/lib/templates/audit.ts`
- Create: `apps/web/lib/templates/audit.test.ts`

- [ ] **Step 1: Tests**

```typescript
// apps/web/lib/templates/audit.test.ts
import { describe, it, expect, vi } from "vitest";
import { logTemplateAudit } from "./audit";
import { db } from "@doktori/db";  // ou mock approprié

describe("logTemplateAudit", () => {
  it("inserts an audit row with required fields", async () => {
    const insertSpy = vi.spyOn(db, "insert").mockReturnValue({ values: vi.fn().mockResolvedValue([{ id: "audit1" }]) } as any);
    await logTemplateAudit({
      actorType: "doctor",
      actorId: "d1",
      templateId: "t1",
      action: "created",
      after: { title: "Test" },
      context: { ip: "1.2.3.4" },
    });
    expect(insertSpy).toHaveBeenCalled();
  });

  it("does not throw on insert error (fire-and-forget)", async () => {
    vi.spyOn(db, "insert").mockReturnValue({ values: vi.fn().mockRejectedValue(new Error("DB down")) } as any);
    await expect(logTemplateAudit({
      actorType: "doctor", actorId: "d1", templateId: "t1", action: "created",
    })).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/web/lib/templates/audit.ts
import { db, templateAuditLogs } from "@doktori/db";

export interface AuditParams {
  actorType: "doctor" | "admin";
  actorId: string;
  templateId: string;
  action: "created" | "edited" | "cloned" | "deleted" | "applied";
  before?: unknown;
  after?: unknown;
  context?: Record<string, unknown>;
}

export async function logTemplateAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(templateAuditLogs).values({
      actorType: params.actorType,
      actorId: params.actorId,
      templateId: params.templateId,
      action: params.action,
      before: params.before as any,
      after: params.after as any,
      context: params.context as any,
    });
  } catch (err) {
    console.error("[template-audit] insert failed", err);
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter web vitest run apps/web/lib/templates/audit.test.ts
git add apps/web/lib/templates/audit.ts apps/web/lib/templates/audit.test.ts
git commit -m "feat(templates): logTemplateAudit helper (B5 bilateral audit)"
```

---

### Task W1.10 — API : `GET/POST /api/medecin/templates`

**Files:**
- Create: `apps/web/app/api/medecin/templates/route.ts`
- Create: `apps/web/__tests__/api/medecin/templates.test.ts` (suite, alimentée à chaque endpoint)

- [ ] **Step 1: Tests d'intégration GET + POST**

```typescript
// apps/web/__tests__/api/medecin/templates.test.ts (extrait initial)
import { describe, it, expect, beforeEach } from "vitest";
import { db, prescriptionTemplates } from "@doktori/db";
import { createTestDoctor, signInDoctor, makeRequest } from "../helpers";
import { eq } from "drizzle-orm";

describe("GET /api/medecin/templates", () => {
  beforeEach(async () => {
    await db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.isOfficial, false));
  });

  it("returns own templates + officials", async () => {
    const doctor = await createTestDoctor();
    await db.insert(prescriptionTemplates).values([
      { doctorId: doctor.id, title: "Mon template", bodyMarkdown: "X", language: "fr" },
      { doctorId: null, isOfficial: true, slug: "test-official", title: "Officiel", bodyMarkdown: "Y", language: "fr" },
    ]);
    const session = await signInDoctor(doctor);
    const res = await makeRequest("/api/medecin/templates", { method: "GET", session });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.templates).toHaveLength(2);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await makeRequest("/api/medecin/templates", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("filters by language", async () => {
    const doctor = await createTestDoctor();
    await db.insert(prescriptionTemplates).values([
      { doctorId: doctor.id, title: "FR", bodyMarkdown: "X", language: "fr" },
      { doctorId: doctor.id, title: "AR", bodyMarkdown: "Y", language: "ar" },
    ]);
    const session = await signInDoctor(doctor);
    const res = await makeRequest("/api/medecin/templates?language=ar", { method: "GET", session });
    const body = await res.json();
    expect(body.templates).toHaveLength(1);
    expect(body.templates[0].language).toBe("ar");
  });
});

describe("POST /api/medecin/templates", () => {
  it("creates a template owned by the doctor", async () => {
    const doctor = await createTestDoctor();
    const session = await signInDoctor(doctor);
    const res = await makeRequest("/api/medecin/templates", {
      method: "POST", session,
      body: { title: "Test", bodyMarkdown: "Bonjour {{first_name}}", language: "fr" },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.template.doctorId).toBe(doctor.id);
    expect(body.template.isOfficial).toBe(false);
  });

  it("rejects empty body", async () => {
    const doctor = await createTestDoctor();
    const session = await signInDoctor(doctor);
    const res = await makeRequest("/api/medecin/templates", {
      method: "POST", session, body: { title: "T", bodyMarkdown: "", language: "fr" },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("BODY_REQUIRED");
  });

  it("rejects body > 10KB", async () => {
    const doctor = await createTestDoctor();
    const session = await signInDoctor(doctor);
    const res = await makeRequest("/api/medecin/templates", {
      method: "POST", session, body: { title: "T", bodyMarkdown: "a".repeat(10_001), language: "fr" },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("BODY_TOO_LARGE");
  });

  it("rejects unsafe markdown", async () => {
    const doctor = await createTestDoctor();
    const session = await signInDoctor(doctor);
    const res = await makeRequest("/api/medecin/templates", {
      method: "POST", session, body: { title: "T", bodyMarkdown: "<script>alert(1)</script>", language: "fr" },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("UNSAFE_MARKDOWN");
  });

  it("enforces 200 templates limit per doctor", async () => {
    const doctor = await createTestDoctor();
    await db.insert(prescriptionTemplates).values(
      Array.from({ length: 200 }, (_, i) => ({ doctorId: doctor.id, title: `T${i}`, bodyMarkdown: "x", language: "fr" as const }))
    );
    const session = await signInDoctor(doctor);
    const res = await makeRequest("/api/medecin/templates", {
      method: "POST", session, body: { title: "T201", bodyMarkdown: "x", language: "fr" },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("TEMPLATE_LIMIT_REACHED");
  });

  it("logs audit on create", async () => {
    const doctor = await createTestDoctor();
    const session = await signInDoctor(doctor);
    await makeRequest("/api/medecin/templates", {
      method: "POST", session, body: { title: "T", bodyMarkdown: "x", language: "fr" },
    });
    const audits = await db.query.templateAuditLogs.findMany({ where: (l, { eq }) => eq(l.actorId, doctor.id) });
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe("created");
  });
});
```

- [ ] **Step 2: Implement route handler**

```typescript
// apps/web/app/api/medecin/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, prescriptionTemplates } from "@doktori/db";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getDoctorSession } from "@/lib/auth/doctor";
import { validateMarkdown } from "@/lib/templates/sanitize";
import { logTemplateAudit } from "@/lib/templates/audit";

const TEMPLATE_LIMIT = 200;

export async function GET(req: NextRequest) {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const language = url.searchParams.get("language") as "fr" | "ar" | null;
  const q = url.searchParams.get("q")?.trim();

  const filters = [isNull(prescriptionTemplates.deletedAt)];
  // OWN templates OR officials
  filters.push(
    or(
      eq(prescriptionTemplates.doctorId, session.doctorId),
      and(eq(prescriptionTemplates.isOfficial, true), isNull(prescriptionTemplates.deletedAt))
    )!
  );
  if (language) filters.push(eq(prescriptionTemplates.language, language));
  if (q) filters.push(ilike(prescriptionTemplates.title, `%${q}%`));

  const templates = await db.query.prescriptionTemplates.findMany({
    where: and(...filters),
    orderBy: [desc(prescriptionTemplates.isOfficial), desc(prescriptionTemplates.updatedAt)],
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const { title, description, bodyMarkdown, language } = body;
  if (!title || typeof title !== "string") return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });
  const validation = validateMarkdown(bodyMarkdown);
  if (!validation.ok) return NextResponse.json({ error: validation.error, details: (validation as any).details }, { status: 400 });

  // Limit check
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prescriptionTemplates)
    .where(and(eq(prescriptionTemplates.doctorId, session.doctorId), isNull(prescriptionTemplates.deletedAt)));
  if (count >= TEMPLATE_LIMIT) {
    return NextResponse.json({ error: "TEMPLATE_LIMIT_REACHED", limit: TEMPLATE_LIMIT }, { status: 403 });
  }

  const [template] = await db
    .insert(prescriptionTemplates)
    .values({
      doctorId: session.doctorId,
      title: title.slice(0, 120),
      description,
      language: (language === "ar" ? "ar" : "fr"),
      bodyMarkdown,
      isOfficial: false,
    })
    .returning();

  await logTemplateAudit({
    actorType: "doctor",
    actorId: session.doctorId,
    templateId: template.id,
    action: "created",
    after: { title: template.title, language: template.language },
    context: { userAgent: req.headers.get("user-agent") },
  });

  return NextResponse.json({ template }, { status: 201 });
}
```

- [ ] **Step 3: Run integration tests + commit**

```bash
pnpm --filter web vitest run apps/web/__tests__/api/medecin/templates.test.ts
git add apps/web/app/api/medecin/templates/route.ts apps/web/__tests__/api/medecin/templates.test.ts
git commit -m "feat(api): GET/POST /api/medecin/templates with audit + validation"
```

---

### Task W1.11 — API : `GET/PATCH/DELETE /api/medecin/templates/[id]`

**Files:**
- Create: `apps/web/app/api/medecin/templates/[id]/route.ts`
- Modify: `apps/web/__tests__/api/medecin/templates.test.ts` (ajouter describes)

- [ ] **Step 1: Tests pour [id]**

Ajouter dans le fichier test existant :

```typescript
describe("PATCH /api/medecin/templates/[id]", () => {
  it("updates own template", async () => {
    const doctor = await createTestDoctor();
    const [t] = await db.insert(prescriptionTemplates)
      .values({ doctorId: doctor.id, title: "Old", bodyMarkdown: "X", language: "fr" })
      .returning();
    const session = await signInDoctor(doctor);
    const res = await makeRequest(`/api/medecin/templates/${t.id}`, {
      method: "PATCH", session, body: { title: "New" },
    });
    expect(res.status).toBe(200);
    const updated = await db.query.prescriptionTemplates.findFirst({ where: eq(prescriptionTemplates.id, t.id) });
    expect(updated!.title).toBe("New");
    expect(updated!.version).toBe(2);
  });

  it("rejects cross-doctor edit (403)", async () => {
    const doctor1 = await createTestDoctor();
    const doctor2 = await createTestDoctor();
    const [t] = await db.insert(prescriptionTemplates)
      .values({ doctorId: doctor1.id, title: "T", bodyMarkdown: "X", language: "fr" })
      .returning();
    const session = await signInDoctor(doctor2);
    const res = await makeRequest(`/api/medecin/templates/${t.id}`, {
      method: "PATCH", session, body: { title: "Hijack" },
    });
    expect(res.status).toBe(403);
  });

  it("rejects edit of official template", async () => {
    const doctor = await createTestDoctor();
    const [t] = await db.insert(prescriptionTemplates)
      .values({ doctorId: null, isOfficial: true, slug: "test-edit-official", title: "T", bodyMarkdown: "X", language: "fr" })
      .returning();
    const session = await signInDoctor(doctor);
    const res = await makeRequest(`/api/medecin/templates/${t.id}`, {
      method: "PATCH", session, body: { title: "Hack" },
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("OFFICIAL_TEMPLATE_READ_ONLY");
  });
});

describe("DELETE /api/medecin/templates/[id]", () => {
  it("soft-deletes own template", async () => {
    const doctor = await createTestDoctor();
    const [t] = await db.insert(prescriptionTemplates)
      .values({ doctorId: doctor.id, title: "T", bodyMarkdown: "X", language: "fr" })
      .returning();
    const session = await signInDoctor(doctor);
    const res = await makeRequest(`/api/medecin/templates/${t.id}`, { method: "DELETE", session });
    expect(res.status).toBe(204);
    const after = await db.query.prescriptionTemplates.findFirst({ where: eq(prescriptionTemplates.id, t.id) });
    expect(after!.deletedAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// apps/web/app/api/medecin/templates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, prescriptionTemplates } from "@doktori/db";
import { and, eq, isNull } from "drizzle-orm";
import { getDoctorSession } from "@/lib/auth/doctor";
import { validateMarkdown } from "@/lib/templates/sanitize";
import { logTemplateAudit } from "@/lib/templates/audit";

async function loadTemplate(id: string) {
  return db.query.prescriptionTemplates.findFirst({
    where: and(eq(prescriptionTemplates.id, id), isNull(prescriptionTemplates.deletedAt)),
  });
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const t = await loadTemplate(params.id);
  if (!t) return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  // Doctors can read own + officials
  if (!t.isOfficial && t.doctorId !== session.doctorId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return NextResponse.json({ template: t });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const before = await loadTemplate(params.id);
  if (!before) return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  if (before.isOfficial) return NextResponse.json({ error: "OFFICIAL_TEMPLATE_READ_ONLY" }, { status: 403 });
  if (before.doctorId !== session.doctorId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const updates: Partial<typeof prescriptionTemplates.$inferInsert> = {};
  if (typeof body.title === "string") updates.title = body.title.slice(0, 120);
  if (typeof body.description === "string" || body.description === null) updates.description = body.description;
  if (typeof body.language === "string" && ["fr", "ar"].includes(body.language)) updates.language = body.language;
  if (typeof body.bodyMarkdown === "string") {
    const validation = validateMarkdown(body.bodyMarkdown);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    updates.bodyMarkdown = body.bodyMarkdown;
  }

  const [updated] = await db
    .update(prescriptionTemplates)
    .set(updates)
    .where(eq(prescriptionTemplates.id, params.id))
    .returning();

  await logTemplateAudit({
    actorType: "doctor",
    actorId: session.doctorId,
    templateId: updated.id,
    action: "edited",
    before: { title: before.title, bodyMarkdown: before.bodyMarkdown, language: before.language },
    after: { title: updated.title, bodyMarkdown: updated.bodyMarkdown, language: updated.language },
    context: { userAgent: req.headers.get("user-agent") },
  });

  return NextResponse.json({ template: updated });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const before = await loadTemplate(params.id);
  if (!before) return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  if (before.isOfficial) return NextResponse.json({ error: "OFFICIAL_TEMPLATE_READ_ONLY" }, { status: 403 });
  if (before.doctorId !== session.doctorId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await db.update(prescriptionTemplates).set({ deletedAt: new Date() }).where(eq(prescriptionTemplates.id, params.id));
  await logTemplateAudit({
    actorType: "doctor", actorId: session.doctorId, templateId: params.id, action: "deleted",
    before: { title: before.title },
  });

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter web vitest run apps/web/__tests__/api/medecin/templates.test.ts
git add apps/web/app/api/medecin/templates/[id]/route.ts apps/web/__tests__/api/medecin/templates.test.ts
git commit -m "feat(api): GET/PATCH/DELETE /api/medecin/templates/[id] with IDOR + official protection"
```

---

### Task W1.12 — API : `POST /api/medecin/templates/[id]/clone`

**Files:**
- Create: `apps/web/app/api/medecin/templates/[id]/clone/route.ts`
- Modify: `apps/web/__tests__/api/medecin/templates.test.ts`

- [ ] **Step 1: Tests**

```typescript
describe("POST /api/medecin/templates/[id]/clone", () => {
  it("clones an official template into doctor's privates", async () => {
    const doctor = await createTestDoctor();
    const [official] = await db.insert(prescriptionTemplates)
      .values({ doctorId: null, isOfficial: true, slug: "official-to-clone", title: "Officiel", bodyMarkdown: "Hello", language: "fr" })
      .returning();
    const session = await signInDoctor(doctor);
    const res = await makeRequest(`/api/medecin/templates/${official.id}/clone`, { method: "POST", session });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.template.doctorId).toBe(doctor.id);
    expect(body.template.isOfficial).toBe(false);
    expect(body.template.clonedFromId).toBe(official.id);
    expect(body.template.bodyMarkdown).toBe("Hello");
    // clone_count incremented on source
    const reloaded = await db.query.prescriptionTemplates.findFirst({ where: eq(prescriptionTemplates.id, official.id) });
    expect(reloaded!.cloneCount).toBe(1);
  });

  it("rejects cloning a soft-deleted template", async () => {
    const doctor = await createTestDoctor();
    const [t] = await db.insert(prescriptionTemplates)
      .values({ doctorId: null, isOfficial: true, slug: "deleted-x", title: "X", bodyMarkdown: "y", deletedAt: new Date() })
      .returning();
    const session = await signInDoctor(doctor);
    const res = await makeRequest(`/api/medecin/templates/${t.id}/clone`, { method: "POST", session });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Implement (transaction)**

```typescript
// apps/web/app/api/medecin/templates/[id]/clone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, prescriptionTemplates } from "@doktori/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDoctorSession } from "@/lib/auth/doctor";
import { logTemplateAudit } from "@/lib/templates/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const source = await db.query.prescriptionTemplates.findFirst({
    where: and(eq(prescriptionTemplates.id, params.id), isNull(prescriptionTemplates.deletedAt)),
  });
  if (!source) return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });

  // Doctor can clone officials OR own templates (not someone else's)
  if (!source.isOfficial && source.doctorId !== session.doctorId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const result = await db.transaction(async (tx) => {
    const [clone] = await tx
      .insert(prescriptionTemplates)
      .values({
        doctorId: session.doctorId,
        title: `${source.title} (copie)`.slice(0, 120),
        description: source.description,
        language: source.language,
        bodyMarkdown: source.bodyMarkdown,
        targetType: source.targetType,
        isOfficial: false,
        clonedFromId: source.id,
      })
      .returning();
    await tx
      .update(prescriptionTemplates)
      .set({ cloneCount: sql`${prescriptionTemplates.cloneCount} + 1` })
      .where(eq(prescriptionTemplates.id, source.id));
    return clone;
  });

  await logTemplateAudit({
    actorType: "doctor", actorId: session.doctorId, templateId: result.id, action: "cloned",
    after: { sourceId: source.id, title: result.title },
  });

  return NextResponse.json({ template: result }, { status: 201 });
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter web vitest run apps/web/__tests__/api/medecin/templates.test.ts
git add apps/web/app/api/medecin/templates/[id]/clone/route.ts apps/web/__tests__/api/medecin/templates.test.ts
git commit -m "feat(api): POST /api/medecin/templates/[id]/clone with transaction + clone_count"
```

---

### Task W1.13 — API : `GET /api/medecin/patients/[id]/template-context` (BLOCKER B2 IDOR)

**Files:**
- Create: `apps/web/app/api/medecin/patients/[id]/template-context/route.ts`
- Create: `apps/web/__tests__/api/medecin/template-context.test.ts`

- [ ] **Step 1: Tests IDOR-focused**

```typescript
// apps/web/__tests__/api/medecin/template-context.test.ts
import { describe, it, expect } from "vitest";
import { createTestDoctor, createTestPatient, createTestAppointment, signInDoctor, makeRequest } from "../helpers";

describe("GET /api/medecin/patients/[id]/template-context — IDOR check (B2)", () => {
  it("returns 200 when doctor owns appointment for this patient", async () => {
    const doctor = await createTestDoctor();
    const patient = await createTestPatient();
    const appt = await createTestAppointment({ doctorId: doctor.id, patientId: patient.id });
    const session = await signInDoctor(doctor);
    const res = await makeRequest(`/api/medecin/patients/${patient.id}/template-context?appointmentId=${appt.id}`, { method: "GET", session });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.context.patient.id).toBe(patient.id);
    expect(body.context.doctor.id).toBe(doctor.id);
  });

  it("returns 403 when appointment belongs to another doctor", async () => {
    const doctor1 = await createTestDoctor();
    const doctor2 = await createTestDoctor();
    const patient = await createTestPatient();
    const appt = await createTestAppointment({ doctorId: doctor1.id, patientId: patient.id });
    const session = await signInDoctor(doctor2);
    const res = await makeRequest(`/api/medecin/patients/${patient.id}/template-context?appointmentId=${appt.id}`, { method: "GET", session });
    expect(res.status).toBe(403);
  });

  it("returns 403 when appointment.patient_id ≠ requested patient", async () => {
    const doctor = await createTestDoctor();
    const patientA = await createTestPatient();
    const patientB = await createTestPatient();
    const appt = await createTestAppointment({ doctorId: doctor.id, patientId: patientA.id });
    const session = await signInDoctor(doctor);
    const res = await makeRequest(`/api/medecin/patients/${patientB.id}/template-context?appointmentId=${appt.id}`, { method: "GET", session });
    expect(res.status).toBe(403);
  });

  it("returns 400 when appointmentId missing", async () => {
    const doctor = await createTestDoctor();
    const patient = await createTestPatient();
    const session = await signInDoctor(doctor);
    const res = await makeRequest(`/api/medecin/patients/${patient.id}/template-context`, { method: "GET", session });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Implement (single-query, IDOR check)**

```typescript
// apps/web/app/api/medecin/patients/[id]/template-context/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, appointments } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { getDoctorSession } from "@/lib/auth/doctor";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const appointmentId = url.searchParams.get("appointmentId");
  if (!appointmentId) return NextResponse.json({ error: "APPOINTMENT_ID_REQUIRED" }, { status: 400 });

  // SINGLE QUERY with IDOR check: appointment must belong to this doctor AND match this patient
  const appt = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.id, appointmentId),
      eq(appointments.doctorId, session.doctorId),
      eq(appointments.patientId, params.id),
    ),
    with: {
      patient: { with: { medicalProfile: true } },
      doctor: { with: { primaryPractice: true } },
      appointmentType: true,
    },
  });

  if (!appt) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  return NextResponse.json({
    context: {
      patient: appt.patient,
      medicalProfile: appt.patient?.medicalProfile,
      doctor: appt.doctor,
      appointment: { id: appt.id, startsAt: appt.startsAt },
      appointmentType: appt.appointmentType,
      practice: appt.doctor?.primaryPractice,
    },
  });
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter web vitest run apps/web/__tests__/api/medecin/template-context.test.ts
git add apps/web/app/api/medecin/patients/[id]/template-context/route.ts apps/web/__tests__/api/medecin/template-context.test.ts
git commit -m "feat(api): template-context endpoint with strict IDOR check (B2)"
```

---

### Task W1.14 — API : `GET /api/medecin/template-context/preview` (test à blanc)

**Files:**
- Create: `apps/web/app/api/medecin/template-context/preview/route.ts`

- [ ] **Step 1: Implement endpoint preview avec patient fictif**

```typescript
// apps/web/app/api/medecin/template-context/preview/route.ts
import { NextResponse } from "next/server";
import { getDoctorSession } from "@/lib/auth/doctor";

export async function GET() {
  const session = await getDoctorSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  return NextResponse.json({
    context: {
      patient: { id: "fictif", firstName: "Sami", lastName: "Trabelsi", dob: "1991-03-15", phone: "+216 22 123 456", cin: "12345678", insuranceProvider: "CNAM" },
      medicalProfile: { weightKg: 72, heightCm: 175, bloodType: "O+", allergies: ["Pénicilline"] },
      doctor: session.doctor, // already loaded by getDoctorSession
      appointment: { id: "fictif", startsAt: new Date().toISOString() },
      appointmentType: { name: "Consultation suivi" },
      practice: session.doctor?.primaryPractice,
    },
  });
}
```

- [ ] **Step 2: Commit (test simple : auth check suffit)**

```bash
git add apps/web/app/api/medecin/template-context/preview/route.ts
git commit -m "feat(api): preview template-context with fictive patient (Sami Trabelsi)"
```

---

### Task W1.15 — Apply template hook : incrémenter `apply_count` sur création prescription

**Files:**
- Modify: `apps/web/app/api/medecin/prescriptions/route.ts` (existant)

- [ ] **Step 1: Lire le code existant**

```bash
cat apps/web/app/api/medecin/prescriptions/route.ts
```

Identifier le `POST` qui crée une prescription.

- [ ] **Step 2: Ajouter logique `apply_count` + audit + `template_id`**

Dans le handler POST, après l'INSERT prescription :

```typescript
// Si la prescription provient d'un template, incrémenter apply_count + audit
if (body.templateId) {
  await db.transaction(async (tx) => {
    await tx
      .update(prescriptionTemplates)
      .set({
        applyCount: sql`${prescriptionTemplates.applyCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(prescriptionTemplates.id, body.templateId));
  });
  await logTemplateAudit({
    actorType: "doctor",
    actorId: session.doctorId,
    templateId: body.templateId,
    action: "applied",
    after: { prescriptionId: prescription.id },
  });
}
```

- [ ] **Step 3: Test : création prescription avec templateId**

Ajouter dans les tests prescriptions existants ou nouveau fichier :

```typescript
it("increments apply_count when templateId provided", async () => {
  const doctor = await createTestDoctor();
  const [t] = await db.insert(prescriptionTemplates)
    .values({ doctorId: doctor.id, title: "T", bodyMarkdown: "x", language: "fr" })
    .returning();
  const session = await signInDoctor(doctor);
  await makeRequest("/api/medecin/prescriptions", {
    method: "POST", session,
    body: { appointmentId: "...", patientId: "...", content: "Rendered text", templateId: t.id },
  });
  const reloaded = await db.query.prescriptionTemplates.findFirst({ where: eq(prescriptionTemplates.id, t.id) });
  expect(reloaded!.applyCount).toBe(1);
  expect(reloaded!.lastUsedAt).not.toBeNull();
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/medecin/prescriptions/route.ts apps/web/__tests__/api/medecin/prescriptions.test.ts
git commit -m "feat(prescriptions): track template_id + increment apply_count on creation"
```

---

### Task W1.16 — Smoke test API en dev

**Files:**
- N/A (manuel)

- [ ] **Step 1: Build + lancer dev**

```bash
pnpm --filter web build
pnpm --filter web dev
```

- [ ] **Step 2: Tester via curl avec session doctor**

```bash
# Login
curl -c cookies.txt -X POST http://localhost:3000/api/auth/callback/doctor-credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"test@dev.local","password":"..."}'

# Create
curl -b cookies.txt -X POST http://localhost:3000/api/medecin/templates \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","bodyMarkdown":"Bonjour {{first_name}}","language":"fr"}'

# List
curl -b cookies.txt http://localhost:3000/api/medecin/templates
```

Expected: 201 puis 200 avec le template visible.

- [ ] **Step 3: Vérifier audit logs**

```sql
SELECT actor_type, action, template_id, created_at FROM template_audit_logs ORDER BY created_at DESC LIMIT 5;
```

Expected: 1 ligne `created`.

- [ ] **Step 4: Tag de fin de phase W1**

```bash
git tag -a templates-w1-done -m "Phase W1 complete: backend + tests"
```

---

# Phase W2 — UI éditeur médecin (12 tasks, ~14h)

**Goal:** Médecin peut lister/créer/éditer/supprimer ses templates depuis l'UI, avec preview live.
**Definition of Done:** Médecin pilote crée 3 templates en < 10 min.

---

### Task W2.1 — Pré-requis : composants partagés

**Files:**
- Identifier les composants existants : `apps/web/components/ui/` (Button, Card, Dialog, Input, Textarea, Tabs, Badge…)

- [ ] **Step 1: Inventaire**

```bash
ls apps/web/components/ui/
```

- [ ] **Step 2: Vérifier `sonner` (toasts) installé**

```bash
grep -l "sonner" apps/web/package.json
```

Si absent : `pnpm --filter web add sonner` + commit séparé.

---

### Task W2.2 — Page liste `/medecin/modeles` — squelette

**Files:**
- Create: `apps/web/app/(medecin)/medecin/modeles/page.tsx`

- [ ] **Step 1: Server component avec fetch initial**

```tsx
// apps/web/app/(medecin)/medecin/modeles/page.tsx
import { getDoctorSession } from "@/lib/auth/doctor";
import { redirect } from "next/navigation";
import { TemplateList } from "./components/template-list";
import { db, prescriptionTemplates } from "@doktori/db";
import { and, desc, eq, isNull, or } from "drizzle-orm";

export default async function ModelesPage() {
  const session = await getDoctorSession();
  if (!session) redirect("/connexion");

  const templates = await db.query.prescriptionTemplates.findMany({
    where: and(
      isNull(prescriptionTemplates.deletedAt),
      or(
        eq(prescriptionTemplates.doctorId, session.doctorId),
        and(eq(prescriptionTemplates.isOfficial, true), isNull(prescriptionTemplates.deletedAt)),
      ),
    ),
    orderBy: [desc(prescriptionTemplates.isOfficial), desc(prescriptionTemplates.updatedAt)],
  });

  return (
    <div className="container mx-auto py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mes modèles d'ordonnance</h1>
          <p className="text-muted-foreground">Gagnez du temps avec des ordonnances pré-rédigées</p>
        </div>
        <a href="/medecin/modeles/nouveau" className="btn btn-primary">+ Nouveau modèle</a>
      </header>
      <TemplateList initialTemplates={templates} />
    </div>
  );
}
```

- [ ] **Step 2: Composant TemplateList (client) avec recherche/filtres**

Create: `apps/web/app/(medecin)/medecin/modeles/components/template-list.tsx`

```tsx
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PrescriptionTemplate } from "@doktori/db";

export function TemplateList({ initialTemplates }: { initialTemplates: PrescriptionTemplate[] }) {
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState<"all" | "fr" | "ar">("all");

  const filtered = initialTemplates.filter((t) => {
    if (language !== "all" && t.language !== language) return false;
    if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const officials = filtered.filter((t) => t.isOfficial);
  const personals = filtered.filter((t) => !t.isOfficial);

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center">
        <Input placeholder="🔍 Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={language} onChange={(e) => setLanguage(e.target.value as any)}>
          <option value="all">Toutes</option>
          <option value="fr">FR</option>
          <option value="ar">AR</option>
        </select>
      </div>

      {officials.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">📌 Officiels Doktori</h2>
          <div className="grid gap-3">
            {officials.map((t) => <TemplateCard key={t.id} template={t} kind="official" />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">📋 Mes modèles</h2>
        {personals.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Aucun modèle perso. Dupliquez un modèle officiel ou créez le vôtre.
          </Card>
        ) : (
          <div className="grid gap-3">
            {personals.map((t) => <TemplateCard key={t.id} template={t} kind="personal" />)}
          </div>
        )}
      </section>
    </div>
  );
}

function TemplateCard({ template, kind }: { template: PrescriptionTemplate; kind: "official" | "personal" }) {
  const variableCount = (template.bodyMarkdown.match(/\{\{\w+\}\}/g) ?? []).length;
  return (
    <Card className="p-4 flex items-center justify-between">
      <div>
        <h3 className="font-medium">{template.title}</h3>
        <p className="text-sm text-muted-foreground">{template.description}</p>
        <div className="flex gap-2 mt-2 text-xs">
          <Badge variant="outline">{template.language.toUpperCase()}</Badge>
          <Badge variant="outline">{variableCount} variables</Badge>
        </div>
      </div>
      <div className="flex gap-2">
        {kind === "official" ? (
          <CloneButton templateId={template.id} />
        ) : (
          <a href={`/medecin/modeles/${template.id}/edit`} className="btn btn-sm">Éditer</a>
        )}
      </div>
    </Card>
  );
}

function CloneButton({ templateId }: { templateId: string }) {
  const [loading, setLoading] = useState(false);
  async function clone() {
    setLoading(true);
    const res = await fetch(`/api/medecin/templates/${templateId}/clone`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const { template } = await res.json();
      window.location.href = `/medecin/modeles/${template.id}/edit`;
    }
  }
  return <button onClick={clone} disabled={loading} className="btn btn-sm">Dupliquer</button>;
}
```

- [ ] **Step 3: Smoke test**

`pnpm --filter web dev` puis ouvrir `http://localhost:3000/medecin/modeles` (avec session doctor active).

Expected: page rend 0 templates initialement, formulaire de filtre fonctionnel, lien "+ Nouveau modèle" visible.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(medecin\)/medecin/modeles/
git commit -m "feat(ui): /medecin/modeles list page with search + filters"
```

---

### Task W2.3 — Page nouveau `/medecin/modeles/nouveau` + composant TemplateEditor

**Files:**
- Create: `apps/web/app/(medecin)/medecin/modeles/nouveau/page.tsx`
- Create: `apps/web/app/(medecin)/medecin/modeles/components/template-editor.tsx`

- [ ] **Step 1: Page nouveau**

```tsx
import { TemplateEditor } from "../components/template-editor";

export default function NouveauPage() {
  return <TemplateEditor mode="create" />;
}
```

- [ ] **Step 2: Composant TemplateEditor (client) — layout 2 cols**

```tsx
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { VariableHelperPanel } from "./variable-helper-panel";
import { TemplatePreview } from "./template-preview";

interface Props {
  mode: "create" | "edit";
  initialData?: { id: string; title: string; description: string | null; language: "fr" | "ar"; bodyMarkdown: string };
}

export function TemplateEditor({ mode, initialData }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [language, setLanguage] = useState<"fr" | "ar">(initialData?.language ?? "fr");
  const [body, setBody] = useState(initialData?.bodyMarkdown ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function save() {
    setSaving(true);
    const url = mode === "create" ? "/api/medecin/templates" : `/api/medecin/templates/${initialData!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, language, bodyMarkdown: body }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(`Erreur: ${err.error}`);
      return;
    }
    setDirty(false);
    toast.success(mode === "create" ? "Modèle créé" : "Modèle enregistré");
    router.push("/medecin/modeles");
  }

  return (
    <div className="container mx-auto py-8 grid grid-cols-3 gap-6">
      <Card className="col-span-2 p-6 space-y-4">
        <h1 className="text-2xl font-bold">{mode === "create" ? "Nouveau modèle" : "Éditer le modèle"}</h1>
        <div>
          <label className="text-sm font-medium">Titre *</label>
          <Input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} maxLength={120} />
        </div>
        <div>
          <label className="text-sm font-medium">Description (optionnel)</label>
          <Input value={description} onChange={(e) => { setDescription(e.target.value); setDirty(true); }} />
        </div>
        <div>
          <label className="text-sm font-medium">Langue</label>
          <select value={language} onChange={(e) => { setLanguage(e.target.value as any); setDirty(true); }} className="input">
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Contenu (Markdown)</label>
          <Textarea
            className="font-mono min-h-[400px]"
            value={body}
            onChange={(e) => { setBody(e.target.value); setDirty(true); }}
            dir={language === "ar" ? "rtl" : "ltr"}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Utilisez {`{{variable}}`} pour les placeholders. Voir le panneau Variables à droite.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || !title || !body}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/medecin/modeles")}>Annuler</Button>
        </div>
      </Card>

      <div className="space-y-4">
        <VariableHelperPanel onCopy={(v) => navigator.clipboard.writeText(`{{${v}}}`)} />
        <TemplatePreview body={body} language={language} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(medecin\)/medecin/modeles/nouveau/ apps/web/app/\(medecin\)/medecin/modeles/components/template-editor.tsx
git commit -m "feat(ui): TemplateEditor 2-col layout with beforeunload guard"
```

---

### Task W2.4 — VariableHelperPanel : panneau des 22 variables avec copy-to-clipboard

**Files:**
- Create: `apps/web/app/(medecin)/medecin/modeles/components/variable-helper-panel.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { Card } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { toast } from "sonner";

const GROUPS = [
  { label: "Patient", vars: ["first_name", "last_name", "full_name", "age", "age_at_appointment", "dob", "phone", "cin", "weight", "height", "blood_type", "allergies", "insurance"] },
  { label: "Médecin", vars: ["doctor_name", "doctor_specialty", "doctor_city", "doctor_phone", "doctor_address", "doctor_registration"] },
  { label: "Rendez-vous", vars: ["appointment_date", "appointment_type"] },
  { label: "Date / heure", vars: ["today", "today_long", "time"] },
];

export function VariableHelperPanel({ onCopy }: { onCopy: (v: string) => void }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">📚 Variables disponibles</h3>
      <div className="space-y-3 text-sm">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div className="font-medium text-muted-foreground mb-1">{g.label}</div>
            <div className="space-y-1">
              {g.vars.map((v) => (
                <button
                  key={v}
                  onClick={() => { onCopy(v); toast.success(`{{${v}}} copié`); }}
                  className="flex items-center justify-between w-full px-2 py-1 rounded hover:bg-muted text-left"
                >
                  <code className="text-xs">{`{{${v}}}`}</code>
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(medecin\)/medecin/modeles/components/variable-helper-panel.tsx
git commit -m "feat(ui): VariableHelperPanel with 23 vars + clipboard"
```

---

### Task W2.5 — TemplatePreview : aperçu live avec patient fictif

**Files:**
- Create: `apps/web/app/(medecin)/medecin/modeles/components/template-preview.tsx`

- [ ] **Step 1: Implement (client component qui appelle preview API + render lib)**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { render } from "@/lib/templates/render";
import type { TemplateContext } from "@/lib/templates/variables";
import ReactMarkdown from "react-markdown";

export function TemplatePreview({ body, language }: { body: string; language: "fr" | "ar" }) {
  const [ctx, setCtx] = useState<TemplateContext | null>(null);

  useEffect(() => {
    fetch("/api/medecin/template-context/preview")
      .then((r) => r.json())
      .then((data) => setCtx({ ...data.context, locale: language, now: new Date() }))
      .catch(() => setCtx(null));
  }, [language]);

  if (!ctx) return <Card className="p-4 text-sm text-muted-foreground">Chargement aperçu...</Card>;
  const result = render(body, ctx);

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">👁 Aperçu (patient fictif: Sami Trabelsi, 35 ans)</h3>
      <div className="prose prose-sm max-w-none border rounded p-3 bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
        <ReactMarkdown>{result.body}</ReactMarkdown>
      </div>
      {result.unresolved.length > 0 && (
        <p className="text-xs text-amber-600 mt-2">⚠ {result.unresolved.length} variable(s) non résolue(s) : {result.unresolved.join(", ")}</p>
      )}
    </Card>
  );
}
```

Note : `react-markdown` à installer si absent. Le rendu HTML passera dans un sanitizer côté client séparé pour PDF (out-of-scope MVP).

- [ ] **Step 2: Install react-markdown**

```bash
pnpm --filter web add react-markdown
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(medecin\)/medecin/modeles/components/template-preview.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(ui): TemplatePreview with live render + fictive patient"
```

---

### Task W2.6 — Page edit `/medecin/modeles/[id]/edit`

**Files:**
- Create: `apps/web/app/(medecin)/medecin/modeles/[id]/edit/page.tsx`

- [ ] **Step 1: Server component qui pre-charge + passe à TemplateEditor en mode edit**

```tsx
import { getDoctorSession } from "@/lib/auth/doctor";
import { redirect, notFound } from "next/navigation";
import { db, prescriptionTemplates } from "@doktori/db";
import { and, eq, isNull } from "drizzle-orm";
import { TemplateEditor } from "../../components/template-editor";

export default async function EditPage({ params }: { params: { id: string } }) {
  const session = await getDoctorSession();
  if (!session) redirect("/connexion");

  const t = await db.query.prescriptionTemplates.findFirst({
    where: and(eq(prescriptionTemplates.id, params.id), isNull(prescriptionTemplates.deletedAt)),
  });
  if (!t) notFound();
  if (t.isOfficial || t.doctorId !== session.doctorId) {
    redirect("/medecin/modeles");
  }

  return <TemplateEditor mode="edit" initialData={{ id: t.id, title: t.title, description: t.description, language: t.language as "fr" | "ar", bodyMarkdown: t.bodyMarkdown }} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(medecin\)/medecin/modeles/\[id\]/edit/
git commit -m "feat(ui): /medecin/modeles/[id]/edit page"
```

---

### Task W2.7 — Coloration syntaxique des variables dans le textarea (overlay)

**Files:**
- Modify: `apps/web/app/(medecin)/medecin/modeles/components/template-editor.tsx`

- [ ] **Step 1: Ajouter overlay <pre> qui mirror le textarea avec spans cyan**

```tsx
function HighlightedTextarea({ value, onChange, language }: { value: string; onChange: (v: string) => void; language: "fr" | "ar" }) {
  return (
    <div className="relative">
      <pre
        aria-hidden="true"
        className="absolute inset-0 font-mono whitespace-pre-wrap break-words pointer-events-none p-2 text-transparent"
      >
        {value.split(/(\{\{\w+\}\})/g).map((part, i) =>
          part.match(/^\{\{\w+\}\}$/)
            ? <span key={i} className="bg-cyan-100 text-cyan-700 rounded px-0.5">{part}</span>
            : part
        )}
      </pre>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={language === "ar" ? "rtl" : "ltr"}
        className="relative font-mono min-h-[400px] w-full p-2 bg-transparent"
      />
    </div>
  );
}
```

Remplacer `<Textarea>` par `<HighlightedTextarea>` dans le `TemplateEditor`.

- [ ] **Step 2: Test visuel + commit**

```bash
git commit -am "feat(ui): syntax highlight on {{variables}} in editor"
```

---

### Task W2.8 — Tag de fin de phase W2

- [ ] **Step 1: Smoke test complet**

Créer un template "Antibio test" avec body :
```
Bonjour {{first_name}},
Prends {{weight}} mg / kg pendant 7j.
Le {{today_long}}, {{doctor_name}}.
```

Expected : aperçu live affiche "Bonjour Sami, Prends 72 mg / kg pendant 7j. Le 3 mai 2026, Dr Karim Ben Ali."

- [ ] **Step 2: Tag**

```bash
git tag -a templates-w2-done -m "Phase W2: editor UI complete"
```

---

# Phase W3 — Modal application + intégration ordonnance + E2E (8 tasks, ~12h)

**Goal:** Médecin peut appliquer un template depuis la fiche RDV pour pré-remplir une ordonnance.
**Definition of Done:** E2E test bout-en-bout passe : template → modal → ordonnance imprimée OK.

---

### Task W3.1 — PrescriptionTemplateModal : composant principal

**Files:**
- Create: `apps/web/app/(medecin)/medecin/rendez-vous/[id]/components/prescription-template-modal.tsx`

- [ ] **Step 1: Modal avec liste à gauche / preview à droite**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { render } from "@/lib/templates/render";
import type { TemplateContext } from "@/lib/templates/variables";
import ReactMarkdown from "react-markdown";

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId: string;
  onApply: (markdown: string, templateId: string) => void;
}

export function PrescriptionTemplateModal({ open, onClose, patientId, appointmentId, onApply }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [ctx, setCtx] = useState<TemplateContext | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/medecin/templates").then((r) => r.json()),
      fetch(`/api/medecin/patients/${patientId}/template-context?appointmentId=${appointmentId}`).then((r) => r.ok ? r.json() : null),
    ]).then(([tpls, ctxRes]) => {
      setTemplates(tpls.templates);
      if (ctxRes) setCtx({ ...ctxRes.context, locale: "fr", now: new Date() });
    });
  }, [open, patientId, appointmentId]);

  function selectTemplate(t: any) {
    setSelected(t);
    if (ctx) {
      const result = render(t.bodyMarkdown, ctx);
      setEditedBody(result.body);
    }
  }

  const result = selected && ctx ? render(selected.bodyMarkdown, ctx) : null;
  const filtered = templates.filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choisir un modèle d'ordonnance</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-hidden">
          <aside className="overflow-y-auto border-r pr-3">
            <Input placeholder="🔍 Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`block w-full text-left p-2 rounded hover:bg-muted ${selected?.id === t.id ? "bg-muted" : ""}`}
              >
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">{t.isOfficial ? "📌 Officiel" : "📋 Perso"}</div>
              </button>
            ))}
          </aside>
          <div className="overflow-y-auto">
            {result ? (
              <>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{editedBody}</ReactMarkdown>
                </div>
                {result.unresolved.length > 0 && (
                  <p className="text-xs text-amber-600 mt-2">⚠ {result.unresolved.length} variables non résolues : {result.unresolved.join(", ")}</p>
                )}
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="font-mono min-h-[200px] w-full mt-3 p-2 border rounded text-sm"
                />
              </>
            ) : (
              <p className="text-muted-foreground">Sélectionnez un modèle</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button disabled={!selected} onClick={() => { onApply(editedBody, selected.id); onClose(); }}>
            Insérer dans l'ordonnance →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(medecin\)/medecin/rendez-vous/\[id\]/components/prescription-template-modal.tsx
git commit -m "feat(ui): PrescriptionTemplateModal with list + preview + edit"
```

---

### Task W3.2 — Intégration modal dans l'éditeur d'ordonnance existant

**Files:**
- Modify: `apps/web/app/(medecin)/medecin/rendez-vous/[id]/components/prescription-editor.tsx`

- [ ] **Step 1: Identifier l'éditeur existant**

```bash
find apps/web -name "prescription-editor*" -o -name "*prescription*"
```

- [ ] **Step 2: Ajouter bouton + state pour la modal**

Ajouter dans le composant existant :

```tsx
import { useState } from "react";
import { PrescriptionTemplateModal } from "./prescription-template-modal";

// ... dans le component:
const [modalOpen, setModalOpen] = useState(false);
const [usedTemplateId, setUsedTemplateId] = useState<string | null>(null);

// ... dans le JSX:
<Button variant="outline" onClick={() => setModalOpen(true)}>
  📋 Choisir un modèle
</Button>

<PrescriptionTemplateModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  patientId={patientId}
  appointmentId={appointmentId}
  onApply={(markdown, templateId) => {
    setContent(content + "\n" + markdown); // ou replace(), selon UX souhaitée
    setUsedTemplateId(templateId);
  }}
/>

// Au moment de submit la prescription:
fetch("/api/medecin/prescriptions", {
  method: "POST",
  body: JSON.stringify({ content, appointmentId, patientId, templateId: usedTemplateId }),
});
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): integrate template modal into prescription editor"
```

---

### Task W3.3 — Feature flag `prescription_templates_enabled`

**Files:**
- Modify: `apps/web/lib/feature-flags.ts` (ou équivalent)
- Modify: pages templates pour gating

- [ ] **Step 1: Ajouter le flag dans la table existante**

```sql
INSERT INTO feature_flags (key, enabled_for_all, enabled_doctor_ids)
VALUES ('prescription_templates_enabled', false, ARRAY[]::uuid[])
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Gating en server component**

Dans `/medecin/modeles/page.tsx` au top :

```tsx
import { isFeatureEnabled } from "@/lib/feature-flags";

if (!(await isFeatureEnabled("prescription_templates_enabled", session.doctorId))) {
  redirect("/medecin");
}
```

Idem pour la modal d'application : afficher le bouton seulement si flag actif.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(flags): gate templates feature behind prescription_templates_enabled"
```

---

### Task W3.4 — E2E Playwright : template → ordonnance bout-en-bout

**Files:**
- Create: `apps/web/e2e/templates.spec.ts`

- [ ] **Step 1: Test scénario médecin pilote**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Prescription templates flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/connexion");
    await page.fill("input[name=email]", "test@dev.local");
    await page.fill("input[name=password]", "test123");
    await page.click("button[type=submit]");
    await page.waitForURL("**/medecin");
  });

  test("doctor creates a template and applies it in a prescription", async ({ page }) => {
    // Créer template
    await page.goto("/medecin/modeles/nouveau");
    await page.fill("input[name=title]", "Antibio test E2E");
    await page.fill("textarea", "Bonjour {{first_name}}, prendre {{weight}} mg.");
    await page.click("button:has-text('Enregistrer')");
    await expect(page).toHaveURL("**/medecin/modeles");
    await expect(page.getByText("Antibio test E2E")).toBeVisible();

    // Aller sur un RDV existant
    await page.goto("/medecin/rendez-vous");
    await page.click(".appointment-card >> nth=0");
    await page.click("button:has-text('Choisir un modèle')");

    // Modal
    await page.click("button:has-text('Antibio test E2E')");
    await expect(page.locator(".prose")).toContainText("Bonjour");
    await page.click("button:has-text('Insérer')");

    // Vérifier que le contenu rendu est dans l'éditeur d'ordonnance
    await expect(page.locator("textarea[name=content]")).toContainValue(/Bonjour/);

    // Sauvegarder l'ordonnance
    await page.click("button:has-text('Enregistrer l'ordonnance')");

    // Vérifier que la prescription contient le contenu rendu
    await expect(page.getByText("Ordonnance créée")).toBeVisible();
  });

  test("clone of an official preserves the original", async ({ page }) => {
    await page.goto("/medecin/modeles");
    const officialTitle = await page.locator(".official-template").first().getAttribute("data-title");
    await page.click(".official-template button:has-text('Dupliquer') >> nth=0");
    await page.waitForURL("**/edit");
    await page.fill("input[name=title]", "Modified clone");
    await page.click("button:has-text('Enregistrer')");
    await page.goto("/medecin/modeles");
    // L'original officiel doit toujours exister avec son titre original
    await expect(page.getByText(officialTitle!)).toBeVisible();
    await expect(page.getByText("Modified clone")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E**

```bash
pnpm --filter web playwright test apps/web/e2e/templates.spec.ts
```

Expected: 2 tests passed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/templates.spec.ts
git commit -m "test(e2e): templates flow end-to-end (create + apply + clone)"
```

---

### Task W3.5 — Tag fin W3

```bash
git tag -a templates-w3-done -m "Phase W3: modal + E2E green"
```

---

# Phase W4 — Admin UI + seed officiels + disclaimer (8 tasks, ~10h)

**Goal:** Admin peut gérer les 10 templates officiels Doktori, disclaimer juridique en place.
**Definition of Done:** Les 10 templates officiels sont visibles chez tous les médecins en prod, disclaimer affiché.

---

### Task W4.1 — Admin pages CRUD (réutilise TemplateEditor)

**Files:**
- Create: `apps/web/app/(admin)/admin/templates/page.tsx`
- Create: `apps/web/app/(admin)/admin/templates/nouveau/page.tsx`
- Create: `apps/web/app/(admin)/admin/templates/[id]/edit/page.tsx`

- [ ] **Step 1: Page liste admin (montre tous les templates)**

```tsx
import { requireAdmin } from "@/lib/admin-auth";
import { db, prescriptionTemplates } from "@doktori/db";
import { isNull } from "drizzle-orm";

export default async function AdminTemplatesPage() {
  await requireAdmin(["super_admin"]);
  const all = await db.query.prescriptionTemplates.findMany({
    where: isNull(prescriptionTemplates.deletedAt),
    orderBy: [{ column: "isOfficial", desc: true }, { column: "updatedAt", desc: true }],
  });
  return (
    <div>
      <h1>Templates (admin)</h1>
      <a href="/admin/templates/nouveau">+ Nouveau officiel</a>
      <table>
        {all.map((t) => (
          <tr key={t.id}>
            <td>{t.title}</td>
            <td>{t.isOfficial ? "Officiel" : `Perso (${t.doctorId})`}</td>
            <td>{t.applyCount} usages</td>
            <td>{t.cloneCount} clones</td>
            <td><a href={`/admin/templates/${t.id}/edit`}>Éditer</a></td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Pages nouveau + edit (réutilisent TemplateEditor avec mode admin)**

Adapter `TemplateEditor` pour accepter `mode: "doctor" | "admin"` et `audit: boolean`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(admin\)/admin/templates/
git commit -m "feat(admin): templates CRUD pages reusing TemplateEditor"
```

---

### Task W4.2 — API admin endpoints

**Files:**
- Create: `apps/web/app/api/admin/templates/route.ts`
- Create: `apps/web/app/api/admin/templates/[id]/route.ts`
- Create: `apps/web/__tests__/api/admin/templates.test.ts`

- [ ] **Step 1: Tests + impl avec `requireAdmin(["super_admin"])` + audit**

Squelette similaire à `/api/medecin/templates` mais :
- POST crée toujours `isOfficial=true`, `doctorId=null`, requiert `slug`
- PATCH/DELETE protégés par `requireAdmin`
- Audit via `logTemplateAudit({ actorType: "admin", ... })`

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(api): admin templates CRUD with super_admin guard + audit"
```

---

### Task W4.3 — Migration 0070 : seed des 10 templates officiels FR

**Files:**
- Create: `packages/db/migrations/0070_prescription_templates_seed.sql`

- [ ] **Step 1: Créer le fichier seed**

```sql
-- 0070 — Doktori official prescription templates seed (FR)
-- Idempotent via slug unique constraint

INSERT INTO prescription_templates (slug, doctor_id, is_official, language, target_type, title, description, body_markdown)
VALUES
('antibio-amoxi-7j', NULL, true, 'fr', 'prescription',
 'Antibio amoxicilline 7j',
 'Infection ORL non compliquée — adulte',
 $TPL$# Ordonnance médicale

**Date :** {{today_long}}
**Patient :** {{full_name}}, {{age}} ans

- Amoxicilline 500 mg : 1 cp × 3/j × 7 jours
- Paracétamol 1 g : si fièvre ou douleur

{{doctor_name}}
{{doctor_specialty}}
N° {{doctor_registration}}$TPL$),

('antibio-amoxi-pediatrie', NULL, true, 'fr', 'prescription',
 'Antibio amoxi pédiatrie',
 'Otite enfant 1-12 ans (50 mg/kg/j)',
 $TPL$# Ordonnance pédiatrique

**Date :** {{today_long}}
**Patient :** {{full_name}}, {{age_at_appointment}} ans, {{weight}} kg

- Amoxicilline 50 mg/kg/j en 3 prises × 7 jours
  Soit pour ce patient: à calculer selon le poids

- Paracétamol 15 mg/kg si fièvre

{{doctor_name}}
{{doctor_specialty}}$TPL$),

('antalgique-paracetamol', NULL, true, 'fr', 'prescription',
 'Antalgique simple paracétamol',
 'Douleur légère à modérée',
 $TPL$# Ordonnance

**Date :** {{today_long}}
**Patient :** {{full_name}}

- Paracétamol 1 g : 1 cp × 3/j si douleur, max 4 cp/24h × 5 jours

{{doctor_name}}$TPL$),

('ains-courte-duree', NULL, true, 'fr', 'prescription',
 'AINS courte durée',
 'Ibuprofène 400 mg × 3 j',
 $TPL$# Ordonnance

**Date :** {{today_long}}
**Patient :** {{full_name}}

- Ibuprofène 400 mg : 1 cp × 3/j à prendre au cours des repas × 3 jours
- À éviter si antécédent ulcère, insuffisance rénale

{{doctor_name}}$TPL$),

('bilan-bio-routine', NULL, true, 'fr', 'prescription',
 'Bilan biologique de routine',
 'NFS + glycémie + créat + lipides',
 $TPL$# Ordonnance biologique

**Date :** {{today_long}}
**Patient :** {{full_name}}

À réaliser à jeun :

- NFS plaquettes
- Glycémie à jeun
- Créatininémie + clairance estimée (MDRD)
- Bilan lipidique complet (CT, LDL, HDL, TG)
- TGO / TGP

{{doctor_name}}$TPL$),

('bilan-diabete-t2', NULL, true, 'fr', 'prescription',
 'Bilan diabète T2 trimestriel',
 'HbA1c + glycémie + bilan rénal',
 $TPL$# Ordonnance — Suivi diabète

**Date :** {{today_long}}
**Patient :** {{full_name}}

À réaliser à jeun :

- HbA1c
- Glycémie à jeun
- Créatininémie + clairance MDRD
- Microalbuminurie / créatininurie
- Bilan lipidique

{{doctor_name}}$TPL$),

('bilan-thyroide', NULL, true, 'fr', 'prescription',
 'Bilan thyroïdien',
 'TSH + T3 + T4 + Ac anti-TPO',
 $TPL$# Ordonnance

**Date :** {{today_long}}
**Patient :** {{full_name}}

- TSH ultrasensible
- T3 libre, T4 libre
- Anticorps anti-TPO

{{doctor_name}}$TPL$),

('certificat-aptitude-sport', NULL, true, 'fr', 'prescription',
 'Certificat médical d''aptitude au sport',
 'Sport non compétitif',
 $TPL$# Certificat médical

Je soussigné, **{{doctor_name}}**, certifie avoir examiné ce jour :

**{{full_name}}**, né(e) le {{dob}}

L'examen clinique ne révèle aucune contre-indication apparente à la pratique du sport en loisir non compétitif.

Fait à {{doctor_city}}, le {{today_long}}

{{doctor_name}}
{{doctor_specialty}}
N° {{doctor_registration}}$TPL$),

('certificat-dispense-scolaire', NULL, true, 'fr', 'prescription',
 'Certificat dispense scolaire',
 'Repos enfant 3 j',
 $TPL$# Certificat médical de dispense scolaire

Je soussigné, **{{doctor_name}}**, certifie avoir examiné ce jour :

**{{full_name}}**, {{age_at_appointment}} ans

Son état de santé nécessite un repos médical de **3 jours** à compter de ce jour.

Fait à {{doctor_city}}, le {{today_long}}

{{doctor_name}}$TPL$),

('esomeprazole', NULL, true, 'fr', 'prescription',
 'Esoméprazole 20 mg',
 'RGPO/dyspepsie 4 sem',
 $TPL$# Ordonnance

**Date :** {{today_long}}
**Patient :** {{full_name}}

- Esoméprazole 20 mg : 1 gélule/j à jeun × 28 jours
- Mesures hygiéno-diététiques associées

{{doctor_name}}$TPL$)

ON CONFLICT (slug) WHERE is_official = true AND deleted_at IS NULL DO NOTHING;
```

- [ ] **Step 2: Test idempotence**

```bash
psql $DATABASE_URL -f migrations/0070_prescription_templates_seed.sql
psql $DATABASE_URL -f migrations/0070_prescription_templates_seed.sql  # rerun
psql $DATABASE_URL -c "SELECT count(*) FROM prescription_templates WHERE is_official=true;"
```

Expected: 10 (peu importe le nombre de fois où on relance).

- [ ] **Step 3: Commit**

```bash
git add packages/db/migrations/0070_prescription_templates_seed.sql
git commit -m "feat(seed): 10 official Doktori prescription templates (FR)"
```

---

### Task W4.4 — Disclaimer juridique : composant + intégration

**Files:**
- Create: `apps/web/app/(medecin)/medecin/modeles/components/legal-disclaimer.tsx`

- [ ] **Step 1: Composant disclaimer**

```tsx
export function LegalDisclaimer() {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      ⚠️ Les modèles fournis par Doktori sont des aides à la rédaction.
      <strong> Le médecin reste seul responsable de la prescription</strong>, des doses et de la pertinence clinique.
      Adaptez à chaque patient.
    </div>
  );
}
```

- [ ] **Step 2: Intégrer dans :**
1. Page `/medecin/modeles` en haut (visible toujours)
2. Modal d'application (footer)
3. Au moment du clone (toast confirmation avec le disclaimer texte court)

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(legal): mandatory disclaimer on official templates"
```

**⚠️ BLOCKING : Avant deploy prod, équipe légale doit valider le texte. Marquer en `git tag` séparé après validation.**

---

### Task W4.5 — Apply migrations en prod via apply-migrations-prod.sh

**Files:**
- N/A (utilise script existant)

- [ ] **Step 1: Sur prod, dry-run d'abord**

```bash
ssh root@157.90.152.204 "/opt/doktori/apply-migrations-prod.sh --dry-run"
```

Expected: liste 0067, 0068, 0069, 0070.

- [ ] **Step 2: Apply (auto-backup + transaction par migration)**

```bash
ssh root@157.90.152.204 "/opt/doktori/apply-migrations-prod.sh"
```

Expected: 4 OK, 0 fail.

- [ ] **Step 3: Vérification post-deploy**

```bash
ssh root@157.90.152.204 "PGPASSWORD=... psql -h 127.0.0.1 -p 5435 -U doktori -d doktori -c 'SELECT count(*) FROM prescription_templates WHERE is_official=true;'"
```

Expected: 10.

```bash
ssh root@157.90.152.204 "docker logs doktori-web --since 5m 2>&1 | grep -E 'does not exist'"
```

Expected: rien.

---

### Task W4.6 — Activation feature flag pour 3 médecins pilotes

**Files:**
- N/A (admin dashboard ou SQL direct)

- [ ] **Step 1: Sur prod, ajouter 3 doctor IDs au flag**

```sql
UPDATE feature_flags
SET enabled_doctor_ids = ARRAY['<id1>', '<id2>', '<id3>']::uuid[]
WHERE key = 'prescription_templates_enabled';
```

- [ ] **Step 2: Tester avec un compte pilote**

Pilote login → `/medecin/modeles` doit charger les 10 templates officiels.

- [ ] **Step 3: Brief médecin pilote**

Email/WhatsApp avec :
- Lien `/medecin/modeles`
- Liste des 22 variables et leur syntaxe `{{...}}`
- Disclaimer juridique
- Demande feedback semaine suivante

---

### Task W4.7 — Activation full rollout après semaine de monitoring

**Files:**
- N/A (admin SQL)

- [ ] **Step 1: Vérifier métriques succès**

Sur Monitor.dartank.com :
- Templates créés par médecin pilote (cible ≥ 3)
- Apply count moyen
- Aucune erreur runtime

- [ ] **Step 2: Activer pour tous**

```sql
UPDATE feature_flags
SET enabled_for_all = true
WHERE key = 'prescription_templates_enabled';
```

- [ ] **Step 3: Tag final**

```bash
git tag -a templates-v1-shipped -m "Templates feature shipped to all doctors"
git push origin templates-v1-shipped
```

---

### Task W4.8 — Documentation utilisateur (FAQ Aide)

**Files:**
- Modify: `apps/web/app/aide/page.tsx` (ou équivalent)

- [ ] **Step 1: Ajouter section "Modèles d'ordonnance"**

```markdown
## Comment créer un modèle d'ordonnance ?

1. Allez dans **Mes modèles** depuis le menu médecin
2. Cliquez sur **+ Nouveau modèle**
3. Remplissez le titre, choisissez la langue
4. Rédigez votre contenu en utilisant les variables `{{first_name}}`, `{{weight}}`, etc.
5. L'aperçu en direct vous montre le rendu

## Quelles variables sont disponibles ?

23 variables réparties en 4 catégories :
- **Patient** : nom, âge, poids, taille, groupe sanguin, allergies…
- **Médecin** : nom, spécialité, ville…
- **Rendez-vous** : date, type
- **Date / heure** : aujourd'hui, etc.

Le panneau de droite dans l'éditeur les liste toutes — cliquez pour copier.

## Puis-je modifier un modèle officiel Doktori ?

Non directement. Mais cliquez sur **Dupliquer** pour en créer une copie dans vos modèles persos, que vous pourrez éditer librement.
```

- [ ] **Step 2: Commit**

```bash
git commit -am "docs: user help section for prescription templates"
```

---

# Plan summary

**Total tasks:** ~38 atomic tasks across 4 phases
**Effort:** ~52h (~6.5 jours-homme), 4 semaines calendaires
**Migrations:** 4 (0067, 0068, 0069, 0070)
**Files created:** ~25
**Files modified:** ~5
**Tests:** ~30 unit + 10 integration + 2 E2E

**Critical path:**
1. Migrations DB (W1.2-1.4) — 1.5h
2. Lib templates (W1.6-1.9) — 4h
3. API endpoints (W1.10-1.15) — 8h
4. UI éditeur (W2.2-2.7) — 12h
5. Modal application (W3.1-3.2) — 6h
6. E2E (W3.4) — 3h
7. Admin + seed (W4.1-4.3) — 6h
8. Disclaimer + rollout (W4.4-4.7) — 4h

**Risks:**
- Disclaimer juridique blocking : **valider avec équipe légale dès le début W4** (allocation 1 semaine de buffer pour validation)
- Pattern auth `getDoctorSession()` : vérifier que c'est bien le helper standard du codebase
- React 19 + dialog/dropdown shadcn : tester compatibilité
- `react-markdown` ou autre lib markdown rendering : vérifier qu'aucune lib markdown n'est déjà en place

**Validation continue:**
- Tags git après chaque phase : `templates-w1-done`, `templates-w2-done`, `templates-w3-done`, `templates-v1-shipped`
- Smoke tests à chaque tag (HTTP 200 + 0 errors logs + UI load)
- Backups DB avant chaque deploy via `apply-migrations-prod.sh` (automatique)
