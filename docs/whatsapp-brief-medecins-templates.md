# Message WhatsApp — Annonce feature Templates aux médecins Doktori

> Texte prêt à copier-coller. Personnalisez l'introduction selon votre relation avec chaque médecin (tutoiement / vouvoiement, prénom, etc.).

---

## Version courte (groupe WhatsApp)

```
🩺 Bonjour à toutes et à tous,

Doktori vient de lancer 2 nouveautés sur votre espace médecin :

📋 Modèles d'ordonnance avec variables auto-remplies
   • Créez vos modèles types une fois, réutilisez-les en 1 clic
   • 24 variables disponibles : {{first_name}}, {{age}}, {{weight}}, {{today_long}}, etc.
   • 10 modèles officiels pré-fournis (antibio, bilans, certificats, AINS, IPP)
   • Plus à découvrir dans Espace médecin → Cabinet → Modèles d'ordonnance

🔍 Recherche avancée patients (13 critères)
   • Recherche dans le contenu des dossiers médicaux (notes consult + ordonnances)
   • Filtres : email, CIN, CNAM, sexe, groupe sanguin, assurance, profession,
     âge (range), nombre de visites, date dernière visite
   • Export CSV de la liste filtrée
   • Disponible dans Mes patients → bouton Filtres

Lien direct : https://doktori.tn/modeles

⚠️ Rappel : les modèles sont des aides à la rédaction. Vous restez seul
responsable de la prescription que vous signez (art. 35 Code déontologie).

Une question ? Répondez ici ou contact@doktori.tn 🙏
```

---

## Version longue (DM individuel pour pilotes)

```
Bonjour Dr [NOM],

Suite à notre échange, je suis ravi de vous annoncer que la nouvelle
fonctionnalité dont nous avions parlé est désormais disponible sur Doktori :

🎯 Modèles d'ordonnance avec variables auto-remplies

Vous gagnerez du temps sur les ordonnances répétitives : antibio standards,
bilans biologiques, certificats médicaux, etc.

Concrètement :
1. Allez sur https://doktori.tn/modeles
2. Cliquez sur "Dupliquer" sur un des 10 modèles officiels OU
   sur "+ Nouveau modèle" pour créer le vôtre
3. Utilisez les variables {{first_name}}, {{age}}, {{weight}},
   {{today_long}}, {{doctor_name}}, etc. — elles se rempliront
   automatiquement avec les données du patient
4. Au moment de prescrire (fiche patient → Nouvelle ordonnance),
   cliquez sur "📋 Choisir un modèle" pour insérer en 1 clic

Bonus : recherche avancée dans la liste de vos patients avec 13 filtres
+ recherche dans le contenu des dossiers médicaux (notes & ordonnances).

⚠️ Rappel important : les modèles sont des aides à la rédaction.
Vous restez juridiquement et médicalement responsable de la prescription
que vous signez (art. 35 du Code de déontologie médicale tunisien).

Je serais ravi d'avoir votre retour sur cette feature après quelques jours
d'utilisation. N'hésitez pas à me partager vos modèles favoris ou
les variables qui vous manquent.

Bien à vous,
[Votre nom]

📞 [Votre téléphone] | ✉️ contact@doktori.tn
```

---

## Image cover suggérée (à joindre)

Capture d'écran de :
- L'éditeur de modèle avec une variable `{{first_name}}` colorée en cyan
- OU un avant/après : "Avant — saisi à la main" vs "Après — modèle + 1 clic"

Vous pouvez la générer en allant sur `/modeles/nouveau` connecté en tant que
médecin et en faisant un screenshot 1280×720.

---

## Audience cible

- 69 médecins actuellement sur Doktori (toutes spécialités)
- Recommandation : envoyer en 2 vagues
  - **Vague 1 (3-5 pilotes)** — médecins actifs avec ≥ 10 RDV ce mois,
    DM individuel, demande de feedback
  - **Vague 2 (reste)** — message groupe 48h plus tard, après ajustements
    éventuels suite aux feedbacks pilotes

## Métriques à suivre côté Monitor.dartank.com

```sql
-- Templates créés par médecin
SELECT d.full_name,
       COUNT(t.id) FILTER (WHERE t.is_official = false) AS persos,
       SUM(t.apply_count) AS applications
FROM doctors d
LEFT JOIN prescription_templates t ON t.doctor_id = d.id AND t.deleted_at IS NULL
GROUP BY d.id
ORDER BY applications DESC NULLS LAST
LIMIT 20;

-- % d'ordonnances utilisant un template (cible ≥ 30% en M3)
SELECT
  COUNT(*) FILTER (WHERE template_id IS NOT NULL)::float / NULLIF(COUNT(*), 0) * 100 AS pct_with_template
FROM prescriptions
WHERE created_at >= now() - interval '30 days';

-- Templates officiels les plus utilisés
SELECT title, apply_count, clone_count
FROM prescription_templates
WHERE is_official = true AND deleted_at IS NULL
ORDER BY apply_count DESC;
```
