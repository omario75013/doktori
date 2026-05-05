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
- MOONSHOT_API_KEY (Kimi)
- Budget mensuel à cadrer (Kimi nettement moins cher que Claude Haiku)
- Validation juridique du prompt + disclaimer

---

## Plan d'exécution Phase 2

### Préreq à fournir avant session

Tous les credentials sont (ou doivent être) dans le vault **Dartank-Infra** sur 1Password,
exposés aux services via `op inject` / `op run` (voir `~/.claude/CLAUDE.md` section "Credentials — 1Password").

1. **#2 Paiement** : `KONNECT_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, webhook secrets
2. **#20 Cloudflare** : credentials CF + accès DNS registrar (déjà dans 1Password)
3. **#21 Redis** : confirmation install sur prod 157.90.152.204 + `REDIS_PASSWORD` (à générer + stocker 1Password)
4. **#9 Coach IA** : `MOONSHOT_API_KEY` (Kimi) à ajouter au vault
5. **R2 storage** : credentials Cloudflare R2 (déjà dans 1Password — utilisés pour photo médecin et documents patient)
6. **Décision app mobile** : React Native (Expo recommandé) ou différé ?

### Stratégie d'exécution
- **Session 1 (4-5h)** : #2 paiement + #20 Cloudflare + #21 Redis + #25 CI/CD
- **Session 2 (8h)** : #9 Coach IA + setup app mobile (juste scaffold Expo)
- **Sessions 3-N (6-8 semaines)** : développement app mobile dédié

---

## Checklist pré-Phase 2

- [ ] Phase 1A entièrement déployé et stable en prod (>72h sans bug bloquant)
  - 11 commits Lighthouse fixes shippés 2026-05-05 — compteur 72h démarre maintenant
- [ ] Comptes Stripe/Konnect/Cloudflare/Moonshot (Kimi) créés et leurs API keys ajoutées au vault Dartank-Infra
- [ ] DPIA RGPD démarré (si on fait Coach IA — données de santé sensibles)
- [ ] Décision finale app mobile prise (Expo / React Native / différé)
- [ ] Briefing collègue médecin sur scope Phase 2 (éviter conflits + revue juridique disclaimer Coach IA)

## Notes d'inventaire credentials

Items **déjà disponibles** dans `op://Dartank-Infra/...` (à confirmer par Omar) :
- R2 storage (photo médecins, documents patients)
- Cloudflare account (probablement)

Items **à créer / ajouter au vault** avant session Phase 2 :
- `MOONSHOT_API_KEY` (Kimi — nouveau pour ce projet)
- `KONNECT_API_KEY` (si pas encore là)
- `REDIS_PASSWORD` (à générer + stocker)
