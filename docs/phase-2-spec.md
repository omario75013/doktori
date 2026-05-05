# Doktori — Phase 2 Spec (à exécuter en session dédiée)

> **Status** : Spec en attente — exécution conditionnée par credentials/comptes externes.

## Items différés de Phase 1A à Phase 2

| # | Item | Bloqueur | Effort estimé |
|---|---|---|---|
| 27b | OAuth2 full pour API publique (write + scopes) | Décision prod ready (V1 read-only suffit pour début) | ~12-20h |
| 23b | Lighthouse 90+ exhaustif (toutes pages) | Audit page par page (50 pages) | ~8-12h |
| 22b | GlitchTip self-host (vs Sentry SaaS) | Install Docker + DNS + cert + ressources serveur | ~4-6h |
| Contenu médical complet | Suivi grossesse 40 sem + 10 maladies chroniques + vaccins 0-18 ans | Validation médecin + 35k mots | Externalisé |
| 32b | SSE realtime dashboard | Polling 10s suffit pour V1 | Pas urgent |

## Items Phase 2 majeurs (5 items)

### Item #1 — App mobile native iOS + Android

**Bloqueur** : Décision stack (React Native / Flutter / native) + équipe dédiée.

**Recommandation** : React Native (Expo) — réutilise une grande partie du code TypeScript existant.

**Scope MVP mobile** :
- Auth patient (token localStorage)
- Recherche médecin
- Booking RDV
- Mes RDV
- Notifications push natives
- SOS Docteur
- Téléconsultation (vidéo)

**Effort** : 6-8 semaines équipe 1-2 dev.

**Préreq** :
- Compte Apple Developer ($99/an)
- Compte Google Play Console ($25 one-time)
- Certificats provisioning + key signing

---

### Item #2 — Téléconsultation paiement intégré

**Bloqueur** : Comptes Stripe + Konnect/Paymee actifs avec API keys.

**Scope** :
- Intégration Konnect (Tunisie) en priorité (cartes locales)
- Stripe en fallback international
- Frais service Doktori (10% par défaut, configurable par médecin)
- Wallet médecin (déjà existe) — payouts mensuels
- Refund flow (cas annulation)

**Tables existantes utilisables** : `subscription_plans`, `wallet_transactions`, `appointment_payments`.

**Effort** : 3-4 jours.

**Préreq** :
- KONNECT_API_KEY, STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY
- Webhook endpoints configurés
- Compte société validé (RNE 1625867B fourni)

---

### Item #20 — CDN Cloudflare devant Doktori.tn

**Bloqueur** : Accès DNS doktori.tn + compte CF.

**Scope** :
- Compte Cloudflare Free tier (suffit pour démarrer)
- DNS CNAME doktori.tn → CF proxy → Hetzner 157.90.152.204
- Cache rules : `_next/static/*` 1 année, API `/api/*` no-cache, autres pages 1 heure
- Page Rules : redirect www → root, force HTTPS
- Workers : optionnel (rate limiting edge, geoIP)

**Gain** :
- Latence Tunis Hetzner DE → CDN edge Tunis : 80-120ms → 10-20ms
- Bandwidth offload (factures Hetzner réduites)
- Protection DDoS gratuite

**Effort** : 2-3h (DNS propagation 1-24h).

**Préreq** :
- Login compte registrar doktori.tn (probablement OVH ou autre)
- Compte Cloudflare créé

---

### Item #21 — Cache Redis queries chaudes

**Bloqueur** : Install Redis sur prod 157.90.152.204.

**Scope** :
- Docker container `redis:7-alpine` sur prod
- Lib `apps/web/lib/cache.ts` avec wrapper `cached(key, ttl, fn)`
- Cacheable queries identifiées :
  - `getDoctorBySlug` (5 min TTL)
  - `searchDoctors(filters)` (1 min TTL)
  - `getAvailability(doctorId, date)` (30s TTL)
  - `getCatalogSpecialties()` (1h TTL)
  - `getCatalogCities()` (1h TTL)
