# Doktori Multi-Providers — Décisions architecturales à trancher

**Date** : 2026-05-08
**Status** : Décisions en attente avant exécution de la spec `2026-05-08-multi-providers-spec.md`
**Public** : Omar — pour validation avant que Achref démarre l'implémentation
**Format** : Architecture Decision Records (ADR) — chaque section liste options, pros/cons, recommandation et impact

---

## Sommaire

1. [ADR-1 : Tables séparées vs table unique polymorphique](#adr-1--tables-séparées-vs-table-unique-polymorphique)
2. [ADR-2 : Paramédicaux dans V1 ou différé V2](#adr-2--paramédicaux-dans-v1-ou-différé-v2)
3. [ADR-3 : Livraison médicaments — interne pharmacie vs partenaire logistique](#adr-3--livraison-médicaments--interne-pharmacie-vs-partenaire-logistique)
4. [ADR-4 (bonus) : Authentification multi-types — providers NextAuth séparés vs unifié](#adr-4-bonus--authentification-multi-types--providers-nextauth-séparés-vs-unifié)
5. [ADR-5 (bonus) : Recherche unifiée — Meilisearch index par type vs index unique](#adr-5-bonus--recherche-unifiée--meilisearch-index-par-type-vs-index-unique)
6. [ADR-6 (bonus) : Stockage résultats analyses — R2 chiffré vs Supabase Storage](#adr-6-bonus--stockage-résultats-analyses--r2-chiffré-vs-supabase-storage)
7. [Synthèse des décisions à prendre](#synthèse-des-décisions-à-prendre)

---

## ADR-1 : Tables séparées vs table unique polymorphique

### Contexte

Doktori actuel a `doctors` et `clinics` comme tables séparées avec des champs communs (name, slug, email, phone, city, address, photoUrl, lat/lng, rating). On doit ajouter 3 nouveaux types : `laboratories`, `pharmacies`, `paramedicals`. Soit on continue le pattern existant (1 table par type), soit on refactor vers une table unique `providers` avec un discriminant `type`.

### Option A — Tables séparées (1 par type)

**Schema** :
```
doctors, clinics, laboratories, pharmacies, paramedicals
```
+ vue SQL `all_providers_v` pour les requêtes cross-type :
```sql
CREATE VIEW all_providers_v AS
SELECT id, slug, 'doctor' AS type, name, ... FROM doctors
UNION ALL
SELECT id, slug, 'laboratory' AS type, name, ... FROM laboratories
UNION ALL
... (5 tables)
```

**Pros** :
- ✅ Continuité avec le pattern actuel — pas de migration `doctors` ou `clinics`
- ✅ Champs spécifiques par type clairs (`iso15189_accredited` chez labo, `pharmacist_diploma_url` chez pharma) — pas besoin de `JSONB` flou
- ✅ Index dédiés par type → recherche rapide
- ✅ Foreign keys explicites : `laboratory_appointments.laboratory_id → laboratories.id` (impossible de pointer vers la mauvaise table)
- ✅ RLS / row-level security par type triviale
- ✅ Migration zéro impact sur tables existantes
- ✅ Drizzle types clairs : `Doctor`, `Laboratory`, `Pharmacy` distincts en TypeScript

**Cons** :
- ❌ Duplication champs communs (~15 champs × 5 tables)
- ❌ Cross-type queries via `UNION ALL` ou la vue (légèrement moins performant qu'un seul index)
- ❌ Si on ajoute un nouveau champ commun (ex: `description_short`), il faut 5 ALTER TABLE
- ❌ Réviews liées à un provider : actuellement `reviews.doctor_id` — il faudrait soit ajouter `reviews.provider_type + provider_id` soit créer 5 tables reviews

### Option B — Table unique `providers` polymorphique

**Schema** :
```sql
CREATE TABLE providers (
  id UUID PK,
  type VARCHAR(20) NOT NULL,  -- doctor | clinic | laboratory | pharmacy | paramedical
  -- champs communs
  slug, name, email, password_hash, phone, city, address, lat, lng, photo_url,
  rating, rating_count, verification_status, is_active, is_visible, created_at, updated_at,
  -- champs spécifiques en JSONB
  type_specific_data JSONB
);
```

**Pros** :
- ✅ Schema DRY : une seule table, une seule définition
- ✅ Recherche cross-type triviale (un SELECT, pas de UNION)
- ✅ Reviews / favoris / messagerie peuvent pointer `provider_id` polymorphiquement
- ✅ Ajouter un nouveau type = 0 migration (juste un nouveau `type` enum)
- ✅ Future feature "claim profile" / "doctor → clinic transfer" plus simple

**Cons** :
- ❌ Champs spécifiques en JSONB → pas de type-safety SQL (un labo peut accidentellement avoir un `pharmacist_name` si bug applicatif)
- ❌ Validation business logic doit être en code (pas de constraints SQL)
- ❌ Index sur `type_specific_data` champs = GIN/BTree GINNED, lourd
- ❌ **Migration depuis l'existant lourde** : recopier `doctors` (~1000 rows ?) + `clinics` vers `providers`, casser tous les FK existants, refactor tous les SELECT existants → semaine de boulot risquée
- ❌ Drizzle types : `Provider` générique, plus de discrimination automatique (besoin de `as Doctor`)

### Recommandation : Option A — Tables séparées

**Justification** :
1. La duplication de champs communs est le coût acceptable contre la migration risquée d'option B
2. Le pattern `doctors`/`clinics` existant marche, le prolonger est cohérent
3. L'ajout futur de champs communs (rare) reste gérable avec un script qui fait 5 ALTER en // (1 commit)
4. Foreign keys typées = sécurité critique pour PHI (Patient Health Info)
5. `withAdminAudit` wrapper actuel (commit 424b751) suppose `resourceType` → tables séparées match

**Impact effort** :
- Option A : 2j migration + schema + Drizzle (estimé dans phase 1 spec)
- Option B : 5-7j refactor existant + tous les SELECT/UPDATE/DELETE qui touchent `doctors`/`clinics` (~80 fichiers à toucher)

**Reviews / favoris polymorphiques** : compromis pragmatique en option A :
```sql
-- reviews garde sa structure actuelle (doctor_id) pour Phase 1
-- Phase 2 : extension avec colonnes optionnelles labo/pharma
ALTER TABLE reviews ADD COLUMN laboratory_id UUID REFERENCES laboratories(id);
ALTER TABLE reviews ADD COLUMN pharmacy_id UUID REFERENCES pharmacies(id);
ALTER TABLE reviews ADD CONSTRAINT review_one_target_chk
  CHECK (
    (doctor_id IS NOT NULL)::int +
    (laboratory_id IS NOT NULL)::int +
    (pharmacy_id IS NOT NULL)::int +
    (paramedical_id IS NOT NULL)::int +
    (clinic_id IS NOT NULL)::int = 1
  );
```
Ou refactor reviews en 4 tables séparées plus tard si nécessaire.

### Décision : ☐ Option A (Tables séparées) ☐ Option B (Polymorphique) ☐ À discuter

---

## ADR-2 : Paramédicaux dans V1 ou différé V2

### Contexte

Les paramédicaux (sages-femmes, infirmiers, kiné, ostéopathes, psychologues non-médecins, diététiciens, orthophonistes, podologues) représentent ~5-10x le nombre de médecins en Tunisie. Inclure cette catégorie multiplie le marché adressable, mais ajoute complexité (workflows distincts par profession, validation par ordre pro spécifique).

### Option A — V1 inclut paramédicaux

**Scope V1** :
- Table `paramedicals` (8 professions enum)
- Espace pro `/paramedical` (mirror simplifié de `/dashboard` médecin)
- Onboarding `/inscription/paramedical`
- Pages publiques `/paramedicaux/{profession}/{ville}/{slug}`
- Booking RDV similaire au médecin

**Pros** :
- ✅ Marché adressable +500% par rapport aux seuls médecins
- ✅ Patient gain UX : "tout en un" — pas besoin de chercher ailleurs un kiné après consult orthopédiste
- ✅ Réutilise le pattern médecin existant (~70% du code, juste cosmétique)
- ✅ Différenciateur fort vs Dabadoc (qui a paramédicaux mais pas autant centré)

**Cons** :
- ❌ +1j dev pour scaffold espace pro paramédical
- ❌ Validation par 8 ordres professionnels différents (CNOM = médecins, mais kiné = Ordre des Kinés, sage-femme = Ordre des SF, etc.) → admin verification page doit gérer 8 cas
- ❌ Risque "diluer la marque" Doktori (perçu comme plateforme médecins) — mais cosmétique, gérable au marketing
- ❌ Moins prioritaire si focus = labos+pharma pour le Tier 1 service

### Option B — V1 sans paramédicaux, V2 plus tard

**Scope V1** : médecins + cliniques + labos + pharmacies uniquement.
**V2 (3-6 mois)** : ajout paramédicaux quand bande passante / demande.

**Pros** :
- ✅ Scope V1 plus serré (~3 semaines au lieu de ~3.5)
- ✅ Focus marketing clair : "tous les services médicaux + analyses + médicaments"
- ✅ Moins de complexité gouvernance (8 ordres pros à dialoguer)
- ✅ Permet d'observer demande réelle avant d'investir

**Cons** :
- ❌ Patient cherche kiné → va sur autre site (perte audience)
- ❌ Adoption SEO plus lente (moins de pages, moins de longue-traîne)
- ❌ Si on ajoute paramédicaux V2 en hors-ligne marketing, ça paraît "rattrapage"

### Recommandation : Option A (V1 inclut paramédicaux) — mais simplifié

**Justification** :
1. Le coût marginal est faible (~1j dev, espace pro = clone médecin)
2. La table `paramedicals` est nécessaire de toute façon (admin doit gérer cas existants)
3. SEO Tunisie : longue-traîne kiné/sage-femme représente énorme volume de recherches
4. Différencateur stratégique vs concurrents

**Simplification proposée pour scope V1** :
- Inclure seulement **3 professions** au démarrage : kinésithérapeute, sage-femme, psychologue
- Les 5 autres (infirmier/ostéo/diététicien/orthophoniste/podologue) en seed admin (table prête, mais pages publiques masquées) — activables progressivement
- Validation V1 : autoinscription + email vérifié + diplôme uploadé → admin vérifie en async

**Décision** : ☐ Option A — toutes professions ☐ Option A — 3 professions + extension progressive ☐ Option B — V2

---

## ADR-3 : Livraison médicaments — interne pharmacie vs partenaire logistique

### Contexte

Quand un patient envoie une ordonnance avec mode `delivery`, qui livre les médicaments ? La pharmacie elle-même, ou un partenaire logistique externe ?

### Option A — Livraison interne pharmacie

La pharmacie gère sa flotte (livreur salarié ou indépendant lié). Doktori expose le statut `out_for_delivery` mais ne tracke pas le livreur en temps réel.

**Pros** :
- ✅ Zéro intégration externe — Doktori ne dépend de personne
- ✅ Pharmacie 100% en contrôle : qualité service, créneaux, tarif
- ✅ Conforme à la pratique tunisienne actuelle (les grandes officines ont leur livreur)
- ✅ V1 implementable en quelques jours

**Cons** :
- ❌ Petites pharmacies (sans livreur) ne peuvent pas activer la livraison → perte adoption
- ❌ Pas de tracking GPS visible côté patient → "ma livraison est où ?" pas de réponse précise
- ❌ Tarif livraison incohérent entre pharmacies (chacune fixe son prix)

### Option B — Partenaire logistique unique (Yassir Express ou équivalent)

Doktori intègre l'API d'un seul partenaire (Yassir Logistique). À chaque commande livraison, Doktori commande le pickup automatiquement.

**Pros** :
- ✅ Toutes les pharmacies (même les petites) ont accès à la livraison
- ✅ Tarif uniforme, prévisible (Yassir tarifie par km)
- ✅ Tracking GPS livreur en temps réel
- ✅ Patient voit ETA précise

**Cons** :
- ❌ Dépendance à un partenaire (si Yassir tombe, livraison KO)
- ❌ Négociation contractuelle B2B avec Yassir (mois de discussion)
- ❌ Doktori prend une commission sur la livraison → conflit potentiel avec pharma qui voudraient vendre eux-mêmes
- ❌ V1 impossible avant signature contrat (3-6 mois)

### Option C — Hybride : pharma interne **OU** Doktori choisit partenaire

Pharmacie configure dans son profil : `delivery_mode = 'internal' | 'doktori_partner' | 'none'`.

- Si `internal` : workflow option A
- Si `doktori_partner` : Doktori invoque l'API logistique partenaire
- Si `none` : pas de livraison, juste click & collect

**Pros** :
- ✅ Flexibilité maximale — chaque pharma choisit selon ses moyens
- ✅ V1 ship-able en mode `internal` pur, ajout `doktori_partner` plus tard sans casser l'existant
- ✅ Petites pharmacies peuvent quand même activer livraison

**Cons** :
- ❌ Plus de logique applicative à maintenir
- ❌ UI patient légèrement complexe (à quel moment voit-il l'ETA si interne vs partenaire ?)
- ❌ Tarification non-uniforme (UI doit afficher fee selon pharmacie)

### Recommandation : Option C (hybride) — mais V1 ship en `internal` only, partenaire en V2

**Justification** :
1. Schema DB prévu pour `delivery_mode` enum dès le départ
2. V1 : tous comptes pharmacie créés en `internal`, fonctionnel out-of-the-box
3. V2 (3-6 mois) : signature partenaire logistique, activation graduelle pharmacie par pharmacie
4. Pas de dépendance critique pour V1 — Yassir non-bloquant

**Schema impact** :
```sql
ALTER TABLE pharmacies ADD COLUMN delivery_mode VARCHAR(20) DEFAULT 'internal';
-- 'internal' | 'doktori_partner' | 'none'
ALTER TABLE prescription_orders ADD COLUMN courier_partner VARCHAR(50);
-- NULL si internal | 'yassir' | 'glovo' | etc.
ALTER TABLE prescription_orders ADD COLUMN courier_tracking_url TEXT;
ALTER TABLE prescription_orders ADD COLUMN courier_eta TIMESTAMPTZ;
```

**V1 effort** : 0j additionnel (table prête, partenaire colonnes vides V1).
**V2 effort** : ~5j (intégration partenaire choisi).

### Décision : ☐ Option A (interne only V1) ☐ Option B (partenaire V1) ☐ Option C (hybride, V2 partenaire)

---

## ADR-4 (bonus) : Authentification multi-types — providers NextAuth séparés vs unifié

### Contexte

Doktori actuel a 5 providers NextAuth :
- `doctor-credentials`, `secretary-credentials`, `clinic-credentials`, `admin-credentials`, `patient-credentials` (token JWT custom)

On doit ajouter `laboratory`, `pharmacy`, `paramedical`. Soit on suit le pattern `1 provider par type`, soit on unifie en `provider-credentials` avec un discriminant.

### Option A — 1 provider NextAuth par type (continue pattern)

Ajouter 3 nouveaux : `laboratory-credentials`, `pharmacy-credentials`, `paramedical-credentials`.

**Pros** :
- ✅ Continuité pattern actuel
- ✅ JWT session contient `role` clair → guard middleware simple
- ✅ Login pages distinctes : `/laboratoire-login`, `/pharmacie-login` — clair UX
- ✅ Cookie de session par type pas mélangés

**Cons** :
- ❌ 8 providers NextAuth à maintenir (admin, doctor, secretary, clinic, lab, pharma, paramed + patient bearer)
- ❌ Si un user a multi-rôles (rare, mais possible : médecin + propriétaire de clinique), il doit relogger

### Option B — Provider unifié `provider-credentials` avec field `type`

Un seul provider NextAuth avec champ `type` dans le credential lookup. Le JWT contient `{role: "provider", providerType: "laboratory", id}`.

**Pros** :
- ✅ Code auth plus DRY
- ✅ Multi-rôles plus simple (un user peut switch type via dropdown)
- ✅ Pages login unifiées avec sélecteur type

**Cons** :
- ❌ Refactor du `lib/auth.ts` non-trivial
- ❌ Cookie session unique → un seul rôle actif à la fois (perte UX si on veut multi-tabs)
- ❌ Risque sécu : bug dans `providerType` → privilege escalation

### Recommandation : Option A

Continuité, sécurité, isolation des sessions par type. Le coût de 3 nouveaux providers est faible (~30 lignes chacun, pattern copy-paste de `doctor-credentials`).

### Décision : ☐ Option A ☐ Option B

---

## ADR-5 (bonus) : Recherche unifiée — Meilisearch index par type vs index unique

### Contexte

Doktori actuel a `meilisearch.doctors` indexé. Recherche unifiée multi-types : index séparés ou index unique avec field `type` ?

### Option A — Index par type (séparé)

`meilisearch.doctors`, `meilisearch.laboratories`, `meilisearch.pharmacies`, `meilisearch.paramedicals`, `meilisearch.clinics`.

API : selon le type filtré, query l'index correspondant. Si "tous types", lance 5 queries en // et merge.

**Pros** :
- ✅ Tuning ranking par type (medical specialty boost ≠ lab analysis boost)
- ✅ Synonymes par type (ex: "ophtalmo" = "ophtalmologue" pour doctors, ne s'applique pas à pharmacies)
- ✅ Settings (searchableAttributes, filterableAttributes) optimisés par type

**Cons** :
- ❌ 5 queries en // pour "tous types" = latence légèrement augmentée (~50ms vs ~20ms si single)
- ❌ 5 indexes à reconstruire en cas de schema change

### Option B — Index unique `providers`

Un seul index Meilisearch avec field `type`. Filter side `type=doctor`.

**Pros** :
- ✅ Une seule query, faster
- ✅ Indexation cross-type (ex: chercher "Tunis" retourne tous types triés par pertinence)

**Cons** :
- ❌ Ranking moins pertinent par type (ex: une pharmacie avec nom "ophtalmo" pourrait remonter sur recherche "ophtalmologue")
- ❌ Settings communs imposent compromis (searchableAttributes globaux)
- ❌ Synonymes communs ne fittent pas tous les types

### Recommandation : Option A — Index par type

Pertinence > performance pour Doktori. La latence multi-query est acceptable (50ms < SLA), et le tuning par type vaut le coût.

### Décision : ☐ Option A ☐ Option B

---

## ADR-6 (bonus) : Stockage résultats analyses — R2 chiffré vs Supabase Storage

### Contexte

Les résultats d'analyses bio sont du PHI (Protected Health Information) — ultra-sensible. Doktori utilise R2 (Cloudflare) pour photos médecin/cabinet et BS PDF, et Supabase pour la DB. Où stocker les `results_pdf_url` ?

### Option A — R2 (continue pattern)

Stockage R2 standard, URL signée 7 jours, suppression auto via lifecycle policy après 5 ans (réglementation médicale Tunisie).

**Pros** :
- ✅ Continuité avec pattern existant (commit `9725184` v1.0.0)
- ✅ Coûts pennies/GB
- ✅ CDN Cloudflare = perf accès patient

**Cons** :
- ❌ R2 n'est pas HIPAA-compliant officiellement (Cloudflare ne signe pas BAA — Business Associate Agreement)
- ❌ Tunisie n'exige pas HIPAA mais loi 2004-63 (data protection) demande "mesures de sécurité appropriées"

### Option B — Supabase Storage avec RLS

**Pros** :
- ✅ Co-localisé avec la DB (même tenant)
- ✅ RLS row-level security automatique (patient ne peut accéder qu'à ses propres résultats)

**Cons** :
- ❌ Coûts supérieurs à R2 (~10x)
- ❌ Pas de CDN out-of-the-box
- ❌ Pattern différent du reste de Doktori

### Option C — R2 avec chiffrement at-rest applicatif (envelope encryption)

Stocker en R2 mais chiffrer chaque PDF côté Doktori avant upload (clé gérée par Doktori). URL R2 retournent du chiffré, Doktori décrypte à la lecture avant de servir au patient.

**Pros** :
- ✅ Coûts R2 + sécurité maximale
- ✅ Conforme aux pratiques médicales européennes

**Cons** :
- ❌ Complexité +1 (key management, rotation, etc.)
- ❌ Latence serveur (décrypt avant streaming → ne peut pas signed-URL direct)
- ❌ Backup difficile si clé perdue

### Recommandation : Option A — R2 avec URLs signées courtes

**Justification** :
1. Loi 2004-63 Tunisie est moins prescriptive que HIPAA
2. URLs signées 24h max (au lieu de 7j) = limite l'exposition
3. Pattern simple à maintenir
4. Audit log à chaque génération URL signée
5. Possibilité d'évoluer vers option C en V3 si compliance le requiert

**Schema impact** : 0 changement spec actuelle, juste politique app-level :
```ts
// lib/r2.ts
export async function getSignedUrlForResults(key: string): Promise<string> {
  return getSignedUrl({ key, expiresIn: 86400 }); // 24h max
}
```
Audit row à chaque génération.

### Décision : ☐ Option A (R2 + signed URLs 24h) ☐ Option B (Supabase) ☐ Option C (R2 chiffré app-level)

---

## Synthèse des décisions à prendre

Pour passer à l'implémentation, il faut trancher (au minimum) les 3 premiers points. Les 3 bonus (ADR-4/5/6) ont des recommandations conservatives qui peuvent être adoptées par défaut sauf objection.

| ADR | Sujet | Reco | Impact si différent |
|---|---|---|---|
| **ADR-1** | Tables séparées vs polymorphique | Tables séparées | +5j refactor si polymorphique |
| **ADR-2** | Paramédicaux dans V1 | V1 inclut 3 professions (kiné/SF/psy) | -1j si V2, +0.5j si toutes les 8 professions |
| **ADR-3** | Livraison médicaments | Hybride (interne V1, partenaire V2) | +5j si partenaire V1 |
| **ADR-4 (bonus)** | Auth multi-types | 1 provider NextAuth par type | +1j refactor si unifié |
| **ADR-5 (bonus)** | Meilisearch | Index par type | aucune diff effort, juste UX |
| **ADR-6 (bonus)** | Stockage résultats | R2 + signed URLs 24h | +3j si chiffrement app-level |

**Effort total dépendant** :
- Toutes recos suivies : **22-25j** (cf spec principale)
- Toutes options "max scope" : **30-35j**

---

## Questions ouvertes pour Omar

1. **ADR-1 confirmation** : Tables séparées OK ?
2. **ADR-2 confirmation** : 3 professions paramédicaux V1 ou toutes les 8 ?
3. **ADR-3 confirmation** : Livraison V1 = interne pharma uniquement, V2 = partenaire ?
4. **ADR-4/5/6** : Adopter recommandations par défaut ?
5. **Question annexe — Marketing** : Quelle stratégie d'acquisition labos+pharmacies ? (gratuit launch, payant après ? Démarcheurs commerciaux Tunis/Sfax/Sousse ?)
6. **Question annexe — Données seed** : Tu as accès à un fichier des labos majeurs Tunisie + leurs codes NABM ? Sinon je peux proposer des sources publiques (CNAM site, Ordre des Pharmaciens) à scraper/parser.
7. **Question annexe — Branding** : Doktori = "annuaire médecins" devient "plateforme santé" — tu veux changer le tagline / logo / hero copy ?

---

**Une fois ces 3 décisions prises, Achref peut générer le plan d'exécution détaillé via la skill `writing-plans` puis lancer l'implémentation phase par phase.**
