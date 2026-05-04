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

**Bloqueur** : Compte Anthropic API + budget + cadrage juridique santé.

**Scope V1 (limité) — Évaluation symptômes basique** :
- Page `/coach-ia` (gated par feature flag)
- Chat interface avec Claude Haiku (rapide + bon marché)
- Prompt système strict :
  - "Tu es un assistant d'orientation médicale, NON un médecin"
  - "Toujours conseiller de consulter un professionnel pour diagnostic"
  - "Refuse les questions sur dosage médicament, urgences vitales (rediriger 190/198)"
- Limite 10 messages/jour/patient
- Disclaimer obligatoire avant chaque session

**Risques juridiques** :
- Loi tunisienne pas encore claire sur AI médical
- Responsabilité en cas d'erreur de diagnostic suggéré
- Recommandation : garder en MVP "orientation symptômes → spé suggérée" (pas de diagnostic)

**Effort** : 5-7h MVP.

**Préreq** :
- ANTHROPIC_API_KEY
- Budget $50/mois minimum
- Validation juridique du prompt + disclaimer

---

## Plan d'exécution Phase 2

### Préreq à fournir avant session
1. KONNECT_API_KEY + STRIPE_SECRET_KEY (#2)
2. Accès compte Cloudflare + DNS registrar (#20)
3. Confirmation install Redis sur prod (#21)
4. ANTHROPIC_API_KEY si on fait Coach IA (#9)
5. Décision app mobile : React Native ou différé ?

### Stratégie d'exécution
- **Session 1 (4-5h)** : #2 paiement + #20 Cloudflare + #21 Redis + #25 CI/CD
- **Session 2 (8h)** : #9 Coach IA + setup app mobile (juste scaffold Expo)
- **Sessions 3-N (6-8 semaines)** : développement app mobile dédié

---

## Checklist pré-Phase 2

- [ ] Phase 1A entièrement déployé et stable en prod (>72h sans bug bloquant)
- [ ] Comptes Stripe/Konnect/CF/Anthropic créés
- [ ] DPIA RGPD démarré (si on fait Coach IA — données de santé sensibles)
- [ ] Décision finale app mobile prise
- [ ] Briefing collègue médecin sur scope Phase 2 (éviter conflits)
