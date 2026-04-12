# Teleconsultation Mode — Design Spec

**Date:** 2026-04-12
**Status:** Approved

## Business Model

Patient books teleconsult → pays upfront via Flouci → platform holds payment → after consultation completes → platform takes commission (default 15%, configurable via `TELECONSULT_COMMISSION_RATE` env) → remainder credited to doctor's Doktori wallet → doctor requests payout (manual for MVP).

## Schema: `0029_teleconsult_mode.sql`

```sql
ALTER TABLE doctors ADD COLUMN consultation_mode varchar(20) NOT NULL DEFAULT 'cabinet';
ALTER TABLE doctors ADD COLUMN teleconsult_fee integer;
ALTER TABLE appointment_types ADD COLUMN mode varchar(20) NOT NULL DEFAULT 'cabinet';

CREATE TABLE doctor_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  total_commission integer NOT NULL DEFAULT 0,
  total_withdrawn integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL,
  amount integer NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_tx_doctor_idx ON wallet_transactions(doctor_id, created_at DESC);
```

## Scope

### Doctor side
1. `/teleconsultation` settings page — mode selector (cabinet/teleconsult/both) + fee
2. `/dashboard` — teleconsult KPI cards + onboarding prompt
3. `/agenda` — mode-aware calendar (teal=cabinet, purple=teleconsult)
4. `/wallet` — balance, transactions, withdrawal request

### Patient side
5. `/recherche` — "En vidéo" filter toggle + badge on doctor cards
6. `/medecin/[slug]` — teleconsult badge + dual pricing
7. `/rdv/[slug]` — mode selection step in booking flow
8. `/teleconsult/[appointmentId]` — enriched video room (header, timer, controls)

### API routes
9. `PUT /api/doctor/teleconsult-settings` — update mode + fee
10. `GET/POST /api/doctor/wallet` — balance + withdrawal request
11. `POST /api/teleconsult/complete` — auto-credit wallet after consultation
12. Update `/api/appointments` to handle type='teleconsult'

### Payment integration
13. On teleconsult appointment completion → auto-credit doctor wallet (fee minus commission)
14. Wallet transaction audit trail
