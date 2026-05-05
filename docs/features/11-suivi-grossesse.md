# Feature 11 — Suivi de grossesse (5 semaines clés + contenu W1-W42)

## Description

Suivi semaine par semaine pour les patientes enceintes, avec contenu pédagogique bilingue FR/AR (taille du bébé, conseils, points d'attention) et 5 semaines clés (W12, W20, W28, W32, W37) qui déclenchent des rappels d'examens. Le contenu pré-écrit `pregnancy_week_content` couvre W1 à W42 et sert aussi de pages SEO publiques.

## User-facing UI

- Page espace patiente : `/grossesse` — `apps/web/app/(patient)/grossesse/page.tsx` (ma grossesse en cours, semaine actuelle, prochains examens)
- Page de référence publique : `/grossesse/[week]` — `apps/web/app/grossesse/[week]/page.tsx` (contenu hebdomadaire SEO)
- Le calcul de la semaine en cours se base sur `due_date` (DPA) ou `start_date` (DDR / LMP).

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET/POST | `/api/me/pregnancy` | liste / déclare une grossesse en cours |
| PATCH/DELETE | `/api/me/pregnancy/[id]` | met à jour / clôture une grossesse |

## DB tables

Migration `0076_phase1_marketing.sql` :

**`pregnancy_week_content`** (référentiel public, 1 ligne par semaine)
- `week_number integer PRIMARY KEY` (CHECK 1-42)
- `title_fr / title_ar varchar(200)`
- `baby_size_fr / baby_size_ar varchar(120)` (e.g. "Taille d'une fraise")
- `content_md_fr / content_md_ar text` (markdown)
- `tips_fr / tips_ar jsonb` (array d'astuces)

**`patient_pregnancies`** (suivi par patiente)
- `id uuid pk`
- `patient_id uuid FK → patients ON DELETE CASCADE`
- `due_date date` (Date prévue d'accouchement, obligatoire)
- `start_date date` (Date des dernières règles, optionnel)
- `ended_at date` (NULL = en cours)
- `notes text`
- UNIQUE `NULLS NOT DISTINCT (patient_id, ended_at)` — une seule grossesse active par patiente.
- Index partiel sur `patient_id WHERE ended_at IS NULL`.

Migration seed `0080_phase1_marketing_seed.sql` peuple `pregnancy_week_content` pour W1-W42 (FR + AR).

## Configuration

- Les 5 semaines clés (W12 dépistage T21, W20 écho morphologique, W28 GAD, W32 écho croissance, W37 préparation) sont câblées en dur dans le composant frontend ; pour les modifier, éditer la page `/grossesse`.
- Pas de feature flag.

## Troubleshooting

- "Grossesse active dupliquée" : la contrainte `pregnancy_active_unique UNIQUE NULLS NOT DISTINCT (patient_id, ended_at)` empêche d'avoir deux entrées avec `ended_at = NULL` pour la même patiente. Si l'API renvoie 23505, demander à la patiente de clôturer l'ancienne d'abord.
- "Page /grossesse/[week] vide" : vérifier que `pregnancy_week_content` est bien seedée (migration 0080). Pour W43+ retourner 404.
- "DPA en arrière" : valider côté API que `due_date` est dans le futur ou ≤ 14 jours dans le passé (post-terme).

## Source commit(s)

- `fb8d94b` — migration 0076 (tables `pregnancy_week_content` + `patient_pregnancies`).
- `dfbe6ec` — endpoints `/api/me/pregnancy` + page `/grossesse` patiente.
- Le contenu `pregnancy_week_content` W1-W42 est seedé dans `0080_phase1_marketing_seed.sql`.
