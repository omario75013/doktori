# Doktori — Changelog Mai 2026

## Session du 4 mai 2026 — Phase 1 Patient Frontend

### Vue d'ensemble

Cette session a livré :
1. **Templates ordonnances avec variables** (24 vars + 10 modèles officiels FR)
2. **30 features patient** réparties en 4 streams : RGPD, UX, Différenciateurs, Nice-to-have
3. **16 features Phase 1A** : SEO, Newsletter, Carnet enfant, Grossesse, Rappels, Affiliation, Rétention, Anonymisation, Sentry, API publique, CNAM Tunisie, Stats benchmarks, Live KPIs, Dark mode, Tour produit

### Tags release publiés

| Tag | Description | Date |
|---|---|---|
| `templates-w1-done` | Backend templates (lib + API + 85 tests) | 2026-05-03 |
| `templates-w2-done` | UI éditeur médecin templates | 2026-05-03 |
| `templates-w3-done` | Modal application + flag + E2E | 2026-05-03 |
| `templates-w4-pre-deploy` | Admin CRUD + 10 templates officiels seed | 2026-05-03 |
| `templates-v1-shipped` | Flag activé pour 69 médecins | 2026-05-03 |
| `templates-v2-complete` | 6 F-features (search, CSV, tabs, photos, map, slots) | 2026-05-04 |
| `templates-debt-cleared` | Dette technique éliminée (D5-D9) | 2026-05-04 |
| `patient-frontend-30features` | 30 features patient déployées | 2026-05-04 |
| `phase1-16features-shipped` | Phase 1 16 items (à venir) | 2026-05-04 |

### Schéma DB ajouté cette session

#### Templates ordonnances (4 migrations)
- `0067_prescription_templates` : table principale + 5 indexes + 2 triggers
- `0068_prescriptions_template_link` : FK template_id sur prescriptions
- `0069_template_audit_logs` : audit bilatéral médecin + admin
- `0070_prescription_templates_seed` : 10 templates officiels FR

#### Features patient (3 migrations)
- `0071_doctor_practice_photos` : galerie photos cabinet (jsonb)
- `0072_feature_flags_per_doctor` : pilot gating array uuid
- `0073_patient_features_foundation` : 13 tables + 9 ALTER (RGPD, UX, Diff, Nice)
- `0074_password_reset_tokens` : reset password tokens
- `0074_doctor_last_active_at` : online status tracking

#### Phase 1A (4 migrations)
- `0076_phase1_marketing` : newsletter + grossesse + vaccinations enfant (6 tables)
- `0077_phase1_retention` : maladies chroniques + référencements médecin + rétention + anonymisation (5 tables + 7 seed rows)
- `0078_phase1_tech` : api keys + CNAM Tunisia (3 tables + 30 seed acts)
- `0079_phase1_polish` : doctor onboarding + benchmark snapshots (1 table + 2 ALTER cols)

### Features patient livrées (30 + 16 = 46 total)

#### RGPD / Sécurité (6)
- A1 Account deletion (30 jours grace) + audit
- A2 Data export RGPD (ZIP avec profil/RDV/ordos/messages)
- A3 Reset password flow (token sécurisé)
- A4 2FA TOTP avec QR + backup codes
- A5 Cookie consent banner + privacy preferences
- A6 Sessions / login history + revoke endpoints

#### UX manquante (8)
- B7 Notifications inbox `/mes-notifications`
- B8 Préférences notifications granular
- B9 Médecins favoris (heart sur fiche)
- B10 Photo profil patient (R2 storage)
- B11 Dépendants / famille CRUD
- B12 RDV cancel-with-reason + reschedule
- B13 Export ICS calendar
- B14 Carte CNAM/mutuelle upload

#### Différenciateurs vs Dabadoc (7)
- C15 Avis multi-critères (5 ratings + display public)
- C16 Comparateur médecins (jusqu'à 3 côte-à-côte)
- C17 Estimation prix CNAM/mutuelle
- C18 Wizard symptômes → spécialité
- C19 Salle d'attente virtuelle (test cam/mic/réseau)
- C20 Programme parrainage patient
- C21 PWA enhanced (manifest shortcuts + service worker)

#### Nice-to-have (9)
- D22 Carnet vaccinations self-declared
- D23 Médicaments en cours
- D24 Allergies (color-coded severity)
- D25 Analyses biologiques (upload R2)
- D26 Médecins similaires sur fiche
- D27 Onboarding modal première visite
- D28 Bouton flottant WhatsApp support
- D29 Mode hors-ligne enhanced (SW + offline banner)
- D30 Doctor online status indicator

#### Phase 1A — Marketing (4)
- #7 SEO programmatique 720 pages (24 villes × 30 spé)
- #8 Newsletter hebdo + admin editor + cron
- #10 Carnet santé enfant (calendrier vaccinal Tunisie 0-2 ans)
- #11 Suivi grossesse (5 semaines clés : 4, 12, 20, 32, 40)

#### Phase 1A — Rétention (4)
- #12 Rappels traitements chroniques (3 maladies seed + cron SMS)
- #13 Affiliation médecin → médecin (5% commission + admin validation)
- #18 Politique de rétention configurable + cron purge
- #19 Anonymisation opt-in pour recherche médicale

#### Phase 1A — Tech & API (4)
- #22 Sentry SaaS integration (gracefully disabled if no DSN)
- #23 Lighthouse optimisations homepage
- #27 API publique read-only avec API key + rate limiting
- #29 Nomenclature CNAM Tunisia 30 acts + page tarifs publique

#### Phase 1A — Polish (4)
- #31 Stats médecin avec benchmarks anonymisés (rank within specialty+city)
- #32 Dashboard admin live KPIs (polling SWR 10s)
- #33 Dark mode patient audit (corrections systématiques)
- #34 Tour produit médecin (driver.js, 5 étapes)

### Métriques session

- **Commits totaux** : ~120+
- **Migrations DB** : 13 (0067-0079)
- **Tables nouvelles** : 35+
- **Tests vitest** : 119/119 passing
- **Build prod** : Vert
- **0 régression** sur les 65+ pages existantes
- **Tags release** : 9
- **Worktrees parallèles** : 5 (foundation + 4 streams × 2 phases)

### Reste à faire — Phase 2

Voir [phase-2-spec.md](./phase-2-spec.md) pour les 5 items dépendant de credentials/comptes externes.

### Reste à faire — Décisions business

Voir items #1, #3, #4, #5, #6, #14-17, #26, #28 dans le plan global — partenariats, certifications, équipe commerciale.
