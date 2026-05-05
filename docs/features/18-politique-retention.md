# Feature 18 — Politique de rétention (retention_policies + cron purge)

## Description

Système configurable de rétention des données conforme à la loi tunisienne 2004-63 (et au RGPD pour les données croisées EU). L'admin définit, par type de ressource, combien de jours conserver et si la purge est une **anonymisation** (`hard_delete = false`) ou une **suppression définitive** (`hard_delete = true`).

Un cron tourne en mode `dry-run` par défaut (compte ce qu'il aurait supprimé, sans toucher à la DB). Pour exécuter pour de vrai : `?execute=true`.

7 ressources gérées par défaut.

## User-facing UI

- Page admin : `/admin/retention` (`apps/web/app/(admin)/admin/retention/page.tsx` + `retention-table.tsx`)
  - Édition inline : `retention_days`, `hard_delete` toggle, `description`.
  - Affiche `last_run_at` par ressource.
- Page publique : `/legal/confidentialite` lit la table `retention_policies` et l'affiche dans une section "Durées de conservation" (transparence loi 2004-63).

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/admin/retention` | liste toutes les policies |
| PATCH | `/api/admin/retention/[resourceType]` | met à jour (super_admin uniquement) |
| POST | `/api/cron/retention/purge` | cron Bearer `CRON_SECRET` — par défaut `dry-run`, `?execute=true` pour appliquer |

## DB tables

Migration `0077_phase1_retention.sql` :

**`retention_policies`**
- `resource_type varchar(40) PRIMARY KEY`
- `retention_days integer` (CHECK > 0)
- `description text`
- `hard_delete boolean DEFAULT false` (false = anonymise, true = supprime)
- `last_run_at timestamptz`

Seedés au lancement :

| resource_type | retention_days | hard_delete | description |
|---|---|---|---|
| `audit_logs` | 1825 (5 ans) | false | Légal Tunisie, anonymisé |
| `sms_logs` | 730 (2 ans) | false | Analyse usage |
| `messages` | 1825 (5 ans) | false | Secret médical, anonymisé |
| `cancelled_appointments` | 365 (1 an) | true | Post-cancel |
| `inactive_patients` | 2555 (7 ans) | true | Inactivité = suppression |
| `webhook_logs` | 90 | true | 3 mois |
| `analytics_events` | 365 (1 an) | true | 1 an |

## Configuration

- Cron : `POST /api/cron/retention/purge` une fois par jour la nuit avec `Authorization: Bearer ${CRON_SECRET}`. **TOUJOURS** commencer par un dry-run en prod, vérifier les compteurs, puis lancer avec `?execute=true`.
- Rôle requis pour PATCH : `super_admin` (vérifié dans le middleware).
- Pour ajouter une nouvelle ressource : `INSERT INTO retention_policies (...)` puis ajouter le case correspondant dans `apps/web/app/api/cron/retention/purge/route.ts`.

## Troubleshooting

- "Cron renvoie 0 partout" : vérifier que `last_run_at` est bien mis à jour à chaque exécution. Si `hard_delete = false`, vérifier la fonction d'anonymisation pour cette ressource.
- "Données détruites accidentellement" : le cron est dry-run par défaut. Si `?execute=true` a été appelé par erreur, restore depuis le backup nightly Supabase. **TOUJOURS faire un backup avant de toggler `hard_delete = true` sur une ressource.**
- "Patient se plaint que ses messages ont disparu" : `messages` est anonymisé après 5 ans (loi Tunisie). Confirmer la date du message — si > 5 ans, c'est conforme.

## Source commit(s)

- `00ecb6c` — migration 0077 (table `retention_policies` + seed 7 lignes).
- `9ac7db5` — endpoints `/api/admin/retention/*` + cron `/api/cron/retention/purge` + page admin `/admin/retention` + intégration dans `/legal/confidentialite`.
