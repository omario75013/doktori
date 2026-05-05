# Feature 27 — API publique read-only (`api_keys` + `/api/v1/public/*`)

## Description

API REST publique en lecture seule, exposée pour permettre à des partenaires (CNAM, mutuelles, agrégateurs santé) d'interroger le catalogue Doktori : médecins, spécialités, villes, disponibilités. Authentification par **API key** (préfixe `dok_xxxxxx` + hash SHA-256 stocké), rate limiting par minute, scopes JSON, logs de requête.

Documentation OpenAPI 3.1 disponible sur `/api-docs`.

## User-facing UI

- Page admin : `/admin/api-keys` (`apps/web/app/(admin)/admin/api-keys/api-keys-client.tsx`)
  - Création de clé (le secret n'est affiché qu'une fois)
  - Révocation
  - Affichage du préfixe (8 premiers chars), `last_used_at`, scopes, rate limit
- Page publique : `/api-docs` (référence OpenAPI rendue côté client).

## API endpoints

### Publics (avec API key dans header `Authorization: Bearer dok_xxx`)

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/v1/public/doctors` | liste paginée des médecins actifs |
| GET | `/api/v1/public/doctors/[slug]` | détail d'un médecin (par slug) |
| GET | `/api/v1/public/specialties` | liste des spécialités |
| GET | `/api/v1/public/cities` | liste des villes |
| GET | `/api/v1/public/availability/[slug]` | créneaux dispo des 14 prochains jours |

### Admin (super_admin uniquement)

| Méthode | Route | Rôle |
|---|---|---|
| GET/POST | `/api/admin/api-keys` | liste / crée une clé |
| DELETE | `/api/admin/api-keys/[id]` | révoque (set `revoked_at`) |

Helper : `apps/web/lib/api-keys.ts` (génération, hash SHA-256, validation, rate limit, log de requête).

## DB tables

Migration `0078_phase1_tech.sql` :

**`api_keys`**
- `id uuid pk`
- `key_hash varchar(128) UNIQUE` (SHA-256 du secret complet)
- `prefix varchar(20)` (8 premiers chars du secret, visibles)
- `name varchar(120)` (label humain)
- `owner_email varchar(255)`
- `scopes jsonb DEFAULT '["read:doctors","read:specialties","read:cities"]'`
- `rate_limit_per_minute integer DEFAULT 60`
- `active boolean DEFAULT true`
- `last_used_at / expires_at / revoked_at timestamptz`
- `created_by_admin uuid`
- Index partiel sur `key_hash WHERE active = true AND revoked_at IS NULL`.

**`api_request_logs`**
- `id uuid pk`
- `api_key_id uuid FK → api_keys ON DELETE SET NULL`
- `method`, `path`, `status_code`, `duration_ms`, `ip`, `user_agent`
- Index `(api_key_id, created_at DESC)` pour analytics rapide.

## Configuration

- Pas de feature flag.
- Rate limit géré in-memory + via la table `api_request_logs` (compte des requêtes des 60 dernières secondes).
- Scopes supportés : `read:doctors`, `read:specialties`, `read:cities`, `read:availability`. Extensible via le check dans chaque route.
- Spec OpenAPI : `apps/web/openapi.yaml` (commit `38d4500`).

## Troubleshooting

- "401 sur appel API publique" : vérifier le header `Authorization: Bearer <key>` ; vérifier que la clé n'est pas `revoked_at` ou expirée ; vérifier le scope correspondant à la route.
- "429 Too Many Requests" : `rate_limit_per_minute` atteint. Augmenter pour ce client si légitime, ou identifier l'abus via `api_request_logs`.
- "Le secret est perdu" : `key_hash` n'est pas réversible. Créer une nouvelle clé et révoquer l'ancienne. Affiche le secret **une seule fois** au moment de la création — le frontend doit prévenir l'utilisateur.

## Source commit(s)

- `9dc20d2` — migration 0078 phase1_tech (tables `api_keys` + `api_request_logs`).
- `3465ed2` — endpoints `/api/v1/public/doctors`, `/specialties`, `/cities`, `/doctors/[slug]` + helper `lib/api-keys.ts`.
- `dfbe6ec` — admin `/admin/api-keys` (CRUD), `/api/admin/api-keys/*`, `/api/v1/public/availability/[slug]`, page `/api-docs`.
- `38d4500` — `docs(api): OpenAPI 3.1 YAML spec for /api/v1/public/* endpoints`.
