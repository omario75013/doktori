# Doktori Phase 2 #9 — Coach IA santé conversationnel (Kimi)

**Date** : 2026-05-06
**Status** : Spec drafted, awaiting plan and legal review before activation
**Author** : Omar (brainstorm with Claude)
**Phase** : Phase 2 — Coach IA
**Effort estimate** : 5–7h V1 (chat MVP, feature-flagged OFF)
**Critical caveat** : The feature ships behind a feature flag set to **OFF** by default. **Activation in production REQUIRES** a legal review of the disclaimer + DPIA RGPD documentation by Omar (or counsel) — not me, not autonomously.

## Goal

Provide patients an early-orientation chat interface ("Coach IA") that answers symptom-related questions in a non-diagnostic, non-prescriptive way and steers them toward appropriate medical specialties they can book on Doktori. Reduce the friction of "I have symptom X — which kind of doctor do I need?" without crossing the line into actual medical advice.

**This is not a doctor.** The system is conceived as a triage assistant — not a clinical reasoning agent.

## Non-goals

- **No diagnosis.** The model must never say "you have X disease" — only "your symptoms could relate to a few areas: A, B, C, here's where you can book each".
- **No prescription / dosage advice.** Even for OTC drugs.
- **No emergency triage.** The system explicitly redirects to 190 / 198 (SAMU Tunisia) on red flags (chest pain, breathing difficulty, suicidal ideation, etc.).
- **No image / file upload** in V1. Text only.
- **No memory across sessions** in V1 (each chat is fresh — avoids cumulative legal exposure and privacy data retention questions).
- **No mobile app integration.** V1 is web only at `/coach-ia`.
- **No Arabic-language tuning** in V1, even though Kimi handles Arabic. French only — matches the rest of Doktori UI. AR support is a follow-up once disclaimer is legally validated in both languages.

## Architecture

### Stack
- **Model**: `moonshotai/kimi-k2-0905` via OpenRouter (already in `/opt/doktori/.env` as `OPENROUTER_API_KEY` + `OPENROUTER_MODEL`).
- **Pricing**: $0.40/M input, $2.00/M output. Estimated **$10-30/month** at 1k active patients × 5 messages/day average × ~500 tokens each. Budget cap (see "Cost guards" below).
- **Frontend**: `apps/web/app/(patient)/coach-ia/page.tsx` (server component) + `coach-ia-client.tsx` (chat UI client component).
- **Backend**: `apps/web/app/api/coach-ia/route.ts` POST handler, calls OpenRouter, streams response.
- **Auth**: patient must be logged in (uses existing `getPatientFromRequest` from `@/lib/require-auth`).
- **Feature gate**: `isEnabled("coach_ia_enabled")` (DB feature flag, off by default).

### Data flow

```
Patient → /coach-ia page → POST /api/coach-ia { messages }
                                       ↓
                          requireAuth (patient role)
                                       ↓
                          isEnabled("coach_ia_enabled") → 403 if off
                                       ↓
                          rate limit check (Redis)
                                       ↓
                          system prompt + user msgs → OpenRouter
                                       ↓
                          stream completion back
                                       ↓
                          on close: log usage to db
```

### System prompt (V1 draft — to be reviewed)

