# Feature 13 — Affiliation médecin (referral médecin → médecin avec validation admin)

## Description

Programme de parrainage médecin : un médecin déjà inscrit invite un confrère via un code unique (format `DR-XXXXXX`). Quand le filleul s'inscrit avec ce code, une entrée `doctor_referrals` en statut `pending` est créée. L'admin valide manuellement (anti-fraude), puis le parrain touche **5 %** des 3 premiers mois d'abonnement du filleul.

Distinct du programme de parrainage patient (C20).

## User-facing UI

- Page médecin : `/parrainage-medecin` — affiche le code DR-XXXXXX du médecin connecté, formulaire d'invitation par email, liste des filleuls et statuts (pending / validated / rejected).
- Page admin : `/admin/doctor-referrals` — table avec actions Validate / Reject / Set rewards.
- Page inscription médecin : `/inscription` capture `?ref=DR-XXXXXX` depuis l'URL et appelle `/api/medecin/referrals/track` après création du compte.

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/medecin/referral-code` | retourne le code DR-XXXXXX du médecin connecté |
| GET | `/api/medecin/referrals` | liste des filleuls |
| POST | `/api/medecin/referrals` | invite un confrère par email |
| POST | `/api/medecin/referrals/track` | appelée à l'inscription du filleul (avec `?ref=`) |
| GET | `/api/admin/doctor-referrals` | admin : liste tous les referrals |
| PATCH | `/api/admin/doctor-referrals/[id]` | admin : `{action: 'validate'|'reject'|'set_rewards', rewards_earned_tnd?, rejection_reason?}` |

## DB tables

Migration `0077_phase1_retention.sql` :

**`doctor_referrals`**
- `id uuid pk`
- `referrer_doctor_id uuid FK → doctors ON DELETE CASCADE`
- `referred_doctor_id uuid FK → doctors ON DELETE CASCADE`
- `status varchar(20)` CHECK (`pending` | `validated` | `rejected`)
- `commission_pct numeric(4,2) DEFAULT 5.00`
- `rewards_earned_tnd numeric(10,2) DEFAULT 0`
- `validated_at timestamptz`
- `validated_by_admin uuid`
- `rejection_reason text`
- CHECK `referrer_doctor_id <> referred_doctor_id` (`no_self_referral`)
- UNIQUE `(referrer_doctor_id, referred_doctor_id)` (`doctor_referral_unique`)
- Index `doctor_referrals_pending_idx ON (status) WHERE status = 'pending'`.

## Configuration

- `commission_pct` configurable par row (défaut 5.00).
- Pas de feature flag.
- Rôle admin requis : `super_admin` ou `admin` selon `requireAdmin` middleware.

## Troubleshooting

- "Le médecin parrain n'apparaît pas comme filleul" : vérifier que `?ref=DR-XXXXXX` était bien dans l'URL au moment du signup. Le tracking est best-effort — pas d'attribution à postériori.
- "Commission jamais payée" : statut doit être `validated` ET `rewards_earned_tnd` doit être incrémenté manuellement par l'admin (pas de calcul auto pour l'instant — à câbler avec le module billing).
- "23505 unique violation" : un médecin a déjà parrainé celui-là. Pas de re-parrainage possible (la contrainte unique l'interdit).

## Source commit(s)

- `00ecb6c` — migration 0077 (table `doctor_referrals`).
- `dfbe6ec` — endpoints médecin + admin, page `/parrainage-medecin`, page admin `/admin/doctor-referrals`, capture `?ref=` à l'inscription.