- Invalidation : on UPDATE/DELETE des entités correspondantes

**Gain** :
- Recherche médecin : 200ms → 20ms
- Slot availability : 100ms → 10ms

**Effort** : 4-5h.

**Préreq** :
- Permission install Redis sur prod
- Redis password configuré (1Password)

---

### Item #25 — CI/CD GitHub Actions

**Bloqueur** : Setup secrets + permissions repo.

**Scope** :
- `.github/workflows/ci.yml` — sur push : install + typecheck + build + lint + test
- `.github/workflows/deploy-prod.yml` — sur tag `v*` : build Docker image + push → ssh prod + apply migrations + restart container
- Secrets GitHub :
  - `SSH_PRIVATE_KEY` (deploy user)
  - `DATABASE_URL_DEV` (pour tests)
  - `DOKTORI_PROD_HOST=157.90.152.204`
  - `DOCKER_USERNAME`, `DOCKER_PASSWORD` (si registry privé)

**Gain** :
- Plus de tar/scp manuel
- Déploiements traçables
- Tests automatiques sur chaque PR

**Effort** : 3-4h.

**Préreq** :
- GitHub Actions activé sur le repo
- SSH key du runner ajoutée à prod ~/.ssh/authorized_keys

---

### Item #9 — Coach santé IA conversationnel

**Bloqueur** : Compte Moonshot AI + cadrage juridique santé.

**Décision modèle (2026-05-05)** : Kimi (dernière version, Moonshot AI) au lieu de Claude Haiku.
Raison : coût/token significativement plus bas, qualité suffisante pour orientation
non-diagnostique, et meilleur RTL/arabe (utile pour patients tunisiens).

**Scope V1 (limité) — Évaluation symptômes basique** :
- Page `/coach-ia` (gated par feature flag)
- Chat interface backed par l'API Kimi (Moonshot AI)
- Prompt système strict :
  - "Tu es un assistant d'orientation médicale, NON un médecin"
  - "Toujours conseiller de consulter un professionnel pour diagnostic"
  - "Refuse les questions sur dosage médicament, urgences vitales (rediriger 190/198)"
- Limite 10 messages/jour/patient
- Disclaimer obligatoire avant chaque session
- Sortie structurée : symptômes → spécialité suggérée + lien `/recherche?specialty=…`

**Risques juridiques** :
- Loi tunisienne pas encore claire sur AI médical
- Responsabilité en cas d'erreur de diagnostic suggéré
- Recommandation : garder en MVP "orientation symptômes → spé suggérée" (pas de diagnostic)

**Effort** : 5-7h MVP.

**Préreq** :
- MOONSHOT_API_KEY (Kimi via api.moonshot.cn ou OpenRouter)
- Budget MVP estimé **$10-30/mois** pour ~1k patients actifs (Kimi K2 ≈ $0.15/M input + $2.5/M output, soit ~3x moins cher que Claude Haiku 4.5)
- Validation juridique du prompt + disclaimer

**Note infra** : weights Kimi K2 sont open-source (Apache) — option self-host envisageable si trafic explose et que API coûte > €500/mois (Hetzner GPU box). Pas en MVP.

---

## Plan d'exécution Phase 2

### Préreq à fournir avant session

**Audit credentials 2026-05-05** — résultats vérifiés contre `op://Dartank-Infra/...` :

