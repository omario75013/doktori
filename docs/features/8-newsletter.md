# Feature 8 — Newsletter (subscribe / confirm / unsubscribe / admin / cron)

## Description

Système newsletter complet avec double opt-in (RGPD), désinscription en un clic, console admin pour rédiger des numéros bilingues FR/AR, et cron d'envoi des numéros planifiés.

Sources de subscription : formulaire homepage, état vide d'une page SEO ville/spécialité, profil patient, ajout manuel admin.

## User-facing UI

- Composant : `apps/web/components/newsletter-signup.tsx` (intégré sur homepage, page SEO ville×spécialité, etc.)
- Page de confirmation : `/newsletter/confirmed`
- Page de désinscription : `/newsletter/unsubscribed`
- Page d'erreur : `/newsletter/error` (token invalide / expiré)
- Admin :
  - `/admin/newsletter` — liste des numéros + composer (titre/contenu FR + AR, scheduled_at)
  - Bouton "Envoyer maintenant" sur chaque numéro non-envoyé.

## API endpoints

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/newsletter/subscribe` | inscription (envoie email confirmation) |
| GET | `/api/newsletter/confirm?token=...` | confirme le double opt-in |
| GET/POST | `/api/newsletter/unsubscribe?token=...` | désinscription via lien |
| GET/POST | `/api/admin/newsletter/issues` | admin : liste / créer un numéro |
| POST | `/api/admin/newsletter/issues/[id]/send-now` | force l'envoi immédiat |
| POST | `/api/cron/newsletter/send-scheduled` | cron Bearer `CRON_SECRET` (envoie tous les `scheduled_at <= now()` non encore `sent_at`) |

Helper d'envoi : `apps/web/lib/newsletter-send.ts`.

## DB tables

Migration `0076_phase1_marketing.sql` :

**`newsletter_subscribers`**
- `id uuid pk`
- `email varchar(255) UNIQUE`
- `patient_id uuid FK → patients(id) ON DELETE SET NULL`
- `language char(2)` (`fr` | `ar`)
- `source varchar(40)` (`home_form` | `seo_empty_city` | `profile` | `manual`)
- `confirmed_at timestamptz` (NULL = en attente double opt-in)
- `unsubscribed_at timestamptz`
- `unsubscribe_token varchar(64) UNIQUE`
- Index partiel sur `email` pour les actifs (confirmed_at IS NOT NULL AND unsubscribed_at IS NULL).

**`newsletter_issues`**
- `id uuid pk`
- `title_fr / title_ar varchar(200)`
- `content_html_fr / content_html_ar text`
- `scheduled_at timestamptz`
- `sent_at timestamptz`
- `recipient_count integer`
- `created_by_admin uuid`

## Configuration

- Cron job : appeler `POST /api/cron/newsletter/send-scheduled` toutes les 15 min avec `Authorization: Bearer ${CRON_SECRET}`.
- Vars d'env : `CRON_SECRET`, `RESEND_API_KEY` (ou autre provider mail), `NEWSLETTER_FROM` (e.g. `newsletter@doktori.tn`).
- Le double opt-in est obligatoire (loi tunisienne 2004-63 + RGPD).

## Troubleshooting

- "Email pas reçu après inscription" : vérifier les logs du provider mail et que `RESEND_API_KEY` est défini ; vérifier aussi que `confirmed_at` est NULL en base (sinon le subscriber est déjà confirmé).
- "Lien de désinscription expiré" : `unsubscribe_token` est généré une fois à la création — il ne devrait pas expirer. Si NULL, regénérer manuellement.
- "Cron envoie 0 mail" : vérifier que des numéros ont `scheduled_at <= now() AND sent_at IS NULL`. Le cron n'envoie que ce qui est planifié, pas les drafts.

## Source commit(s)

- `fb8d94b` — migration 0076 (tables newsletter_subscribers + newsletter_issues).
- `3465ed2` — endpoints `/api/newsletter/subscribe`, `/confirm`, `/unsubscribe` + composant `newsletter-signup.tsx` + pages confirmed / unsubscribed / error.
- `dfbe6ec` — admin `/admin/newsletter`, endpoints `/api/admin/newsletter/issues` (+ send-now) + cron `/api/cron/newsletter/send-scheduled`.
