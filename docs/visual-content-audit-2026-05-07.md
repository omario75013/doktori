# Doktori — Audit contenu visuel + recommandations HD

> Date : 2026-05-07
> Objectif : identifier les emplacements où ajouter des photos HD de médecins/patients pour renforcer le sérieux et la confiance.
> Inspirations : Doctolib, Dabadoc.com.

## TL;DR

La homepage Doktori a **9 sections** mais **aucune ne montre un médecin ou un patient en situation réelle de consultation**. Les seuls visages humains sont les avatars carrés dans le strip "Notre réseau" (taille thumbnail ~80px) et le grid "6 médecins". Aucune photo HD pleine largeur. Aucun témoignage patient avec photo. Aucune scène de cabinet.

Pour matcher le sérieux Doctolib (et dépasser Dabadoc qui n'a que des bannières graphiques), il faut **5 emplacements clés** à remplir avec contenu visuel HD humain.

## Comparaison concurrents

### Doctolib (FR)
- Hero : photo HD pleine largeur d'un patient utilisant l'app sur smartphone (ambiance cabinet/maison)
- "Comment ça marche" : illustrations animées 3 étapes
- "Témoignages" : photos HD de patients avec citation
- "Pour les soignants" : photo HD d'un médecin en consultation
- Footer CTA : photo médecin + patient en situation
- **Densité visuelle : très élevée**, photos professionnelles sur ~50% des sections

### Dabadoc (MAR)
- Hero : illustration graphique WebP (pas de photo)
- Sections services : 4 bannières graphiques
- Vidéo intégrée (probablement témoignage)
- **Aucune photo HD de médecin ou patient**
- **Densité visuelle : faible**, repose sur graphismes vectoriels

### Doktori (TN) — état actuel
| Section | Visuel actuel |
|---|---|
| Hero | Aucun. Texte + searchbar + 5 mini-avatars |
| Stats band | Texte uniquement |
| CTA banner | Texte uniquement |
| "Pourquoi Doktori" | 3 icônes Lucide |
| "Notre réseau" | 6 cards avec mini-avatars 80×80 |
| Spécialités | Icônes |
| Comment ça marche | Numéros 1/2/3 |
| CTA dark | Texte uniquement |
| CTA bas de page | Texte uniquement |

→ **0 photo HD humaine** sur 9 sections. Le site repose entièrement sur typographie + couleurs.

## 5 emplacements à enrichir (par ROI)

### 1. Hero (apps/web/app/page.tsx:112) — **PRIORITÉ 1**

**Actuel** : bg-gradient + searchbar + strip de 5 mini-avatars.
**Cible Doctolib-style** : photo HD à droite (côté desktop) montrant un médecin tunisien en consultation **OU** un patient avec smartphone.

**Spec contenu** :
- Format : 1200×900px (4:3), version mobile 800×600 — webp + AVIF
- Sujet : médecin tunisien en blouse blanche, stéthoscope, dans un cabinet contemporain. Sourire discret, position 3/4 face. Lumière naturelle, fond légèrement flou. **Pas** de cliché posé "main sur le menton".
- Diversité : un homme + une femme (rotation A/B test possible)
- Sourcing : photo originale (commande à un photographe Tunis ~500-800 TND/séance avec un médecin partenaire) **OU** Unsplash/Pexels avec licence commerciale (gratuit mais générique).

**Implémentation** :
```tsx
<div className="grid lg:grid-cols-2 gap-12 items-center">
  <div>{/* H1 + searchbar + featured strip */}</div>
  <div className="hidden lg:block">
    <Image
      src="/images/hero-doctor-consultation.webp"
      alt="Médecin tunisien en consultation"
      width={600} height={500}
      priority
      className="rounded-3xl shadow-2xl"
    />
  </div>
</div>
```

**Effort code** : 30 min. **Effort photo** : 2-4h shoot OU 30 min sourcing stock.

---

### 2. Section "Comment ça marche" (apps/web/app/page.tsx:474) — **PRIORITÉ 2**

**Actuel** : 3 numéros 1/2/3 + texte + icônes.
**Cible** : 3 photos courtes "in situ" :
- Étape 1 (Recherche) : screenshot mobile en HD du formulaire de recherche, mockup smartphone ou photo d'une main tenant un téléphone sur l'app
- Étape 2 (Réservation) : photo d'un patient lisant la confirmation sur son téléphone, ambiance maison
- Étape 3 (Consultation) : photo d'une consultation patient-médecin (cabinet ou téléconsultation écran)

**Format** : 600×450px chaque, ratio 4:3. Empilé vertical mobile, horizontal 3 colonnes desktop.

**Effort** : 1h shoot/sourcing + 30 min code.

---

### 3. Section "Pourquoi Doktori" (apps/web/app/page.tsx:288) — **PRIORITÉ 3**

**Actuel** : 3 cards avec icônes Lucide (Clock, Shield, Users).
**Cible** : remplacer les icônes par 3 mini-photos HD circulaires :
- "Réservation <2 min" → photo main tenant smartphone avec calendrier
- "Médecins vérifiés" → photo médecin avec badge CNOM (carte ordre)
- "100% gratuit côté patient" → photo patient souriant avec ordonnance

**Effort** : 30 min code + 1h sourcing.

---

### 4. NOUVELLE section "Témoignages patients" — **PRIORITÉ 4**

**Pas dans le code actuel** — à ajouter entre "Notre réseau" (L351) et "Spécialités" (L428).

**Cible Doctolib-style** : carrousel ou grid de 3 témoignages patients réels :
- Photo HD du patient (450×450 carré, fond neutre)
- Nom + ville + spécialité consultée
- Citation 2-3 lignes
- Étoiles d'évaluation

**Sourcing** : demander aux patients pilotes existants (les 69 médecins ont des patients qui ont laissé des avis 5★) qui acceptent leur témoignage en échange d'un cadeau symbolique. Photo prise par téléphone avec consentement écrit.

**Effort** : 5h démarche + collecte + 1h code.

---

### 5. NOUVELLE section "Notre engagement médecin" — **PRIORITÉ 5**

**Pas dans le code actuel** — à ajouter entre "Comment ça marche" (L474) et "CTA dark" (L579).

**Cible** : photo HD pleine largeur avec un médecin tunisien (CNOM-vérifié) + citation de 2 lignes sur ce que Doktori change pour son cabinet.

**Sourcing** : 3-5 médecins pilotes qui acceptent une photo + témoignage.

**Effort** : 8h démarche + 1h code.

## Pages secondaires à enrichir

### `/medecin/[slug]` (fiche médecin publique)

**Actuel** : avatar 200×200 + bio texte.
**Manque** :
- Photo HD du cabinet (intérieur ambiance, 1200×800)
- Photo HD du médecin en consultation ou en pied (différente de l'avatar)
- Galerie 4-6 photos cabinet (fauteuil, salle d'attente, équipement)

**Storage** : R2 bucket `dartank-images` (déjà configuré). Path suggéré : `doctors/{slug}/cabinet-{n}.webp`.

**Effort** : module galerie ~3h code + DB column `cabinetGalleryUrls jsonb` migration.

### `/recherche` (résultats)

**Actuel** : cards médecin avec avatar 80×80.
**Manque** : avatar plus grand (120×120) en HD, voire mini-photo cabinet 240×135 en hover.

**Effort** : 1h code (assets déjà uploadés).

### `/sos` (SOS docteur)

**Actuel** : texte + bouton.
**Manque** : photo HD ambiance "urgence rassurante" (médecin de garde, ambulance discrète, médecin avec smartphone). Augmente la confiance dans un moment critique.

**Effort** : 30 min code + sourcing photo.

### `/blog/[slug]` (articles blog)

**Actuel** : article avec hero image (déjà OK).
**Manque** : auteur (médecin) avec photo HD en bas de l'article + bio courte. Renforce l'autorité éditoriale.

**Effort** : 1h code (lit `doctors.photoUrl` + bio existant).

### `/api-docs`, `/comparer`, `/tarifs`

**Actuel** : pages text-only.
**Optionnel** : ajouter une photo HD en hero pour casser le mur de texte.

## Synthèse effort + ROI

| Section | Effort code | Effort sourcing | ROI confiance |
|---|---|---|---|
| Hero photo HD | 30 min | 2-4h shoot ou stock | ★★★★★ |
| "Comment ça marche" 3 photos | 30 min | 1h | ★★★★ |
| "Pourquoi Doktori" 3 mini-photos | 30 min | 1h | ★★★ |
| Témoignages patients (nouveau) | 1h | 5h | ★★★★ |
| Engagement médecin (nouveau) | 1h | 8h | ★★★ |
| Galerie cabinet `/medecin/[slug]` | 3h + migration | dépend des médecins | ★★★ |
| Hero `/sos` | 30 min | 30 min | ★★ |
| Author footer `/blog/[slug]` | 1h | 0 (réutilise photoUrl) | ★★ |

**Total prio 1-3 (homepage)** : ~3h code + ~6h sourcing → impact visible immédiat sur taux de confiance.

## Sourcing photos — options

### Option A — Shoot original (recommandé pour Tunisie)
- Photographe Tunis : 500-1500 TND/séance
- Avec un médecin partenaire de Doktori, en conditions réelles dans son cabinet
- Avantage : authentique tunisien, médecin reconnaissable comme local
- Inconvénient : effort coordination + budget + droit à l'image (signature)

### Option B — Banques d'images stock
- Unsplash (gratuit, licence permissive) : `medical consultation tunisia` — peu de résultats locaux mais bons portraits internationaux
- Pexels : idem
- AdobeStock : 25-50 €/photo, plus large catalogue
- Avantage : rapide, budget faible
- Inconvénient : risque "site générique" (autres sites utilisent les mêmes photos)

### Option C — IA générative (Midjourney / Flux)
- Génération de portraits médicaux personnalisés
- Avantage : original, droit total, contrôle sur l'apparence (médecin tunisien spécifique)
- Inconvénient : risque "uncanny valley", pas authentique, à mentionner légalement (UE AI Act 2024)

## Recommandation séquence

1. **Court terme (cette semaine)** :
   - Sourcer 1 photo hero HD (option B stock pour démarrer rapidement, swap pour option A plus tard)
   - Sourcer 3 photos "Comment ça marche" (stock)
   - Implémenter sections — 1h code total
   - Déployer v1.7.0

2. **Moyen terme (ce mois)** :
   - Démarche médecins pilotes pour témoignages + photos cabinet
   - Collecte 3-5 photos médecin originales (option A)
   - Build galerie cabinet sur `/medecin/[slug]`

3. **Long terme** :
   - Système d'upload photos cabinet par les médecins eux-mêmes (back-office /medecin/profil)
   - Modération admin avant publication
   - Témoignages patients réguliers (1/mois ?)

## Action immédiate possible (autonome)

Je peux **maintenant** :
1. Ajouter les zones d'image avec `<Image src="/images/placeholder-hero.webp" />` dans le code → tu uploades les vraies photos via R2 quand tu les as
2. Créer un upload admin `/admin/parametres/visuels` pour uploader hero + 3 "comment ça marche" sans toucher au code
3. Câbler tout sur des `platform_settings` keys (`homepage.hero_image_url`, etc.)

Approche **(2)** est la plus pérenne — l'admin pourra changer les visuels sans redeploy.

**Veux-tu que je code l'approche (2) ?** Effort estimé : ~3h subagent.
