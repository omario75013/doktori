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

## R2 — Cloudflare storage (blocks G3 questionnaire file uploads)

Check `.env` on prod first — keys may already exist:

```sh
ssh root@157.90.152.204 'grep -E "^R2_" /opt/doktori/.env | cut -d= -f1'
```

If missing, create item **`Doktori Prod - Cloudflare R2`**:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME` — recommended `doktori-uploads`
- `R2_PUBLIC_URL` — custom domain like `https://uploads.doktori.tn`

**Unblocks:** file-kind answers on pre-appointment questionnaires (uploading analyses, imaging, ordonnances).

**Priority:** high — the feature is coded but blocks silently without these.

## Mobile release (blocks App Store / Google Play submission)

Required to run `eas build` and `eas submit`. See `docs/ops/mobile-release.md` for the full runbook.

- **`Doktori Mobile - Apple Developer Team ID`** — the 10-char team id from developer.apple.com
- **`Doktori Mobile - Apple App Store Connect API Key`** — `.p8` file + key id + issuer id
- **`Doktori Mobile - Google Play Service Account JSON`** — json key with `Release manager` permission on the `tn.doktori.app` app
- **`Doktori Mobile - Expo Access Token`** — personal access token from expo.dev, scoped to the `doktori` project

**Priority:** low until the mobile app is feature-complete and ready for store review.
