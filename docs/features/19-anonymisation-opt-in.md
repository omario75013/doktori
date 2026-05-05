# Feature 19 — Anonymisation opt-in (recherche médicale, loi 2004-63)

## Description

Système de consentement explicite (opt-in) pour que les données médicales d'un patient puissent être utilisées **anonymisées** à des fins de recherche médicale, statistiques agrégées, ou santé publique. Conformité loi tunisienne 2004-63 sur la protection des données personnelles.

Le patient peut révoquer son consentement à tout moment (réversible).

## User-facing UI

- Page patient : `/parametres/recherche-medicale` (`apps/web/app/(patient)/parametres/recherche-medicale/page.tsx`)
  - Explainer didactique (3 sections : qu'est-ce qu'on collecte, comment c'est anonymisé, qui y a accès)
  - Toggle on/off avec modal de confirmation
  - "Trust pills" : `anonymous`, `loi 2004-63`, `réversible`
- Bannière subtile sur `/mon-espace` quand le consentement n'a jamais été demandé. Disparaît dès que le patient répond (oui ou non), ou est dismissable via un flag `localStorage`.

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/me/anonymization-consent` | retourne le consentement courant |
| PUT | `/api/me/anonymization-consent` | upsert `{granted: boolean, scope: string[]}` |

L'endpoint capture `ip` et `user_agent` automatiquement pour traçabilité légale.

## DB tables

Migration `0077_phase1_retention.sql` :

**`anonymization_consents`**
- `patient_id uuid PRIMARY KEY FK → patients ON DELETE CASCADE`
- `granted boolean DEFAULT false`
- `granted_at timestamptz`
- `revoked_at timestamptz`
- `scope jsonb DEFAULT '["aggregate_stats"]'` — peut contenir `aggregate_stats`, `research_partner_X`, `public_health`
- `ip varchar(50)`
- `user_agent text`
- `updated_at timestamptz`

## Configuration

- Pas de feature flag — la page est accessible à tout patient connecté.
- Le scope par défaut au PUT est `["aggregate_stats", "public_health"]` (vu dans le commit message).
- La bannière sur `/mon-espace` est dismissable via `localStorage.setItem('anon_consent_banner_dismissed', '1')`.

## Troubleshooting

- "Patient se plaint de la bannière qui revient" : vérifier le `localStorage` — peut avoir été nettoyé. La logique : on affiche tant que `granted IS NULL` (jamais répondu) ET pas de flag `localStorage`.
- "Consentement absent en base" : `anonymization_consents` est créée à la première interaction ; avant ça, la query GET renvoie `null`. Côté UI traiter `null` comme "jamais demandé".
- "Audit légal" : la trace IP + user_agent + timestamps `granted_at`/`revoked_at` permet de prouver le consentement. Conserver indéfiniment (pas dans `retention_policies`).

## Source commit(s)

- `00ecb6c` — migration 0077 (table `anonymization_consents`).
- `1905937` — endpoint `/api/me/anonymization-consent` + page `/parametres/recherche-medicale` + bannière `/mon-espace`.
