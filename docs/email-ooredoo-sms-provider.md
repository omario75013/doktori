# Email — Demande de partenariat SMS Pro Ooredoo

> Mail prêt à envoyer. Personnaliser les **[CHAMPS À COMPLÉTER]** avant envoi.

---

## Destinataires suggérés

**Contacts officiels Ooredoo Tunisia Business** (vérifiés sur ooredoo.tn) :

| Canal | Coordonnée | Notes |
|---|---|---|
| 📧 Email général | `contact@ooredoo.tn` | Seul email B2B officiel listé sur ooredoo.tn |
| 📞 Téléphone Business | **+216 22 11 11 44** (raccourci `1144`) | 7j/7 · 8h-22h — **À appeler en premier** pour obtenir le contact direct d'un commercial SMS Pro |
| 📞 Service client | +216 22 11 11 11 (`1111`) | Backup général |
| 📝 Formulaire | https://www.ooredoo.tn/Business/fr/nous-contacter | Section "Demande d'information" — soumettre en parallèle pour tracer |
| 🏢 Siège | Immeuble Zenith, Les Jardins du Lac, 1053 — Les Berges du Lac, Tunis | — |

**Stratégie recommandée** :
1. **Appeler le 1144 d'abord** pour obtenir le nom + email direct d'un commercial SMS Pro B2B
2. **Envoyer le mail nominativement** à ce commercial
3. **En parallèle**, soumettre le formulaire web pour traçabilité officielle

⚠️ Les adresses `entreprise@ooredoo.tn` et `business@ooredoo.tn` que j'avais initialement suggérées **ne sont pas listées publiquement** par Ooredoo Tunisia — à éviter (peuvent ne pas exister ou être mal routées).

---

## Objet

```
Demande de partenariat SMS transactionnel — Doktori.tn (plateforme de santé)
```

---

## Corps du mail

```
Madame, Monsieur,

Nous sommes Doktori (https://doktori.tn), la première plateforme tunisienne
de prise de rendez-vous médicaux en ligne, éditée par Random Walkers SUARL,
société unipersonnelle au capital de 1 400 TND, immatriculée au RNE 1625867B,
ayant son siège à Tunis.

Notre plateforme met en relation patients et médecins en Tunisie pour
faciliter l'accès aux soins. Nous comptons aujourd'hui :

  • 69 médecins inscrits sur la plateforme
  • Une couverture sur le Grand Tunis (Tunis, Ariana, La Marsa, Manouba)
    avec déploiement progressif sur les autres gouvernorats
  • Plus de 900 rendez-vous gérés et près de 900 avis patients vérifiés
  • Conformité RGPD et loi tunisienne 2004-63 sur la protection des
    données à caractère personnel

Dans le cadre du développement de notre service, nous souhaitons
établir un partenariat avec Ooredoo Tunisia pour l'envoi de SMS
transactionnels à nos utilisateurs (patients tunisiens).

USAGE PRÉVU
-----------
Nos SMS sont strictement transactionnels (non commerciaux) :

  1. Confirmations de rendez-vous médicaux
  2. Rappels SMS la veille du RDV (réduction du taux d'absentéisme)
  3. Codes de vérification OTP pour authentification patient
  4. Notifications d'annulation ou de modification de RDV
  5. Alertes SOS Médecin (consultation urgente non-vitale à domicile)

VOLUMES ESTIMÉS
---------------
  • Phase actuelle (2026 Q2) : ~3 000 à 5 000 SMS / mois
  • Projection 12 mois (2027 Q2) : 30 000 à 50 000 SMS / mois
  • Projection 24 mois : 100 000+ SMS / mois (en fonction de notre
    expansion sur les autres gouvernorats)

CARACTÉRISTIQUES SOUHAITÉES
---------------------------
  • API HTTP / REST pour intégration directe avec notre plateforme
    (Next.js + Node.js)
  • Sender ID alphanumérique dédié : "DOKTORI" (à valider avec vos
    services et l'INT)
  • Reporting en temps réel (statuts livré / non livré / échec) via
    webhook ou polling API
  • Support des SMS longs (concaténation transparente)
  • Compatibilité Unicode (UTF-8) pour SMS en arabe
  • Engagement de niveau de service (SLA) pour les SMS critiques (OTP)

DEMANDE
-------
Nous souhaiterions :

  1. Recevoir votre offre commerciale détaillée pour le SMS transactionnel
     (grille tarifaire en fonction du volume, frais d'activation, frais
     de sender ID dédié)
  2. La documentation technique de votre API SMS Pro
  3. Une démo / compte de test pour valider l'intégration avant
     contractualisation
  4. Le délai indicatif pour activation du sender ID DOKTORI

Nous sommes également ouverts à discuter d'un accompagnement plus large
incluant éventuellement la fibre Pro pour notre infrastructure et la
téléphonie d'entreprise.

Nous serions disponibles pour un échange téléphonique ou une rencontre
dans vos locaux à votre convenance, idéalement dans les deux prochaines
semaines.

Vous trouverez ci-joint une présentation succincte de Doktori.

Restant à votre entière disposition pour tout complément,
nous vous prions d'agréer, Madame, Monsieur, l'expression de nos
salutations distinguées.

Omar HARBI
Gérant unique
Random Walkers SUARL
Doktori.tn — La prise de rendez-vous médicaux en Tunisie

📧  contact@doktori.tn  |  [VOTRE EMAIL DIRECT]
📞  [VOTRE TÉLÉPHONE]
🌐  https://doktori.tn

—
Random Walkers SUARL
Société Unipersonnelle à Responsabilité Limitée au capital de 1 400 TND
Identifiant Unique (RNE) : 1625867B
Matricule fiscal : 1625867/B (assujetti à la TVA — code A)
N° de gestion interne : B01130082019
Siège social : Immeuble Babel, Bloc D, Montplaisir 1073, Bab Bhar, Tunis — Tunisie
Activité principale : Services aux entreprises (code 74) — consultations en informatique
Date de constitution : 07/06/2019 (publication 10/06/2019)
Gérant unique : Omar HARBI
```

