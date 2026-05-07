# Intégration CNAM / CNSS — V1

> Statut : V1 livrée — génération PDF Bulletin de Soins (BS1) + suivi
> manuel du cycle de vie. **Pas de transmission automatique** vers la
> CNAM. À reprendre lorsque l'API SEED CNAM sera ouverte aux logiciels
> privés (planifié 2027 d'après *La Presse*, janvier 2026).

## 1. État actuel — V1 (PDF only)

Doktori permet aujourd'hui :

1. **Stocker** les matricules d'assurance maladie sur la fiche patient :
   - `patients.cnam_number` — N° CNAM (ex. `12-345678-90`).
   - `patients.cnss_number` — N° CNSS / CNRPS si distinct.
   - `patients.cnam_regime` — `cnss` | `cnrps` | `convention_etudiant` |
     `convention_alaaliyah` | `none`.

2. **Générer un BS1 pré-rempli** au format PDF, signé par le médecin
   après vérification, puis transmis à la CNAM par voie traditionnelle :
   - impression + cachet + remise au patient ;
   - **ou** dépôt manuel via le portail e-CNAM.

3. **Suivre le cycle de vie du BS** sur la ligne du rendez-vous :
   - `bs_status` : `not_generated` → `generated` → `sent_to_cnam` →
     `reimbursed` (ou `rejected`).
   - Horodatages : `bs_generated_at`, `bs_sent_at`, `bs_reimbursed_at`.
   - Motif de rejet : `bs_rejection_reason`.

### Ce que la V1 ne fait PAS

- **Pas d'envoi automatique** au système CNAM. L'API SEED (Système d'Échange
  Électronique de Données) n'est pas accessible aux logiciels privés. Seules
  les pharmacies (Charguia / Bab Saadoun) et certaines cliniques agréées
  disposent d'une intégration directe.
- **Pas de validation côté CNAM** avant envoi : le médecin doit vérifier
  manuellement le conventionnement, le code CNOM et la cohérence du
  matricule.
- **Pas de gestion automatique du tiers payant** : le BS est un document de
  remboursement *a posteriori*, pas un préavis temps réel.
- **Pas d'arabe sur le PDF** : V1 français uniquement (limitation pdf-lib +
  StandardFonts WinAnsi). Bilingue prévu lors de l'intégration SEED.

## 2. Workflow médecin — étape par étape

### A. Avant la consultation

1. Ouvrir la fiche patient → **Modifier la fiche**.
2. Renseigner les champs de la section *Assurance* :
   - **N° CNAM** — matricule avec ou sans tirets.
   - **N° CNSS** — si différent du CNAM.
   - **Régime CNAM** — choisir parmi CNSS / CNRPS / Convention étudiant /
     Convention Al Aaliyah / non précisé.

> Si le patient ne connaît pas son numéro, laisser vide. Le PDF affichera
> une zone pointillée à compléter à la main.

### B. Pendant / juste après la consultation

1. Ouvrir le rendez-vous → page **Consultation**.
2. Saisir au moins le motif (`reason`) — il sera utilisé comme diagnostic
   sur le BS.
3. Faire défiler jusqu'au panneau **Bulletin de Soins CNAM**.
4. Cliquer **Générer Bulletin de Soins** :
   - Si le N° CNAM manque, une bannière jaune propose de l'ajouter
     directement (sauvegarde inline sur le row patient).
   - Le PDF est uploadé sur R2, l'URL est attachée à `appointments.bs_pdf_url`,
     et `bs_status` passe à `generated`.
5. Cliquer **Voir BS PDF** pour ouvrir le document, vérifier les
   informations, **signer + cacheter** (impression ou tablette).

### C. Transmission à la CNAM

La V1 ne transmet pas. Le médecin choisit :

- **Voie papier** : impression du PDF, signature, cachet, remise au patient
  qui dépose son dossier en agence CNAM.
