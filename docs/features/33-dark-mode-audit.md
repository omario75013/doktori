# Feature 33 — Dark mode audit (corrections systématiques pages patient)

## Description

Audit + corrections des pages patient à fort trafic où des `bg-white` / `border-gray-200` "raw" étaient utilisés sans variante `dark:`. Le résultat avant correction : pages illisibles en dark mode (white-on-white pour les modals, time-slots, dropdowns).

Couvre principalement le funnel de booking RDV (page la plus visitée du portail patient), avec rattrapage sur quelques surfaces ailleurs (medecin/[slug], mes-rdv satisfaction buttons, sticky CTA, paramètres/securité QR).

## User-facing UI

Pages corrigées :
- `/rdv/[slug]` (booking) — 26+ classes `bg-white` raw maintenant complétées par `dark:bg-gray-900` / `dark:border-gray-700` sur :
  - Cards principales
  - Sélecteur de mode (cabinet / téléconsult / domicile)
  - Tuiles de créneaux horaires
  - Sélecteur de dépendant / bénéficiaire
  - Textarea de motif
  - Dropdown CNAM
- `/medecin/[slug]` (couvert par les commits Stream B précédents)
- `/mes-rdv` boutons satisfaction
- Sticky mobile CTA
- `/parametres/securite` QR holder

## API endpoints

Aucun.

## DB tables

Aucune.

## Configuration

- Le toggle dark mode est géré par `next-themes` (commit `61ad1d5`) — composant `<ThemeProvider />` dans `apps/web/app/layout.tsx`.
- Convention : pour chaque `bg-white`, ajouter `dark:bg-gray-900` (ou `dark:bg-gray-800` pour les surfaces élevées). Pour `border-gray-200`, ajouter `dark:border-gray-700`.

## Troubleshooting

- "White-on-white sur une nouvelle page" : oublier `dark:bg-*` est l'erreur classique. Ajouter automatiquement la variante dark à chaque `bg-white` / `bg-gray-50` / `bg-gray-100`.
- "Bordures invisibles en dark" : `border-gray-200` doit être systématiquement complété par `dark:border-gray-700`.
- "Texte illisible dans dark mode" : `text-gray-900` sans `dark:text-white` ou `dark:text-gray-100`. À auditer page par page.
- "Comment auditer ?" : `grep -RE "bg-white|border-gray-2" apps/web/app/\(patient\) | grep -v "dark:"`.

## Source commit(s)

- `7de3c37` — `feat(polish): #33 dark mode audit and fixes for patient pages`. Cible le funnel `/rdv/[slug]`.
- Travail antérieur (Stream B, déjà mergé) couvre `medecin/[slug]`, `mes-rdv`, sticky CTA, `parametres/securite`.
- `61ad1d5` — `feat: dark mode toggle with next-themes` (mise en place initiale).
- `5fb7de1`, `693f694`, `909ea5d` — audits dark mode antérieurs sur clinique, search, blog, SOS, cabinets.
