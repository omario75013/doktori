# Feature 12 — Rappels de traitements chroniques (3 maladies + cron SMS)

## Description

Système de rappels automatiques pour les traitements de fond (maladies chroniques) : diabète type 2, hypertension, asthme. Le patient configure ses traitements (médicament, dosage, fréquence en heures) et reçoit des notifications SMS / email / push à intervalles réguliers. Pause possible jusqu'à une date future (vacances, hospitalisation).

3 maladies seedées au lancement, extensible via la table `chronic_disease_content`.

## User-facing UI

- Page patient : `/dossier-medical/rappels` (`apps/web/app/(patient)/dossier-medical/rappels/page.tsx`)
  - CRUD des rappels (médicament, dosage, fréquence, canal de notification)
  - Toggle "Pause 7 jours" (sets `paused_until = now() + 7d`)
  - Sélection de maladie depuis la liste seedée (Diabète T2, Hypertension, Asthme).

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/me/chronic-reminders` | liste des rappels du patient |
| POST | `/api/me/chronic-reminders` | crée un rappel |
| PATCH | `/api/me/chronic-reminders/[id]` | modifie (incl. pause) |
| DELETE | `/api/me/chronic-reminders/[id]` | supprime |
| POST | `/api/cron/chronic-reminders/dispatch` | cron Bearer `CRON_SECRET` (toutes les 5 min) — envoie les rappels dont `next_reminder_at <= now()` ET `active = true` ET (`paused_until IS NULL OR paused_until < now()`) |

## DB tables

Migration `0077_phase1_retention.sql` :

**`chronic_disease_content`** (référentiel)
- `slug varchar(60) PRIMARY KEY` (`diabete-t2`, `hypertension`, `asthme`)
- `name_fr / name_ar varchar(120)`
- `description_fr / description_ar text`
- `reminder_default_freq_hours integer DEFAULT 24`
- `display_order integer`

**`chronic_treatment_reminders`**
- `id uuid pk`
- `patient_id uuid FK → patients ON DELETE CASCADE`
- `disease_slug varchar(60) FK → chronic_disease_content ON DELETE SET NULL`
- `medication_name varchar(160)`
- `dosage varchar(80)`
- `frequency_hours integer DEFAULT 24`
- `next_reminder_at timestamptz`
- `notification_channel varchar(10)` (`sms` | `email` | `push`)
- `active boolean DEFAULT true`
- `paused_until timestamptz`
- `last_sent_at timestamptz`
- Index partiel `chronic_reminders_due_idx ON (next_reminder_at) WHERE active = true AND paused_until IS NULL`.

3 maladies seedées dans le bas de la migration (FR + AR).

## Configuration

- Cron : `POST /api/cron/chronic-reminders/dispatch` toutes les 5 min avec `Authorization: Bearer ${CRON_SECRET}`.
- Vars d'env : `CRON_SECRET`, fournisseur SMS (Ooredoo Pro / autre), fournisseur email (Resend), keys push.
- Pour ajouter une maladie : `INSERT INTO chronic_disease_content (...) ON CONFLICT (slug) DO NOTHING;`.

## Troubleshooting

- "Patient ne reçoit pas ses SMS" : vérifier que `chronic_treatment_reminders.active = true`, `paused_until IS NULL OR paused_until < now()`, et `next_reminder_at <= now()`. Vérifier les logs SMS provider.
- "Cron envoie en boucle le même rappel" : après envoi, l'endpoint doit faire `UPDATE next_reminder_at = now() + frequency_hours * INTERVAL '1 hour', last_sent_at = now()`. Bug si pas mis à jour.
- "Spam de rappels" : un patient impatient peut créer 50 rappels — limiter côté UI à un nombre raisonnable, ou ajouter un rate limit côté API.

## Source commit(s)

- `00ecb6c` — migration 0077 phase1_retention (tables + seed 3 maladies).
- `3465ed2` — endpoints `/api/me/chronic-reminders` + page `/dossier-medical/rappels` + cron dispatch.
- `2edefe1` — fix Stream D : Select onValueChange handle null.
