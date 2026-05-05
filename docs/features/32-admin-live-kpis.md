# Feature 32 — Admin live KPIs (polling SWR 10s, 8 cards)

## Description

Tableau de bord live KPIs en haut de `/admin` : 8 cartes mises à jour toutes les 10 secondes via SWR. Chaque carte affiche la valeur du jour + delta vs hier. Indicateur de live (point vert pulsant) + horodatage de dernière mise à jour. Animation flash teal 600ms sur la carte quand sa valeur change.

8 KPI : RDV pris aujourd'hui, RDV terminés, revenu (TND), nouveaux patients, médecins en attente de validation, sessions SOS actives, SMS sur 24h, erreurs sur 24h.

## User-facing UI

- Page : `/admin` — composant `<LiveKpisGrid />` ajouté en haut.
- Composant : `apps/web/components/admin/live-kpis-grid.tsx`
- Pulse teal sur changement de valeur (effet visuel "ça bouge").
- Live indicator : point vert pulsant + "Mis à jour il y a Xs".

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/admin/live-kpis` | super_admin uniquement ; renvoie en une seule passe Postgres (CTE) les 8 métriques pour aujourd'hui + hier ; le delta est calculé côté client |

## DB tables

Aucune nouvelle table — l'endpoint agrège sur les tables existantes (`appointments`, `patients`, `doctors`, `sos_sessions`, `sms_logs`, `audit_logs`).

## Configuration

- SWR config : `refreshInterval: 10000`, `revalidateOnFocus: true`.
- Rôle requis : `super_admin`.
- Pas de feature flag.
- Métrique `errors_24h` est actuellement à 0 (placeholder) — à câbler avec Sentry (#22) ou les logs applicatifs.

## Troubleshooting

- "KPIs ne se mettent pas à jour" : vérifier la console browser (erreurs SWR), vérifier que l'admin est bien `super_admin`. SWR garde le résultat cached même en cas d'erreur réseau.
- "Latence importante côté DB" : la query est volontairement une seule passe avec CTE — si lente, ajouter des index sur `appointments(created_at)`, `patients(created_at)`, etc.
- "Errors 24h toujours à 0" : c'est attendu tant que Sentry n'est pas câblé en source de vérité. À implémenter dans une prochaine itération.

## Source commit(s)

- `170cc56` — `feat(polish): #32 admin live KPIs dashboard with 10s polling SWR`. Ajoute `<LiveKpisGrid />` + endpoint `/api/admin/live-kpis`.
- `dfbe6ec` — copie/déplacement initial de l'endpoint dans le commit Stream B (couvert par #13).
