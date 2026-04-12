# 1Password — Missing items blocking Doktori features

Track credentials that are referenced in code but not yet stored in the `Dartank-Infra` vault. Add these via the 1Password admin and redeploy the impacted service.

## G8 — WhatsApp Cloud API (blocks patient WhatsApp reminders)

Create item **`Doktori Prod - WhatsApp Cloud API`** with fields:

- `WHATSAPP_PHONE_NUMBER_ID` — from Meta Business → WhatsApp → API setup
- `WHATSAPP_ACCESS_TOKEN` — permanent system-user token (not the 24h test token)
- `WHATSAPP_VERIFY_TOKEN` — arbitrary string we choose, also configured in Meta webhook settings

**Unblocks:** WhatsApp appointment reminder channel, post-visit review prompts, SOS patient-side ack.

**Priority:** medium — SMS still works as fallback.

**Owner:** ops@doktori.tn must create the Meta business account and approve templates first.

## ~~R2 — Cloudflare storage~~ RESOLVED (2026-04-12)

Using shared Dartank R2 bucket (`dartank-images`) with `doktori/` key prefix.
R2 env vars added to prod `.env`. Upload endpoint live at `/api/appointments/[id]/answers/[questionId]/upload`.

## Resend — Email delivery (blocks email notifications)

Create item **`Doktori Prod - Resend`** with fields:

- `RESEND_API_KEY` — from resend.com dashboard
- `EMAIL_FROM` — `Doktori <noreply@doktori.tn>` (requires domain verification in Resend)

**Unblocks:** Booking confirmation emails, reminder emails (J-1 + J-3), review request emails, doctor notification emails, welcome emails. All coded and deployed — currently falling back to console logging.

**Priority:** high — the entire email system is wired but silent without this key.

**Owner:** Create a Resend account at resend.com, verify the `doktori.tn` domain, create an API key.

## Mobile release (blocks App Store / Google Play submission)

Required to run `eas build` and `eas submit`. See `docs/ops/mobile-release.md` for the full runbook.

- **`Doktori Mobile - Apple Developer Team ID`** — the 10-char team id from developer.apple.com
- **`Doktori Mobile - Apple App Store Connect API Key`** — `.p8` file + key id + issuer id
- **`Doktori Mobile - Google Play Service Account JSON`** — json key with `Release manager` permission on the `tn.doktori.app` app
- **`Doktori Mobile - Expo Access Token`** — personal access token from expo.dev, scoped to the `doktori` project

**Priority:** low until the mobile app is feature-complete and ready for store review.