```
Tu es un assistant d'orientation médicale pour Doktori (plateforme tunisienne
de prise de rendez-vous médicaux). Tu n'es PAS un médecin et tu ne fais PAS de
diagnostic. Ton rôle est uniquement d'aider le patient à identifier vers quelle
SPÉCIALITÉ il peut s'orienter pour consulter un professionnel de santé.

RÈGLES STRICTES — non négociables :

1. Ne jamais poser de diagnostic. Si tu reconnais un pattern de symptômes,
   formule toujours en termes d'orientation : "Ces symptômes peuvent relever
   de la spécialité X — un médecin de cette spécialité pourra évaluer".

2. Ne jamais conseiller de médicament, de dosage, ni d'arrêt de traitement.
   Si la question porte là-dessus, répondre : "Pour toute question médicament,
   consultez un pharmacien ou votre médecin."

3. Si le patient mentionne :
   - Une douleur thoracique aiguë
   - Des difficultés respiratoires
   - Des pensées suicidaires ou idées noires
   - Une perte de connaissance ou état confusionnel
   - Une hémorragie importante
   - Tout traumatisme grave
   ⇒ Réponds IMMÉDIATEMENT en redirigeant vers les urgences :
   "Ces symptômes peuvent indiquer une urgence médicale. Appelez le SAMU
   au 190 ou les pompiers au 198 immédiatement, ou rendez-vous au service
   d'urgence le plus proche. Ne pas attendre."

4. Si une question dépasse l'orientation symptôme → spécialité (par exemple
   demande d'avis sur résultat d'examen, demande de seconde opinion,
   demande d'interprétation d'imagerie), réponds : "Cette question
   nécessite l'avis direct d'un médecin. Vous pouvez prendre rendez-vous
   sur Doktori avec un [spécialité]."

5. Toujours conclure ta réponse par une suggestion concrète :
   - Si la spécialité est claire : "Vous pouvez consulter un [SPÉCIALITÉ]
     sur Doktori."
   - Si plusieurs sont possibles : les lister, en commençant par celle
     qui couvre le plus large (généraliste si en doute).

6. Réponds toujours en français, sauf si le patient écrit en arabe — dans
   ce cas reste en français mais sois attentif à la langue du patient.

7. Réponds de manière brève et claire. Pas de paragraphes longs.

Liste des spécialités disponibles sur Doktori (utilise EXACTEMENT ces noms) :
{LIST_OF_SPECIALTIES_FROM_packages/shared/src/constants.ts}
```

### Endpoint

`POST /api/coach-ia`

Request:
```json
{
  "messages": [
    { "role": "user", "content": "..." }
  ]
}
```

Response (server-sent stream of OpenRouter chunks, OpenAI-compatible format).

Response on errors:
- 401 if not authenticated as patient
- 403 if `coach_ia_enabled` flag is off
- 429 if rate-limited
- 500 on upstream error (with fallback message in chat)

### Rate limiting

- **Per patient**: 10 messages / 24h, enforced via Redis key `coach_ia:rate:{patientId}` with 24h TTL.
- **Global cap**: 1000 messages / 24h across all patients (cost guard), key `coach_ia:rate:global`. If hit, return 429 to all callers with message "Service temporarily unavailable due to load — try again later."
- Token cap per message: max 500 input tokens (truncate user input above) + max 800 output tokens (`max_tokens: 800` to OpenRouter).

### Cost guards

- `OPENROUTER_MAX_DAILY_COST_USD=5` env var. Each response logs estimated cost (`tokens_in * 0.0000004 + tokens_out * 0.000002`) to a daily counter in Redis. If counter exceeds cap, return 429.
- Hard alarm if daily cost > $10: log error to console (eventually wire to Monitor webhook in a Phase 2.5).

### Logging — what we DO log

To `coach_ia_usage` table (new):
| Column | Why |
|---|---|
| `id` | PK |
| `patient_id` (nullable, FK) | rate limit key + tracks per-patient usage |
| `created_at` | retention check |
| `tokens_in` | cost tracking |
| `tokens_out` | cost tracking |
| `cost_usd` | aggregate cost reports |
| `latency_ms` | perf tracking |
| `error` (text, nullable) | failure mode tracking |

### Logging — what we DO NOT log

- The actual user message content (privacy / minimisation under RGPD).
- The actual model response.
- Conversation IDs that link multiple messages (each is independent).

This is the deliberate choice for V1: zero PII content beyond patient_id (which we already have in the database). Reduces DPIA scope significantly.

## DPIA — Data Protection Impact Assessment (RGPD V1 draft)

