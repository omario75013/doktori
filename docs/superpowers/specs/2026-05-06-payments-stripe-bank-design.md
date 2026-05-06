# Doktori Phase 2 #2 — Système de paiement (Stripe + virement + back office)

**Date** : 2026-05-06
**Status** : Spec drafted, awaiting plan
**Phase** : Phase 2 #2 — Paiement
**Effort estimate** : V1 backbone ~2j (Stripe + virement + back office config). V2 patient checkout UI ~1.5j. V3 Konnect + Paymee polish ~1j.

## Goal

Étendre le système de paiement existant Doktori (qui a déjà Flouci + Paymee partiellement wirés pour la Tunisie) avec :
1. **Stripe** comme provider international (cartes mondiales)
2. **Virement bancaire** (validation manuelle admin)
3. **Configuration back office** : par-médecin, choix des méthodes acceptées + IBAN
4. **Configuration plateforme** : commission Doktori, fees, providers actifs

V1 utilise le **compte Stripe partagé d'Ecommerce** (1P : `Ecommerce Prod - STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY`). Account dédié Doktori sera créé en V2 si besoin de cloisonnement comptable.

## Non-goals (V1)

- Konnect (Tunisie local) — déféré, pas de compte créé
- Cash on premises auto-tracking — manuel par médecin via dashboard, pas de flow nouveau
- Refund flow automatisé — pour V1, refund se fait via Stripe dashboard manuellement (les hooks d'événement `charge.refunded` mettent à jour la DB)
- Patient-side checkout UI — déféré V2 (le backbone supporte les 3 providers, l'UI vient après)
- Stripe Connect (split payments avec sub-accounts par médecin) — V3+ ; pour V1 toutes les cartes vont sur le compte Stripe Doktori central, et le wallet médecin tracke les balances dues
- Crypto, Apple/Google Pay, BNPL — hors scope
- Récurrence automatique des subscriptions médecin sur Stripe — V1 reste sur Flouci pour subscriptions, Stripe est *uniquement* pour les paiements ponctuels (téléconsultation, RDV)

## Architecture

### Existant à étendre

| Composant | État | Action |
|---|---|---|
| `apps/web/lib/flouci.ts` | Wired pour appointments + subscriptions | **Garder tel quel** |
| `apps/web/lib/paymee.ts` | Helper dispo, pas wiré activement | **Garder tel quel**, peut être branché V3 |
| `apps/web/app/api/payments/appointment/route.ts` | POST → crée payment Flouci | **Refactor** : prend `provider` en arg, route vers le bon helper |
| `apps/web/app/api/payments/webhook/route.ts` | Handler Flouci uniquement | **Étendre** : router par signature/provider header. Add Stripe webhook validation. |
| `appointments.payment_*` colonnes | `payment_status`, `payment_amount`, `payment_ref`, `payment_provider` | **Garder**, ajouter `payment_method` (varchar, e.g. `stripe_card` / `bank_transfer` / `flouci` / `cash`) |
| `walletTransactions` | Track balance médecin | **Garder**, on continue de créer une row à chaque paiement reçu |
| `platformSettings` | Settings clé/valeur | **Étendre** avec `payment.stripe.*` keys |

### Nouveaux composants

#### Lib

- **`apps/web/lib/stripe.ts`** — wrapper Stripe SDK
  - `createCheckoutSession({appointmentId, amount, customerEmail, successUrl, cancelUrl})`
  - `verifyWebhookSignature(rawBody, signature)` — vérifie via `STRIPE_WEBHOOK_SECRET`
  - `refundPayment(chargeId)` — pour use admin manuel

- **`apps/web/lib/bank-transfer.ts`** — pas de provider externe, gestion manuelle
  - `createBankTransferIntent({appointmentId, amount, doctorIban, doctorName})` — génère un payment ref unique, retourne IBAN + amount + ref pour affichage patient
  - `confirmBankTransfer(intentId, adminId)` — appelé depuis admin UI, marque payé + crée wallet transaction

#### DB schema (additions)

Ajout à `packages/db/src/schema.ts` :

```ts
// Per-doctor payment method configuration
export const doctorPaymentMethods = pgTable(
  "doctor_payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
    method: varchar("method", { length: 30 }).notNull(),  // 'stripe_card' | 'bank_transfer' | 'cash_on_premises' | 'flouci' | 'paymee'
    enabled: boolean("enabled").notNull().default(false),
    config: jsonb("config").default({}),  // {iban, bic, bankName} for bank_transfer; nothing for stripe_card; etc.
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("doctor_payment_methods_doctor_method_uidx").on(t.doctorId, t.method),
  ]
);

// Bank transfer payment intents (manual verification flow)
export const bankTransferIntents = pgTable(
  "bank_transfer_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),  // in millimes (TND)
    reference: varchar("reference", { length: 40 }).notNull().unique(),  // displayed to patient as "objet du virement"
    status: varchar("status", { length: 20 }).notNull().default("pending"),  // pending | confirmed | rejected | expired
    proofFileUrl: text("proof_file_url"),  // patient-uploaded screenshot/PDF (R2)
    confirmedByAdminId: uuid("confirmed_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),  // typically 7d from creation
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("bank_transfer_intents_status_idx").on(t.status),
    index("bank_transfer_intents_appointment_idx").on(t.appointmentId),
  ]
);

// Stripe events log (idempotency + audit)
export const stripeEventsLog = pgTable(
  "stripe_events_log",
  {
    eventId: varchar("event_id", { length: 100 }).primaryKey(),  // evt_xxx, prevents replay
    eventType: varchar("event_type", { length: 50 }).notNull(),  // payment_intent.succeeded etc.
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
  }
);
```

`appointments` table : ajout colonne `payment_method varchar(30)` via migration SQL séparée. Documents le method utilisé (différent du provider) — `stripe` est un provider, mais la `method` peut être `stripe_card` ou `stripe_bank_debit` etc.

#### API routes

- **`POST /api/payments/checkout`** (nouveau, remplace `/payments/appointment` à terme)
  - Body : `{appointmentId, method: 'stripe_card' | 'bank_transfer' | 'flouci' | 'paymee' | 'cash_on_premises'}`
  - Auth : patient
  - Flow :
    - Charge l'appointment + doctor
    - Vérifier que `method` est dans `doctor_payment_methods` enabled pour ce doctor
    - Si `cash_on_premises` : marquer appointment `payment_status=pending_cash`, retourner OK
    - Si `stripe_card` : créer Stripe Checkout Session, retourner URL
    - Si `bank_transfer` : créer `bankTransferIntent`, retourner ref + IBAN + amount + expiresAt
    - Si `flouci` / `paymee` : flow existant
  - Return `{provider, redirectUrl?, bankTransferDetails?, expiresAt?}`

- **`POST /api/payments/stripe/webhook`** (nouveau)
  - Header `Stripe-Signature` validé
  - Idempotency via `stripe_events_log`
  - Sur `checkout.session.completed` ou `payment_intent.succeeded` → `markAppointmentPaid` + `walletTransactions` insert
  - Sur `charge.refunded` → `markAppointmentRefunded`
  - Return 200 toujours (sauf signature invalide → 400)

- **`POST /api/payments/bank-transfer/upload-proof`** (nouveau)
  - Auth : patient propriétaire de l'intent
  - Body : `{intentId, file}` (multipart, R2 upload)
  - Marque `proof_file_url` sur l'intent

- **`POST /api/admin/payments/bank-transfer/:id/confirm`** (nouveau)
  - Auth : admin
  - Body : `{action: 'confirm' | 'reject', reason?}`
  - Si confirm : `markAppointmentPaid` + `walletTransactions` + intent status = confirmed
  - Si reject : intent status = rejected, optionnel notify patient

- **`GET /api/admin/payments/bank-transfer`** (nouveau)
  - Liste les intents `pending` pour validation par admin

- **`POST /api/medecin/payment-methods`** (nouveau)
  - Auth : doctor
  - Body : `{method, enabled, config}`
  - Upserte sa config (RGPD-safe : IBAN stocké chiffré ? V1 plain ; V2 chiffré if needed)

- **`GET /api/medecin/payment-methods`** — liste de ses méthodes config

#### Back office UI

1. **`/clinique/parametres/paiement`** ou **`/(medecin)/parametres/paiement`** (page)
   - Toggle par méthode : Stripe Card, Virement, Cash on premises, Flouci, Paymee
   - Form bank transfer : IBAN, BIC, nom banque
   - Sauvegarde via `POST /api/medecin/payment-methods`

2. **`/(admin)/admin/finance/bank-transfers`** (page)
   - Tableau des intents pending
   - Actions : Confirmer / Rejeter
   - Voir le proof file uploadé

3. **`/(admin)/admin/parametres/paiement`** (page existante extended)
   - Section Stripe : on/off, public key, webhook secret status (lit `platformSettings`)
   - Lecture seule des Flouci/Paymee config existante
   - Commission % Doktori (déjà dans existant ?)

#### Patient-facing UI (DEFERRED V2)

Pas implémenté V1. Le backbone API supporte tous les flows, mais le UI patient (sélecteur de méthode au booking, page upload proof, etc) sera designé après UX iteration.

### Settings platform (à ajouter dans `platformSettings`)

| Key | Type | Default | Description |
|---|---|---|---|
| `payment.stripe.enabled` | bool | false | Master switch Stripe |
| `payment.stripe.commission_percent` | int | 10 | Commission Doktori (%) |
| `payment.bank_transfer.enabled` | bool | false | Master switch virement |
| `payment.bank_transfer.expiry_days` | int | 7 | Jours avant expiration intent |
| `payment.cash_on_premises.enabled` | bool | true | Master switch cash |

Stripe API keys eux-mêmes restent dans `.env` (via 1P), pas dans `platformSettings`. Mais le on/off platformSettings agit comme killswitch sans redéploiement.

## Sécurité

| Risque | Mitigation |
|---|---|
| Webhook Stripe spoofé | `stripe.webhooks.constructEvent(rawBody, sig, secret)` — refuse si signature invalide |
| Replay webhook | `stripe_events_log` PK = event_id, INSERT ON CONFLICT DO NOTHING |
| IDOR sur bank transfer intent | Auth + ownership check (patientId match auth user) |
| Patient upload malicious file | Type allowlist (PDF/JPG/PNG), size cap 5MB, scan via R2 trigger (V2) |
| Admin confirm sans proof | Admin UI affiche obligatoirement proof avant le bouton confirm |
| Race : double-confirmer un intent | UNIQUE constraint sur `(intent_id, status='confirmed')` via partial index OR optimistic lock via `updated_at` check |
| Stripe key leak | Stocké uniquement en 1P, jamais committé. Webhook secret aussi en 1P |

## Tests V1 backbone

Unit (vitest):
- `lib/stripe.ts` : `createCheckoutSession` retourne URL + sessionId
- `lib/stripe.ts` : `verifyWebhookSignature` accepte signature valide / refuse invalide
- `lib/bank-transfer.ts` : `createBankTransferIntent` génère ref unique + expiresAt + retourne config IBAN du doctor

Integration (manuelle après deploy + flag flip):
- Patient flow Stripe (webhook + appointment marked paid)
- Patient flow virement (intent + upload + admin confirm + appointment paid)
- Doctor configure ses méthodes via `/parametres/paiement`
- Admin valide un virement via `/admin/finance/bank-transfers`

## Feature flags

- `payment_stripe_enabled` (DB) — controls Stripe checkout availability for patients
- `payment_bank_transfer_enabled` (DB)
- Both default `false`. Activation manuelle après tests.

## Verification criteria

- [ ] DB schema : `doctor_payment_methods`, `bank_transfer_intents`, `stripe_events_log` créées
- [ ] Migration `appointments.payment_method` ajoutée
- [ ] `lib/stripe.ts`, `lib/bank-transfer.ts` créés + tests
- [ ] API routes : checkout, webhook, upload-proof, admin confirm, doctor payment-methods CRUD
- [ ] Page doctor settings : `/parametres/paiement` ou similaire
- [ ] Page admin : `/admin/finance/bank-transfers`
- [ ] Page admin : extension de `/admin/parametres/paiement` avec Stripe section
- [ ] Tests unit passent
- [ ] Snyk clean
- [ ] Feature flags `payment_stripe_enabled` + `payment_bank_transfer_enabled` créés OFF
- [ ] Stripe webhook configuré (toi côté Stripe dashboard) pointant sur `https://doktori.tn/api/payments/stripe/webhook`

## Out of scope V2+

- Patient checkout UI complete (sélecteur méthode au booking, upload proof, status page)
- Konnect (Tunisie local) intégration
- Stripe Connect (split per-doctor sub-accounts)
- Apple Pay / Google Pay
- 3D Secure 2 customizations (Stripe Checkout les gère par défaut)
- Subscription cycles via Stripe (Flouci continue pour subscriptions médecin)
- Refund automatisé via UI patient (V1 = admin uniquement)
- Multi-currency (V1 = TND uniquement)
- Compta export (Doktori → expert-comptable)

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Stripe Connect manquant → tous les paiements arrivent dans le compte Doktori, pas du médecin | V1 acceptable : wallet tracking + payouts batch mensuels manuels par admin via Stripe dashboard |
| Bank transfer fraude (patient claim avoir payé sans avoir payé) | Admin doit voir proof + vérifier le RIB sur extrait bancaire AVANT confirm |
| Patient upload de PDF malveillant | Type allowlist + size cap V1, scan async V2 |
| Stripe webhook non livré (réseau) | Stripe retry automatique 30 jours ; idempotency garantie via stripe_events_log |
| Devise mismatch (Stripe en EUR/USD, Doktori en TND) | Stripe Checkout en TND uniquement V1. Si Stripe TND non supporté, créer un sub-compte avec présentement EUR + display TND price ; investiguer Stripe Tunisia support level |
| Commission incorrecte | Configurable via `platformSettings` ; tests unitaires pour calc |
