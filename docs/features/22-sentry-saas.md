# Feature 22 — Sentry SaaS (config + DSN, gracefully disabled si pas de DSN)

## Description

Intégration Sentry SaaS (sentry.io) pour l'observabilité des erreurs en production : crashes serveur Next.js, erreurs client, traces de performance. La configuration est **gracefully disabled** : si `SENTRY_DSN` n'est pas défini ou contient `"placeholder"`, Sentry n'initialise pas (évite les erreurs en local / dev).

3 environnements : server (Node), client (browser), edge (middleware Next).

## User-facing UI

Aucune UI — feature transparente (collecte d'erreurs en arrière-plan).

## API endpoints

Aucun — Sentry SDK envoie ses payloads directement vers `*.ingest.sentry.io`.

## DB tables

Aucune.

## Configuration

Fichiers : `apps/web/sentry.server.config.ts`, `apps/web/sentry.client.config.ts`, `apps/web/sentry.edge.config.ts`.

Vars d'environnement :
- `SENTRY_DSN` (server / edge) — DSN secret Sentry SaaS
- `NEXT_PUBLIC_SENTRY_DSN` (client) — exposé au browser

Réglages Sentry :
- `tracesSampleRate: 0.1` (10 % des transactions tracées)
- `replaysSessionSampleRate: 0` (pas de session replay normal)
- `replaysOnErrorSampleRate: 0.1` (10 % de replay sur les erreurs)
- `environment: process.env.NODE_ENV`

Le check `!dsn.includes("placeholder")` permet de coller un DSN factice dans `.env.example` sans déclencher Sentry.

Dépendance : `@sentry/nextjs` ajouté dans `apps/web/package.json`.

## Troubleshooting

- "Pas d'erreurs dans Sentry" : vérifier que `SENTRY_DSN` est bien injecté dans le container (Docker `op inject` ou systemd `EnvironmentFile`). Tester avec une erreur volontaire `throw new Error('test sentry')`.
- "Trop de bruit dans Sentry" : augmenter le filtrage (`beforeSend`) ou réduire `tracesSampleRate`.
- "Coût Sentry élevé" : Sentry facture par event ; sampling à 0.1 limite à 10 % des traces. Adjust si nécessaire.
- "Sentry SDK active en local" : vérifier que `.env.local` n'a pas un vrai DSN par erreur (utiliser `placeholder`).

## Source commit(s)

- `88cb4e8` — `feat(observability): #22 Sentry SaaS config (gracefully disabled if no DSN)`. Ajoute les 3 configs + dépendance `@sentry/nextjs`.