- **Voie e-CNAM** : connexion sur [www.cnam.nat.tn/eCnam](https://www.cnam.nat.tn/eCnam),
  upload du PDF dans le formulaire dédié.

Une fois transmis, cliquer **Marquer comme → Envoyé à la CNAM** sur le
panneau BS. Cela horodate `bs_sent_at` et fait passer le statut au bleu.

### D. Suite du remboursement

- À réception du virement / décompte CNAM : **Marquer comme → Remboursé**
  (`bs_reimbursed_at`, statut vert).
- En cas de refus : **Marquer comme → Rejeté**, saisir le motif (statut
  rouge). Le motif est stocké sur la ligne du rendez-vous pour référence
  future.

> **Régénération** : le bouton *Régénérer* écrase le PDF (même clé R2),
> remet `bs_status` à `generated` et efface `bs_sent_at` /
> `bs_reimbursed_at`. Utile si la fiche patient a été corrigée après une
> première génération.

## 3. Limitations connues

| Limitation | Impact | Mitigation V1 |
|---|---|---|
| Pas de validation CNAM avant envoi | Risque de rejet pour matricule invalide ou conventionnement expiré | Le médecin doit vérifier visuellement avant de signer |
| Pas de gestion du code CNOM ni du conventionnement sur la fiche médecin | Champs laissés vides sur le PDF | Le médecin les écrit à la main ; à ajouter au modèle `doctors` lors de la V2 SEED |
| Pas de support arabe | PDF français uniquement | Le formulaire officiel CNAM accepte le bilingue ; l'arabe sera ajouté via TTF embarquée lors de la V2 |
| Pas de regroupement multi-actes | Un BS par RDV uniquement | Le BS officiel accepte plusieurs lignes ; pour V1 on simplifie (un acte = consultation) |
| Pas de signature électronique | Le PDF doit être imprimé puis signé | Signature numérique CNAM nécessite SEED + certificat ANCE |
| Pas de relance automatique | Si la CNAM tarde à rembourser, aucune notification | Le médecin filtre manuellement les `bs_status = 'sent_to_cnam'` anciens |

## 4. Migration future — V2 SEED API

Lorsque l'API SEED sera ouverte (planifié 2027) :

1. Ajouter à `doctors` les colonnes `cnom_code`, `cnam_convention_code`,
   `seed_certificate_id`.
2. Implémenter un `POST /api/medecin/appointments/[id]/bs/transmit` qui
   appelle SEED après génération PDF — le PDF reste utile comme preuve.
3. Ajouter une nouvelle valeur `bs_status = 'awaiting_cnam_response'`
   entre `sent_to_cnam` et `reimbursed`/`rejected` pour refléter l'attente
   asynchrone.
4. Étendre le PDF en bilingue FR/AR via une TTF embarquée (Noto Sans
   Arabic), supporter plusieurs lignes d'actes.
5. Logger les transmissions SEED dans une nouvelle table
   `cnam_seed_transmissions` (audit trail réglementaire).

Tant que SEED reste fermé, V1 couvre le besoin métier essentiel :
**éviter au médecin de remplir le BS à la main pour chaque consultation**.

## 5. Schéma technique

```
patients
  cnam_number   VARCHAR(30)
  cnss_number   VARCHAR(30)
  cnam_regime   VARCHAR(30)  DEFAULT 'none'

appointments
  bs_pdf_url            TEXT
  bs_status             VARCHAR(30) DEFAULT 'not_generated'
  bs_generated_at       TIMESTAMPTZ
  bs_sent_at            TIMESTAMPTZ
  bs_reimbursed_at      TIMESTAMPTZ
  bs_rejection_reason   TEXT
```

Migrations : `0089_patient_cnam_fields.sql`, `0090_appointment_bs_tracking.sql`.

API :
- `POST   /api/medecin/appointments/[id]/bs` — générer (réécrit si déjà existant).
- `GET    /api/medecin/appointments/[id]/bs` — état actuel + URL.
- `PATCH  /api/medecin/appointments/[id]/bs` — mettre à jour le statut.

Générateur PDF : `apps/web/lib/cnam-bs-generator.ts` (pdf-lib).

Stockage : R2 sous la clé `bs/{appointmentId}.pdf` (en dev, écrit dans
`apps/web/public/uploads/doktori/bs/`).
