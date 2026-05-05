# Feature 34 — Tour produit médecin (custom React + framer-motion + SVG, 5 steps)

## Description

Tour de découverte interactif au premier login d'un médecin sur `/dashboard`. 5 étapes guidées qui pointent successivement vers : Sidebar, Calendrier, Patients, Modèles, Stats. Implémentation custom (pas de driver.js / shepherd) pour garder le bundle léger et le contrôle total : SVG mask pour le spotlight, anneau dashed teal animé, transitions framer-motion, indicateur d'étape.

Auto-launch 1.5s après le mount de `/dashboard` si `onboarding_tour_completed_at IS NULL` ET `onboarding_tour_skipped = false`.

3 boutons : **Suivant** (next), **Passer** (mark skipped), **Terminer** (étape finale → mark completed).

## User-facing UI

- Composant : `apps/web/components/medecin/onboarding-tour.tsx` (319 lignes, self-contained).
- Sidebar (`apps/web/app/(medecin)/sidebar-nav.tsx`) gagne des attributs `data-tour-id` sur l'aside et chaque lien nav, pour permettre au tour de cibler des éléments stables (pas de couplage class-name).
- Hôte : `apps/web/app/(medecin)/dashboard/page.tsx` (mount conditionnel).
- A11y : `role="dialog"`, `aria-modal`, `aria-labelledby`, focus-visible sur les boutons.

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/medecin/onboarding-tour/complete` | mark `onboarding_tour_completed_at = now()` (via `requireDoctor` guard) |
| POST | `/api/medecin/onboarding-tour/skip` | mark `onboarding_tour_skipped = true` |

## DB tables

Migration `0079_phase1_polish.sql` — ALTER `doctors` :
- `onboarding_tour_completed_at timestamptz` (NULL = jamais terminé)
- `onboarding_tour_skipped boolean NOT NULL DEFAULT false`

Logique d'auto-launch : `WHERE onboarding_tour_completed_at IS NULL AND onboarding_tour_skipped = false`.

## Configuration

- Pas de feature flag.
- Pas de var d'env.
- Pour resetter pour un médecin (debug) : `UPDATE doctors SET onboarding_tour_completed_at = NULL, onboarding_tour_skipped = false WHERE id = '...';`.
- Délai d'auto-launch : 1500ms après mount (codé en dur dans `dashboard/page.tsx`).

## Troubleshooting

- "Le tour ne se lance jamais" : vérifier les flags en base (les deux doivent être à NULL/false). Vérifier la console browser pour erreurs framer-motion.
- "Le spotlight pointe au mauvais endroit" : le tour utilise `data-tour-id` pour cibler — vérifier que ces attributs existent toujours dans la sidebar (ne pas les supprimer en refactorant).
- "Le tour bloque les clics" : c'est normal pendant l'animation ; appuyer sur Passer ou Terminer pour le fermer. Si bloqué, `localStorage.clear()` ne suffit pas, il faut updater la DB.
- "Bundle size impacté" : framer-motion est déjà utilisé ailleurs ; pas de dépendance ajoutée.

## Source commit(s)

- `f0793f0` — migration 0079 phase1_polish (ALTER `doctors` pour les 2 colonnes onboarding tour + table benchmarks).
- `e9753f4` — `feat(polish): #34 doctor onboarding tour (5 steps, skip/complete)` : composant `onboarding-tour.tsx`, attributs `data-tour-id`, endpoints `/api/medecin/onboarding-tour/complete` et `/skip`, mount dans `dashboard/page.tsx`.
