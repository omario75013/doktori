# System Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix all 17 critical + high severity issues from the full system review, plus the top important items.

**Architecture:** 6 parallel task groups targeting non-overlapping file sets.

**Tech Stack:** Next.js 16, Drizzle ORM, NextAuth v5, crypto (Node.js built-in)

---

## Task 1: Auth guards — fix all unauthenticated endpoints

**Files to modify:**
- `apps/web/lib/doctor-auth.ts` — add role check
- `apps/web/app/api/sos/session/[id]/route.ts` — require HMAC token
- `apps/web/app/api/sos/request/route.ts` — add rate limiting
- `apps/web/app/api/appointments/route.ts` — add patient phone verification
- `apps/web/app/api/reviews/route.ts` — require patient auth
- `apps/web/app/api/waitlist/route.ts` — require patient auth on DELETE
- `apps/web/app/api/home-visit/request/route.ts` — add rate limiting
- `apps/web/app/api/chat/route.ts` — add rate limiting
- `apps/web/app/api/clinics/stats/route.ts` — require admin auth

## Task 2: OTP + crypto — wire real SMS, replace Math.random

**Files to modify:**
- `apps/web/app/api/auth/otp/request/route.ts` — wire sendSMS, remove console.log, use crypto.randomInt
- `apps/web/app/api/referrals/code/route.ts` — use crypto.randomBytes
- `apps/web/app/api/teleconsult/create/route.ts` — use crypto.randomBytes
- `apps/web/app/api/admin/doctors/route.ts` — use crypto.randomBytes for slug suffix

## Task 3: Payment security — webhook signatures + server-side flow

**Files to modify:**
- `apps/web/app/api/payments/webhook/route.ts` — add signature verification + idempotency
- `apps/web/app/payment/success/page.tsx` — remove client-side webhook call
- `apps/web/app/api/billing/webhook/flouci/route.ts` — add signature verification if exists

## Task 4: Database fixes — indexes, FKs, migration renumbering

**Files to modify:**
- `packages/db/src/schema.ts` — add missing indexes + FK constraints
- `packages/db/migrations/` — rename collision files

## Task 5: Doctor sidebar + active state + responsive

**Files to modify:**
- `apps/web/app/(medecin)/layout.tsx` — add all 12 nav links, active state, hamburger menu
- `apps/web/app/(admin)/layout.tsx` — add active state highlighting

## Task 6: Session hardening + NextAuth config

**Files to modify:**
- `apps/web/lib/auth.ts` — set session maxAge, tighten config
- `apps/web/app/api/auth/otp/verify/route.ts` — reduce JWT expiry