| Item | Need | Status | Action |
|---|---|---|---|
| **#21 Redis** | `REDIS_PASSWORD` | ✅ DEPLOYED 2026-05-05, dans `/opt/doktori/.env`, à mettre en 1P (cf DOKTORI-1P-DEBT) | Cette tâche est SHIPPED |
| **#20 Cloudflare CDN** | Compte Cloudflare | ✅ confirmé (R2_ACCOUNT_ID `07ca38ff…` est l'ID du compte CF) | Ajouter `doktori.tn` comme zone dans le compte existant |
| **#20 Cloudflare CDN** | API Token (scope DNS:edit zone doktori.tn) | ❌ à créer | Toi, dans CF dashboard, stocker `Cloudflare - API Token (DNS edit)` |
| **#20 Cloudflare CDN** | DNS registrar accès doktori.tn | ❌ inconnu | Toi, identifier où le domaine est hébergé pour changer NS |
| **#2 Paiement** | `STRIPE_SECRET_KEY` | ✅ existe dans 1P (`Ecommerce Prod - STRIPE_SECRET_KEY`) — **décision : réutiliser ou créer compte Doktori dédié ?** | Toi (décision business) |
| **#2 Paiement** | `STRIPE_PUBLISHABLE_KEY` | ✅ idem (`Ecommerce Prod - STRIPE_PUBLISHABLE_KEY`) | Idem |
| **#2 Paiement** | `KONNECT_API_KEY` (paiement Tunisie) | ❌ à créer (compte Konnect) | Toi |
| **#9 Coach IA** | API Kimi | ✅ via OpenRouter (`Monitor Prod - OPENROUTER_API_KEY` expose `moonshotai/kimi-k2-0905` à $0.40/M input / $2.00/M output, vérifié 2026-05-05) | **Pas besoin de `MOONSHOT_API_KEY` direct** — Doktori a déjà `OPENROUTER_API_KEY` dans son `.env` |
| **R2 storage** | All 5 R2 fields | ✅ shared avec Ecommerce (`dartank-images` bucket, mêmes credentials) | Doktori `.env.tpl` doit référencer `op://Dartank-Infra/Ecommerce Prod - R2_*` directement |
| **Mobile app (#1)** | Apple Developer ($99/an) | ❌ pas dans 1P | Toi |
| **Mobile app (#1)** | Google Play Console ($25 one-time) | ❌ pas dans 1P | Toi |

**Décisions business pendantes** :
- Décision app mobile : React Native (Expo recommandé) / Flutter / différé ?
- Décision Stripe : compte partagé Ecommerce ou compte Doktori dédié ?

### Stratégie d'exécution révisée (après audit du 2026-05-05)

- **Session 1 (~5h)** ✅ #21 Redis SHIPPED 2026-05-05
- **Session 2 (~3-4h)** : #25 CI/CD GitHub Actions (code-only, pas de bloqueur externe)
- **Session 3 (~1-2h)** : DOKTORI-1P-DEBT (audit secrets, créer items 1P, refactor `.env.tpl` → `op inject`) — bootstrap requiert toi via desktop 1P (~5 min)
- **Session 4 (~3h)** : #20 Cloudflare CDN — tu donnes accès registrar + crées API token, je fais zone setup + cache rules
- **Session 5 (~5-7h)** : #9 Coach IA Kimi (via OpenRouter, déjà dispo) — implémentation chat + disclaimer + rate limit + spécialité matching
- **Session 6 (3-4 jours)** : #2 Paiement Konnect + Stripe (décision compte + Konnect creds nécessaires d'abord)
- **Sessions 7+ (6-8 semaines)** : App mobile (après décision stack)

---

## Checklist pré-Phase 2

- [x] Phase 1A entièrement déployé et stable en prod (>72h sans bug bloquant)
  - 13 commits Lighthouse fixes shippés 2026-05-05 — compteur 72h finit 2026-05-08 15:30
- [ ] Comptes Stripe/Konnect/Cloudflare API token créés et keys ajoutées au vault
- [ ] DPIA RGPD démarré (si on fait Coach IA — données de santé sensibles)
- [ ] Décision finale app mobile prise (Expo / React Native / différé)
- [ ] Décision Stripe : compte partagé Ecommerce ou Doktori dédié
- [ ] Briefing collègue médecin sur scope Phase 2 (éviter conflits + revue juridique disclaimer Coach IA)
- [ ] DOKTORI-1P-DEBT (cf `docs/phase-2-deferred-tickets.md`) — bootstrap items 1P par toi, puis refactor `.env.tpl` par moi

## Notes d'inventaire credentials

Voir `docs/phase-2-deferred-tickets.md` section "Verification of Phase 2 credential availability" pour le détail complet.
