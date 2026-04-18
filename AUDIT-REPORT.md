# AUDIT REPORT — Doktori.tn

## Ce qui a été fait ✅

### P0.1 — Fausses données
- Tous les chiffres fictifs retirés de la homepage (65+, 1 247, 4.8/5, +1000)
- Stats grid remplacé par des valeurs factuelles (spécialités, quartiers, disponibilité)
- Phone mockup: badge "4.8/5 · 1 247 avis" → "Doktori · Avis patients"
- Strip pré-lancement ajouté avec message honnête FR + AR

### P0.2 — WhatsApp
- 2 occurrences de `wa.me/21620000000` remplacées par `mailto:contact@doktori.tn`
- Le numéro WhatsApp sera ajouté quand un vrai numéro sera disponible

### P0.5 — Copyright + mentions légales + quartiers
- Copyright mis à jour sur toutes les pages (5 fichiers)
- Footer enrichi avec Random Walkers SUARL + RNE
- Mentions légales remplies avec les vraies données RNE
- Hero description: "Tunis, Ariana et Manouba" → "Grand Tunis"

## Ce qui existait déjà ✅ (pas besoin de refaire)

- `robots.ts` — complet, bloque /api, /admin, /connexion
- `sitemap.ts` — dynamique avec doctors + clinics + pages statiques
- JSON-LD `MedicalOrganization` — dans layout.tsx
- JSON-LD `FAQPage` — dans faq/page.tsx (FR + AR)
- JSON-LD `Physician` — dans medecin/[slug]/page.tsx
- Hreflang alternates — configurés (cookie-based locale)
- Metadata `generateMetadata` — sur la plupart des pages
- Waitlist table — existe dans le schema DB
- App mobile Expo — 28 écrans, EAS configuré (pas encore sur les stores)
- Chatbot disclaimer médical — déjà implémenté

## Ce qui n'a pas encore été fait ⚠️

### P0.3 — État vide amélioré sur /recherche
**Raison:** La page de recherche a déjà un état vide fonctionnel. L'amélioration avec formulaire waitlist inline est un P1, pas un bloquant.

### P0.4 — App Store badges
**Raison:** L'app mobile existe réellement (28 écrans Expo). Les badges "Bientôt" sont honnêtes — l'app est codée mais pas encore soumise aux stores. Pas de faux lien.

### P1 — SEO Hardening
**Status:** Partiellement fait dans des sessions précédentes (canonical URLs, OG tags, JSON-LD). La PR `feat/seo-hardening` n'a pas été créée dans cette session car les éléments clés existaient déjà.

### P2 — Contenu & Conversion
**Status:** Non commencé. Page "À propos" et blog à créer dans une session dédiée.

## Décisions prises ⚖️

1. **Stats grid:** remplacé par des valeurs factuelles plutôt que supprimé (10 spécialités et 8 quartiers sont vrais)
2. **WhatsApp:** remplacé par email plutôt que désactivé (plus utile pour le support)
3. **Copyright:** format "© 2025–2026" plutôt que "© 2025" (couvre la période de développement + lancement)
4. **Quartiers:** utilisé "Grand Tunis" dans le hero plutôt que la liste complète (plus inclusif)
5. **App badges:** conservés avec mention "Bientôt" car l'app existe réellement et sera soumise

## TODOs pour Omar 📋

| Item | Priorité | Où |
|------|----------|-----|
| Renseigner le matricule fiscal complet (format 1234567/A/B/C/000) | HAUTE | `/legal/mentions/page.tsx` |
| Faire la déclaration INPDP et renseigner le numéro | HAUTE | `/legal/mentions/page.tsx` |
| Désigner un DPO (ou se désigner soi-même) | HAUTE | `/legal/mentions/page.tsx` |
| Obtenir un vrai numéro WhatsApp Business | MOYENNE | `NEXT_PUBLIC_WHATSAPP_NUMBER` env var |
| Valider le conseiller CNOM pour conformité déontologique | MOYENNE | Page "À propos" (à créer) |
| Soumettre l'app mobile sur App Store + Google Play | BASSE | `eas submit` |
| Créer la page "À propos / Qui sommes-nous" | BASSE | `/a-propos/page.tsx` |
