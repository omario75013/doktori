# Feature 31 — Stats médecin : benchmarks vs pairs (rank within specialty + city)

## Description

Comparaison anonymisée du médecin connecté avec ses pairs (même spécialité + même ville). Affiche son rang sur 3 KPI : taux de no-show (90j), satisfaction (note moyenne), activité (RDV sur 30j). Quartile + headline contextuel. Cohorte minimale de 3 confrères pour préserver l'anonymat.

Calcul fait offline par cron via une seule passe SQL (CTE + window functions).

## User-facing UI

- Page médecin : `/stats` — section "Comparaison avec mes pairs"
  - 3 cartes KPI : Ponctualité, Satisfaction, Activité 30j
  - Pour chaque carte : rank, /N (taille cohorte), badge quartile (Q1/Q2/Q3/Q4), headline ("Vous êtes 3ᵉ sur 12 cardiologues à Tunis").
  - Si cohorte < 3, badge "Indisponible" pour préserver l'anonymat.
- Composant : `apps/web/components/medecin/peer-benchmarks.tsx`
- Page hôte : `apps/web/app/(medecin)/stats/stats-client.tsx`.

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/medecin/benchmarks` | retourne **uniquement** les rangs du médecin connecté (jamais de data peers) ; renvoie `{available: false}` si cohorte < 3 |
| POST | `/api/cron/benchmarks/recompute` | cron Bearer `CRON_SECRET` — single-pass SQL avec CTE + `RANK() OVER (PARTITION BY specialty, city)` ; upsert dans `doctor_benchmark_snapshots` |

## DB tables

Migration `0079_phase1_polish.sql` :

**`doctor_benchmark_snapshots`** (cache précompilé)
- `doctor_id uuid PRIMARY KEY FK → doctors ON DELETE CASCADE`
- `specialty varchar(100)`
- `city varchar(100)`
- `no_show_rate numeric(5,2)`
- `no_show_rank_specialty integer` / `no_show_total_specialty integer`
- `avg_rating numeric(3,2)` / `rating_rank_specialty integer`
- `total_appointments_30d integer` / `appointments_rank_specialty integer`
- `computed_at timestamptz`

## Configuration

- Cron : `POST /api/cron/benchmarks/recompute` quotidien la nuit avec `Authorization: Bearer ${CRON_SECRET}`.
- Pas de feature flag.
- Le cohort minimum de 3 est codé en dur dans `apps/web/app/api/medecin/benchmarks/route.ts` — modifier si besoin.
- Dark mode : classes `dark:*` câblées dès le départ.

## Troubleshooting

- "Section vide pour le médecin" : cohorte < 3 ou snapshot pas encore calculé. Lancer manuellement `POST /api/cron/benchmarks/recompute`.
- "Rangs incohérents" : vérifier que `doctors.specialty` et `doctors.city` sont bien renseignés et normalisés (lowercase, sans accents).
- "Fuites de données peers" : l'endpoint GET ne renvoie **que** les champs du médecin connecté. Ne jamais ajouter de listing global ici.

## Source commit(s)

- `f0793f0` — migration 0079 phase1_polish (table `doctor_benchmark_snapshots` + ALTER `doctors` pour onboarding tour).
- `3814451` — `feat(polish): #31 doctor benchmarks vs peers` : cron `recompute`, endpoint `/api/medecin/benchmarks`, composant `peer-benchmarks.tsx`, intégration dans `/stats`.
