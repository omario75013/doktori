# Feature 29 — Tarifs CNAM Tunisie (30 actes seedés + page `/tarifs`)

## Description

Page publique de référence présentant les tarifs CNAM Tunisie : nomenclature officielle des actes (consultation, imagerie, biologie, dentaire, procédures), tarif de base en TND, taux de remboursement (par défaut 70 %), et catégorie. SEO-optimisée pour capturer les requêtes "tarif consultation Tunisie", "remboursement CNAM".

30 actes seedés au lancement, mise à jour via migration ADD-ONLY.

## User-facing UI

- Page publique : `/tarifs` (`apps/web/app/tarifs/page.tsx` + `tarifs-client.tsx`)
  - Liste filtrable par catégorie : `consultation`, `imaging`, `lab`, `procedure`, `specialist`
  - Affichage : code, nom FR/AR, tarif TND, % remboursement, montant remboursé calculé
  - `revalidate: 3600` (cache ISR 1h)
- Page existante associée (C17) : `/devis/[doctorId]` (estimateur de prix CNAM/mutuelle).

## API endpoints

Aucun endpoint dédié — la page lit directement Drizzle via `db.select().from(cnamActs).orderBy(asc(cnamActs.displayOrder))`.

L'estimateur de devis C17 utilise les mêmes données via la query Drizzle.

## DB tables

Migration `0078_phase1_tech.sql` :

**`cnam_acts`**
- `code varchar(20) PRIMARY KEY` (e.g. `CONS_GEN`, `CONS_SPE`, `ECG`, `ECHO_ABDO`)
- `name_fr / name_ar varchar(200)`
- `base_fee_tnd numeric(8,2)` (tarif officiel)
- `reimbursement_pct numeric(5,2) DEFAULT 70.00`
- `category varchar(40)` (`consultation` | `imaging` | `lab` | `procedure` | `specialist`)
- `notes_fr / notes_ar text`
- `display_order integer`

Migration seed : `0081_phase1_cnam_seed.sql` peuple 30 actes (consultation généraliste, spécialiste, ECG, écho, scanner, IRM, NFS, glycémie, etc.).

## Configuration

- `revalidate: 3600` au niveau de la page : ISR 1h.
- `metadata.robots = { index: true, follow: true }` — indexation autorisée explicitement.
- Pour ajouter / mettre à jour un acte : `INSERT INTO cnam_acts (...) ON CONFLICT (code) DO UPDATE SET ...` dans une nouvelle migration.

## Troubleshooting

- "Page /tarifs vide" : vérifier que `cnam_acts` contient bien des lignes (30 par défaut après seed). Si la migration 0081 n'a pas tourné, lancer `pnpm db:migrate`.
- "Tarifs obsolètes" : les tarifs CNAM peuvent évoluer (arrêté ministériel) ; ajouter une migration ADD-ONLY pour mettre à jour `base_fee_tnd` ou `reimbursement_pct`.
- "Total remboursement faux" : `reimbursement_pct` est en %, base 100. Le calcul côté client doit être `base_fee_tnd * reimbursement_pct / 100`.

## Source commit(s)

- `9dc20d2` — migration 0078 phase1_tech (table `cnam_acts`).
- `9ac7db5` — page publique `/tarifs` + `tarifs-client.tsx` + extension du devis C17.
- Migration seed : `0081_phase1_cnam_seed.sql`.
- C17 (commit `01565ed`) — estimateur de prix utilisant ces données.