---

## Pièce jointe à préparer

Une mini-présentation 1-2 pages PDF (ou PowerPoint) avec :

- Logo Doktori + tagline
- Le problème adressé (accès aux soins en Tunisie)
- Les chiffres clés (69 médecins, 900+ RDV, 4.8/5 satisfaction)
- Quelques screenshots :
  - Page d'accueil https://doktori.tn
  - Espace médecin (calendrier + dossier patient)
  - SOS Médecin (différenciateur)
- Roadmap 12-24 mois (couverture nationale, app mobile)
- Coordonnées société

Vous pouvez utiliser le `theme-factory` ou `frontend-design` pour générer un PDF propre rapidement.

---

## Points de négociation à anticiper

| Levier | Argument |
|---|---|
| **Volume engagé** | Proposer un engagement minimum mensuel (ex: 5 000 SMS/mois la première année) pour obtenir un meilleur tarif unitaire |
| **Multi-services** | Mentionner que vous êtes ouverts à grouper SMS + fibre + voix → meilleur tarif global |
| **Visibilité presse** | Doktori étant une plateforme à fort potentiel de visibilité, proposer un cas client / témoignage Ooredoo en échange de tarifs préférentiels |
| **Tarifs comparatifs** | Mentionner avoir aussi consulté Tunisie Telecom et Orange Tunisia pour mettre en concurrence (sans donner les chiffres) |
| **Sender ID gratuit** | Demander que le sender ID DOKTORI soit inclus sans frais récurrents (tarif d'activation OK) |

## Tarifs SMS Pro Tunisie — ordres de grandeur publics

À titre indicatif (à confirmer avec leur grille officielle) :

- SMS unitaire B2B Tunisie : **0,025 à 0,070 TND** selon volume
- Activation sender ID alphanumérique : **300 à 1 000 TND** une fois
- Frais de mise en service API : **0 à 500 TND**
- Engagement minimum : souvent demandé pour obtenir le tarif dégressif

Au volume Doktori actuel (3-5k SMS/mois × 0,05 TND), c'est un budget mensuel
**~150-250 TND** soit ~50-80 € — totalement gérable. À 50k SMS/mois,
ça passe à 1 500-3 500 TND/mois, donc négocier le tarif dégressif est important.

## Étapes ensuite

1. **Aujourd'hui** : envoyer le mail (avec PJ présentation)
2. **J+2** : appeler le 50 110 110 si pas de retour
3. **J+5** : relance email cordiale
4. **J+10** : si toujours pas de retour, contacter Tunisie Telecom (`pro.tunisietelecom.tn/entreprises/`) et Orange Business (`business.orange.tn`) pour mettre en concurrence
5. **Après devis reçus** : choisir et signer

## Backup providers à comparer

Si Ooredoo n'est pas réactif ou trop cher :

- **Tunisie Telecom Pro** — `pro@tunisietelecom.tn`
- **Orange Business Tunisia** — via le portail business.orange.tn
- **InfoBip** (international, bureaux Tunisie) — `sales-tn@infobip.com`
  Excellent SLA OTP, plus cher en unitaire mais API beaucoup plus pro
- **Twilio** (USA, fonctionne en Tunisie) — sales@twilio.com
  Cher en unitaire mais imbattable pour les OTP critiques + delivery
- **MessageBird / Bird** — bird.com — alternative européenne

Pour les **OTP critiques** (sécurité), avoir un fournisseur secondaire
(InfoBip ou Twilio) en fallback est recommandé même si Ooredoo couvre
les SMS de masse.
