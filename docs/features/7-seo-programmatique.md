# Feature 7 — SEO programmatique (`/[ville]/[specialite]`)

## Description

Pages de listing SEO générées statiquement pour chaque combinaison ville × spécialité, optimisées pour le ranking local Tunisie. Le but : capturer le trafic longue traîne du type "cardiologue à Tunis", "dermatologue à Sfax".

Audience : patients tunisiens en recherche organique Google.

Volume : ~720 pages statiques (CITIES × SPECIALTIES dans `@doktori/shared`).

## User-facing UI

- URL : `/[ville]/[specialite]` (ex : `/tunis/cardiologue`, `/sfax/dermatologue`)
- Page principale : `apps/web/app/(patient)/[ville]/[specialite]/page.tsx`
- Composants utilisés :
  - `DoctorCard` (liste résultats)
  - `NewsletterSignup` (CTA fallback quand 0 résultats, source = `seo_empty_city`)
- Variante existante : `/medecins/[specialite]/[quartier]` (créée plus tôt, JSON-LD MedicalBusiness + breadcrumbs).

État vide : message "Aucun médecin disponible…" + formulaire newsletter pour alerter le patient + CTA recrutement médecin.

## API endpoints

Aucun endpoint dédié — la page lit directement Drizzle via `db.select().from(doctors)` filtré sur `city + specialty + isActive`.

## DB tables

Aucune migration spécifique. Lecture sur la table `doctors` existante (champs `city`, `specialty`, `isActive`).

Constants partagées dans `packages/shared/src/constants.ts` : `CITIES` et `SPECIALTIES`.

## Configuration

- `generateStaticParams()` itère sur toutes les combinaisons CITIES × SPECIALTIES.
- `generateMetadata()` produit title/description FR par défaut.
- Sitemap mis à jour dans `apps/web/app/sitemap.ts` (priority 0.6 sur les combinaisons).
- Pas de feature flag ; les pages sont publiques par défaut.

## Troubleshooting

- "404 sur `/tunis/cardiologue`" : vérifier que les IDs ville/spécialité matchent ceux de `@doktori/shared` (slugs lowercase, pas d'accents). `notFound()` est déclenché si `CITIES.find(c => c.id === ville)` retourne undefined.
- "Build out-of-memory pendant la génération" : 720 pages statiques peuvent saturer la RAM Next.js — utiliser `export const dynamic = 'force-dynamic'` sur les pages problématiques ou augmenter `NODE_OPTIONS=--max-old-space-size`.
- "Pages vides en prod" : les médecins doivent avoir `isActive = true` ET un `city`/`specialty` non null.

## Source commit(s)

- `9ac7db5` — création de la page `/[ville]/[specialite]` (fold dans le commit retention #18).
- `41a3968` — version originale `/medecins/[specialite]/[quartier]` avec JSON-LD MedicalBusiness (avr. 2026).
- `1905937` — sitemap mis à jour pour inclure toutes les combinaisons.
