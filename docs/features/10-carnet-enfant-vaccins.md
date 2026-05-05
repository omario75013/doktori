# Feature 10 — Carnet enfant : vaccins (calendrier vaccinal TN 0-2 ans)

## Description

Carnet de vaccination numérique pour les enfants (dépendants), aligné sur le calendrier vaccinal obligatoire tunisien (0 à 2 ans : BCG, hépatite B, DTC-Hib-VPI, ROR, etc.). Permet aux parents d'enregistrer chaque dose reçue, de visualiser les rappels à venir, et de partager avec leur médecin.

Coexiste avec le carnet de vaccination patient adulte (D22) — deux tables distinctes.

## User-facing UI

- Liste des enfants : `/dossier-medical/enfants` (`apps/web/app/(patient)/dossier-medical/enfants/page.tsx`)
- Détail enfant : `/dossier-medical/enfants/[dependentId]` (carnet vaccinal complet, doses reçues + à venir)
- Page de référence publique : `/vaccins/[slug]` (info pédagogique sur chaque vaccin, basé sur `vaccine_info_content`)

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET/POST | `/api/me/dependents/[id]/vaccinations` | liste / ajoute une dose pour un enfant |
| PATCH/DELETE | `/api/me/dependents/[id]/vaccinations/[recordId]` | modifie / supprime une dose |
| GET/POST | `/api/me/vaccinations` | équivalent pour le patient adulte (D22) |
| PATCH/DELETE | `/api/me/vaccinations/[id]` | idem adulte |

## DB tables

Migration `0076_phase1_marketing.sql` :

**`vaccine_info_content`** (référentiel public)
- `slug varchar(60) PRIMARY KEY` (e.g. `bcg`, `hepatite-b`, `dtcoq-hib-vpi`)
- `name_fr / name_ar varchar(120)`
- `age_min_months / age_max_months integer` (NULL = adulte)
- `description_fr / description_ar text`
- `doses_count integer` (nombre total de doses prévues)
- `is_mandatory_tn boolean` (vaccin obligatoire en Tunisie)
- `display_order integer`

**`child_vaccination_records`** (doses reçues)
- `id uuid pk`
- `patient_id uuid FK → patients ON DELETE CASCADE`
- `dependent_id uuid FK → patient_dependents ON DELETE CASCADE`
- `vaccine_slug varchar(60) FK → vaccine_info_content`
- `dose_number integer DEFAULT 1`
- `date_received date`
- `notes text`
- UNIQUE `(patient_id, dependent_id, vaccine_slug, dose_number)` (empêche les doubles)

Migration seed : `0080_phase1_marketing_seed.sql` (peuple `vaccine_info_content` avec le calendrier TN).

## Configuration

- Pas de feature flag.
- Le contenu de référence (`vaccine_info_content`) est seedé via `0080_phase1_marketing_seed.sql` — pour le mettre à jour, créer une nouvelle migration ADD-ONLY ou modifier en SQL direct (table read-only côté patient).

## Troubleshooting

- "Erreur DYNAMIC_SERVER_USAGE sur /vaccins/[slug]" : forcer `export const dynamic = 'force-dynamic'` (corrigé par commit `01f1aba`).
- "Doublon vaccin/dose" : la contrainte UNIQUE empêche d'enregistrer deux fois la même dose pour le même enfant. Si erreur 23505, le parent essaie d'enregistrer un doublon — UI doit afficher "déjà enregistré".
- "Vaccin manquant dans la liste" : ajouter une ligne dans `vaccine_info_content` via une migration ADD-ONLY (slug unique, ON CONFLICT DO NOTHING).

## Source commit(s)

- `fb8d94b` — migration 0076 (tables `vaccine_info_content` + `child_vaccination_records`).
- `dfbe6ec` — endpoint `/api/me/dependents/[id]/vaccinations` + page `/dossier-medical/enfants/[dependentId]`.
- `9ac7db5` — page `/vaccins/[slug]` + DELETE/PATCH `[recordId]`.
- `5a82712` — D22 carnet patient adulte (parallèle, `/api/me/vaccinations`).
- `01f1aba` — fix dynamic rendering vaccins.