**Status**: V1 draft — Omar must validate before activating the flag.

### Purpose of processing
Provide medical orientation guidance to patients via AI chat to direct them to appropriate specialists.

### Categories of personal data
- Patient ID (linked to Doktori account)
- IP address (transient — not stored, used only for rate limit secondary key)
- Timestamps of usage
- Aggregate token counts (no content)

**NOT processed**: chat content, conversation history, user identifiers shared with the model provider beyond patient_id (and even patient_id is NOT sent to OpenRouter — only the message content).

### Data subjects
Authenticated patients of Doktori.

### Recipients
- OpenRouter (and downstream Moonshot AI / Kimi K2 servers) — receives only the chat content, no patient identifiers.
- No third-party processor receives PII linked to chat content.

### Retention
- `coach_ia_usage` rows: 12 months (for cost reports + abuse pattern detection), then deleted by daily cron job (V2).
- No chat content retention (because we don't log it).

### Lawful basis
- **Article 6(1)(a)**: explicit consent at session start (the disclaimer banner has a "I understand and accept" button before chat is enabled).
- This is a **special category data** processing scenario (health data, Article 9). Lawful basis under Art 9(2)(a) — explicit consent — is required, in addition to general Art 6 basis.

### Patient rights enabled
- Right to access: patients can see their `coach_ia_usage` count (just count, no content) on their profile page.
- Right to erasure: patients can request deletion via existing Doktori GDPR data-export / deletion flow. `coach_ia_usage` rows linked to their patient_id will be removed.
- Right to object: opt-out is automatic (don't use the feature).

### Risks identified
1. **Model hallucinates a diagnosis despite the prompt** → Patient acts on false information.
   - **Mitigation**: strong system prompt + disclaimer + UI banner on every response: "Ceci n'est pas un diagnostic. Consultez un médecin."
   - **Residual risk**: medium. Continuous monitoring needed.

2. **Patient bypasses urgent-care redirect** → Worsening medical state.
   - **Mitigation**: strong system prompt with explicit red-flag list. UI shows the SAMU/198 number permanently in the chat header.
   - **Residual risk**: high. The model is the last line of defense for some patients. Worth fast-fail rather than smart-handling for any sign of red-flag symptoms.

3. **Chat content leaked to OpenRouter / Moonshot AI** → Privacy breach.
   - **Mitigation**: TLS in transit, OpenRouter ToS reviewed, no patient identifier sent.
   - **Residual risk**: low. We trust the carrier.

4. **Rate-limit bypass / abuse** → Cost spike.
   - **Mitigation**: per-patient + global rate limits + daily cost cap.
   - **Residual risk**: low.

### Required actions before activation (Omar)
- [ ] Validate the system prompt with a trusted physician (15 min review)
- [ ] Validate the disclaimer wording with legal counsel or local equivalent
- [ ] Confirm Tunisian regulation on AI medical assistants (loi 2018-43 sur la protection des données + any specific health-AI clause). State of art 2026: no Tunisia-specific AI medical regulation, defer to RGPD-equivalent + general medical practice rules.
- [ ] Activate the feature flag manually after the above are green

## UI — `/coach-ia` page

### Mandatory disclaimer banner (V1 wording, to be legally reviewed)

Shown as a **modal** the patient must explicitly accept before the chat is unlocked. The acceptance is logged (in `coach_ia_usage` as a separate event row, type=`disclaimer_accepted`).

```
⚠️ Coach IA — assistant d'orientation médicale

Avant de continuer, lisez attentivement :

• Cet assistant N'EST PAS un médecin et ne pose AUCUN diagnostic.
• Il vous aide uniquement à identifier la spécialité médicale appropriée
  pour vos symptômes — et à prendre rendez-vous sur Doktori.
• Il NE PRESCRIT PAS de médicaments. Consultez un pharmacien ou votre
  médecin pour toute question de traitement.
• En cas d'urgence (douleur thoracique, difficultés respiratoires,
  saignement, pensées suicidaires, perte de connaissance, traumatisme),
  appelez le SAMU au 190 ou les pompiers au 198 — ne pas utiliser ce chat.
• Vos messages NE sont PAS conservés. Chaque session est indépendante.
• Limite : 10 messages par 24h.

[ Je comprends et j'accepte ] [ Annuler ]
```

### Chat UI

- Header bar with permanent **SAMU 190 / 198 button** (clickable, opens phone dialer on mobile)
- Message history (current session only, lost on reload)
- Text input + Send button
- Loading state (typing indicator)
- Spec footer: "Coach IA — Pas un avis médical — [Lire le disclaimer]"
- Suggested specialty links rendered as buttons after each AI response (parsed from response — if response mentions a known specialty, render a "Prendre RDV avec un [spécialité]" CTA)

## Database migration

New table `coach_ia_usage`:

```sql
CREATE TABLE coach_ia_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,  -- 'message' | 'disclaimer_accepted'
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  latency_ms INT DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX coach_ia_usage_patient_idx ON coach_ia_usage(patient_id);
CREATE INDEX coach_ia_usage_created_idx ON coach_ia_usage(created_at);
```

Drizzle schema added in `packages/db/src/schema.ts`.

## Tests

Unit (vitest):
- System prompt assembly: with N specialties, output contains all of them
- Rate limit logic (Redis-mocked): 10 calls in 24h pass, 11th returns 429
- Cost guard logic: counter increments, returns 429 above cap
- Red-flag detection: spotted phrases trigger emergency redirect (test against the system prompt is a model-level concern; tested only at the code level for the prompt's structural integrity)

Integration (manual after deploy + flag flip):
- Real chat interaction with patient flow
- Verify disclaimer modal blocks unauthorized access
- Stress test rate limit (script 11 messages, expect 11th = 429)
- Verify `coach_ia_usage` rows have NO content
- Cost report from `SELECT SUM(cost_usd) FROM coach_ia_usage WHERE created_at > NOW() - INTERVAL '24 hours'`

## Verification criteria

- [ ] `apps/web/lib/coach-ia.ts` (utility for prompt assembly + OpenRouter call)
- [ ] `apps/web/app/api/coach-ia/route.ts` (POST handler with auth + flag + rate limit)
- [ ] `apps/web/app/(patient)/coach-ia/page.tsx` + `coach-ia-client.tsx`
- [ ] Modal disclaimer component
- [ ] DB migration for `coach_ia_usage` table
- [ ] Drizzle schema entry
- [ ] Feature flag `coach_ia_enabled` exists in DB, set to `false`
- [ ] Unit tests pass
- [ ] E2E manual test post-flip
- [ ] **DPIA & disclaimer signed off by Omar before flag flip**
- [ ] **Physician sign-off on system prompt before flag flip**

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Model gives diagnosis despite prompt | Strong system prompt + disclaimer on every response; flag stays OFF until physician review |
| Patient bypasses red-flag redirect | Permanent SAMU button in UI header; system prompt has hardcoded red-flag list |
| Cost spike from abuse | Per-patient + global rate limits + daily cost cap returns 429 |
| Legal action over wrong "advice" | Disclaimer modal is a contract; flag stays OFF until counsel review |
| OpenRouter outage | Catch and return 503 to client with "Service indisponible — réessayez plus tard" |
| Patient session content stored elsewhere | We don't log content; OpenRouter ToS reviewed for content retention |

## Out of scope (V2+)

- Multi-language (Arabic) full support
- Conversation memory across sessions
- Image / file uploads
- Mobile app integration
- AI-powered specialty matching with structured suggestion (vs free-text response)
- Patient feedback ("was this helpful?")
- Doctor-side review of misclassifications
- Self-hosted model fallback (Kimi K2 weights are open Apache, deployable on Hetzner GPU box if traffic > €500/month API cost)
