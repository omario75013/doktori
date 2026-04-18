-- Migration: 0046_blog_seed_articles.sql
-- Seed 8 professional medical blog articles for Doktori.tn
-- All content in French, targeting Tunisian patients

-- Article 1: Guide — Les 10 spécialités médicales les plus consultées en Tunisie
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'specialites-medicales-les-plus-consultees-tunisie',
  'Les 10 spécialités médicales les plus consultées en Tunisie',
  'Découvrez quelles sont les spécialités médicales les plus demandées en Tunisie, quand consulter chaque spécialiste et comment préparer votre rendez-vous.',
  '<h2>Introduction</h2>
<p>En Tunisie, le recours aux soins spécialisés a fortement augmenté ces dernières années, porté par une meilleure couverture de la CNAM et le développement des plateformes de prise de rendez-vous en ligne comme <strong>Doktori</strong>. Mais face à l''abondance de spécialités, il n''est pas toujours évident de savoir vers quel médecin se tourner.</p>
<p>Voici un tour d''horizon des 10 spécialités médicales les plus consultées en Tunisie, avec les signes qui doivent vous conduire à prendre rendez-vous.</p>

<h2>1. Médecine générale</h2>
<p>Le médecin généraliste reste la porte d''entrée du système de soins. Il gère les maladies courantes (grippe, angine, gastro-entérite), assure le suivi des maladies chroniques (diabète, hypertension) et oriente vers les spécialistes. <strong>En Tunisie, il est souvent le médecin de famille que l''on consulte en premier.</strong></p>
<p><em>Quand consulter :</em> fièvre, douleurs inexpliquées, renouvellement d''ordonnance, bilan de santé annuel.</p>

<h2>2. Cardiologie</h2>
<p>Les maladies cardiovasculaires sont la première cause de mortalité en Tunisie. Le cardiologue prend en charge l''hypertension artérielle, les troubles du rythme cardiaque, l''insuffisance cardiaque et réalise des examens comme l''électrocardiogramme (ECG) ou l''échocardiographie.</p>
<p><em>Quand consulter :</em> douleur dans la poitrine, essoufflement, palpitations, tension artérielle élevée, antécédents familiaux cardiaques.</p>

<h2>3. Dermatologie</h2>
<p>Le dermatologue est très sollicité en Tunisie, notamment en raison de l''ensoleillement intense et des problèmes d''acné chez les jeunes. Il traite les maladies de la peau (psoriasis, eczéma, urticaire), les infections cutanées, la chute de cheveux et les lésions suspectes.</p>
<p><em>Quand consulter :</em> boutons persistants, taches sur la peau, chute de cheveux anormale, démangeaisons chroniques.</p>

<h2>4. Gynécologie-Obstétrique</h2>
<p>La gynécologue accompagne la femme à toutes les étapes de sa vie : suivi gynécologique annuel, contraception, grossesse, ménopause. En Tunisie, le suivi de grossesse est bien structuré avec des visites mensuelles recommandées dès le premier trimestre.</p>
<p><em>Quand consulter :</em> douleurs pelviennes, irrégularités menstruelles, suivi de grossesse, dépistage du cancer du col de l''utérus (frottis).</p>

<h2>5. Pédiatrie</h2>
<p>Le pédiatre est le médecin de l''enfant de la naissance à l''adolescence. Il assure le suivi de la croissance, les vaccinations du calendrier national, et prend en charge les maladies infantiles. En Tunisie, les parents sont très vigilants sur la santé de leurs enfants, ce qui explique la forte demande.</p>
<p><em>Quand consulter :</em> fièvre chez le nourrisson, retard de croissance, suivi vaccinal, troubles du comportement.</p>

<h2>6. Ophtalmologie</h2>
<p>Les troubles visuels touchent une part importante de la population tunisienne, amplifiés par l''usage massif des écrans. L''ophtalmologue réalise des bilans visuels, prescrit des lunettes ou lentilles, et traite les maladies oculaires comme le glaucome ou la cataracte.</p>
<p><em>Quand consulter :</em> baisse de la vision, maux de tête liés aux écrans, yeux rouges persistants, contrôle annuel après 40 ans.</p>

<h2>7. Orthopédie — Traumatologie</h2>
<p>L''orthopédiste traite les affections de l''appareil locomoteur : fractures, entorses, tendinites, douleurs articulaires et pathologies de la colonne vertébrale. La lombalgie (douleur du dos) est l''une des plaintes les plus fréquentes en Tunisie.</p>
<p><em>Quand consulter :</em> douleur chronique du dos ou des articulations, traumatisme sportif, hernie discale, arthrose.</p>

<h2>8. Endocrinologie</h2>
<p>Le diabète et les maladies thyroïdiennes sont très répandus en Tunisie. L''endocrinologue prend en charge le diabète de type 1 et 2, les troubles de la thyroïde, l''obésité et les déséquilibres hormonaux.</p>
<p><em>Quand consulter :</em> glycémie élevée, fatigue inexpliquée, prise ou perte de poids rapide, nodule thyroïdien.</p>

<h2>9. Gastro-entérologie</h2>
<p>Les troubles digestifs sont extrêmement fréquents. Le gastro-entérologue diagnostique et traite les maladies de l''appareil digestif : gastrite, reflux gastro-œsophagien, syndrome du côlon irritable, hépatites virales (B et C, encore présentes en Tunisie).</p>
<p><em>Quand consulter :</em> douleurs abdominales récurrentes, brûlures d''estomac, troubles du transit, jaunisse.</p>

<h2>10. Psychiatrie — Santé mentale</h2>
<p>La demande en santé mentale a explosé ces dernières années en Tunisie, surtout après la pandémie de COVID-19. Le psychiatre prend en charge la dépression, l''anxiété généralisée, les troubles bipolaires et les addictions. La stigmatisation recule progressivement, et de plus en plus de Tunisiens franchissent le pas.</p>
<p><em>Quand consulter :</em> tristesse persistante, anxiété invalidante, troubles du sommeil chroniques, pensées envahissantes.</p>

<h2>Conclusion</h2>
<p>Quel que soit votre besoin, <strong>Doktori</strong> vous permet de trouver rapidement le bon spécialiste près de chez vous en Tunisie et de réserver votre créneau en ligne en moins d''une minute. N''attendez pas que votre état s''aggrave — consulter tôt, c''est soigner mieux.</p>',
  'Dr. Équipe Doktori',
  'guide',
  '["spécialités", "médecin", "cardiologie", "dermatologie", "tunisie"]',
  true,
  '2026-04-01 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 2: Santé — Comment bien préparer sa consultation médicale
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'comment-preparer-consultation-medicale',
  'Comment bien préparer sa consultation médicale',
  'Conseils pratiques pour optimiser votre rendez-vous médical : documents à apporter, questions à poser, et comment décrire vos symptômes efficacement.',
  '<h2>Pourquoi préparer sa consultation ?</h2>
<p>Une consultation médicale dure en moyenne 15 à 20 minutes en Tunisie. C''est court. Pourtant, c''est dans ce laps de temps que votre médecin doit comprendre votre problème, poser un diagnostic et élaborer un plan de traitement. Arriver préparé vous permettra d''en tirer le maximum — et de repartir avec des réponses claires.</p>

<h2>1. Rassemblez vos documents médicaux</h2>
<p>Avant votre rendez-vous, constituez un petit dossier avec :</p>
<ul>
  <li>Votre <strong>carte CNAM</strong> ou votre attestation d''assurance maladie complémentaire</li>
  <li>Les <strong>résultats d''analyses biologiques</strong> récents (prise de sang, analyse d''urine…)</li>
  <li>Les <strong>comptes-rendus</strong> de consultations ou d''hospitalisations précédentes</li>
  <li>Les <strong>ordonnances en cours</strong> — ou mieux, apportez tous vos médicaments dans un sac</li>
  <li>Les <strong>résultats d''imagerie</strong> : radiographies, échographies, scanners (sur CD ou imprimés)</li>
</ul>
<p>Si vous consultez pour la première fois, notez vos antécédents médicaux et chirurgicaux, ainsi que les maladies chroniques dans votre famille (diabète, hypertension, cancers).</p>

<h2>2. Décrivez vos symptômes avec précision</h2>
<p>Le médecin a besoin d''informations précises pour diagnostiquer correctement. Pour chaque symptôme, préparez-vous à répondre à :</p>
<ul>
  <li><strong>Quand ça a commencé ?</strong> — hier, il y a une semaine, depuis 3 mois ?</li>
  <li><strong>Où exactement ?</strong> — localisez la douleur, montrez-la si possible</li>
  <li><strong>Comment ça se manifeste ?</strong> — douleur lancinante, brûlure, pression, picotements ?</li>
  <li><strong>Est-ce que ça empire ou s''améliore ?</strong> — à quel moment de la journée ?</li>
  <li><strong>Qu''est-ce qui soulage ou aggrave ?</strong> — position, nourriture, effort, médicament ?</li>
  <li><strong>Y a-t-il d''autres signes associés ?</strong> — fièvre, nausées, fatigue, perte d''appétit ?</li>
</ul>
<p>Plus votre description est précise, plus le diagnostic sera rapide et fiable.</p>

<h2>3. Préparez vos questions à l''avance</h2>
<p>C''est souvent en sortant du cabinet que les questions nous viennent à l''esprit — et c''est trop tard. Notez vos questions sur votre téléphone avant le rendez-vous. Par exemple :</p>
<ul>
  <li>Quel est exactement mon diagnostic ?</li>
  <li>Quels examens complémentaires sont nécessaires ?</li>
  <li>Ce médicament a-t-il des effets secondaires importants ?</li>
  <li>Dois-je changer mon alimentation ou mon activité physique ?</li>
  <li>Quand dois-je revenir vous voir ?</li>
  <li>À quels signes d''alerte dois-je faire attention ?</li>
</ul>

<h2>4. Soyez honnête avec votre médecin</h2>
<p>Le médecin est soumis au secret professionnel — tout ce que vous lui dites reste strictement confidentiel. N''omettez pas des informations par gêne ou par peur d''être jugé. Cela concerne notamment :</p>
<ul>
  <li>Votre consommation de tabac, d''alcool ou de substances</li>
  <li>Vos antécédents de maladies sexuellement transmissibles</li>
  <li>Les médicaments que vous prenez sans ordonnance (automédication)</li>
  <li>Les médecines traditionnelles ou complémentaires que vous utilisez</li>
</ul>
<p>Ces informations peuvent changer complètement le diagnostic ou le traitement prescrit.</p>

<h2>5. Notez les instructions du médecin</h2>
<p>Pendant la consultation, prenez des notes ou demandez au médecin de vous remettre les informations par écrit. Les études montrent que les patients oublient jusqu''à 80 % de ce que leur médecin leur dit dans les 10 minutes qui suivent la consultation. Si vous avez du mal à comprendre, dites-le — un bon médecin reformulera sans hésiter.</p>

<h2>6. Pour les consultations de suivi</h2>
<p>Si vous revenez pour un suivi, préparez un <strong>bilan de votre état depuis la dernière visite</strong> :</p>
<ul>
  <li>Avez-vous pris les médicaments prescrits ? Ont-ils eu des effets ?</li>
  <li>Avez-vous noté des effets secondaires ?</li>
  <li>Y a-t-il eu des événements nouveaux (chute, douleur nouvelle, hospitalisation) ?</li>
  <li>Avez-vous respecté les recommandations (régime, arrêt du tabac, activité physique) ?</li>
</ul>

<h2>Conclusion</h2>
<p>Une consultation bien préparée est une consultation efficace. Votre médecin pourra vous consacrer davantage de temps à l''écoute et à l''explication, plutôt qu''à reconstituer votre historique médical. Et n''oubliez pas : vous pouvez facilement prendre votre prochain rendez-vous sur <strong>Doktori</strong>, 24h/24, sans attendre au téléphone.</p>',
  'Dr. Équipe Doktori',
  'sante',
  '["consultation", "médecin", "préparation", "patient", "conseils"]',
  true,
  '2026-04-04 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 3: Conseil — Téléconsultation en Tunisie
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'teleconsultation-tunisie-tout-savoir-2026',
  'Téléconsultation en Tunisie : tout ce qu''il faut savoir en 2026',
  'Comment fonctionne la téléconsultation médicale en Tunisie ? Avantages, limites, remboursement CNAM et étapes pour consulter un médecin en ligne.',
  '<h2>La téléconsultation, qu''est-ce que c''est ?</h2>
<p>La <strong>téléconsultation</strong> est une consultation médicale réalisée à distance, par vidéo, entre un patient et un médecin. Elle se déroule exactement comme une consultation classique, mais depuis votre domicile, votre bureau ou n''importe où disposant d''une connexion internet. En 2026, la téléconsultation est désormais une réalité bien établie en Tunisie.</p>

<h2>Comment ça fonctionne concrètement ?</h2>
<p>Sur <strong>Doktori</strong>, réserver une téléconsultation est aussi simple que de réserver une consultation en cabinet :</p>
<ol>
  <li>Recherchez un médecin proposant la téléconsultation</li>
  <li>Sélectionnez un créneau "téléconsultation"</li>
  <li>Renseignez vos symptômes via un formulaire court</li>
  <li>À l''heure du rendez-vous, connectez-vous via le lien envoyé par SMS ou email</li>
  <li>La vidéo s''ouvre directement — aucune installation requise</li>
  <li>Le médecin vous envoie l''ordonnance numérique ou par email à la fin</li>
</ol>

<h2>Quels sont les avantages de la téléconsultation ?</h2>
<ul>
  <li><strong>Gain de temps</strong> : plus besoin de se déplacer ni d''attendre dans une salle d''attente</li>
  <li><strong>Accessibilité</strong> : idéal pour les patients des zones rurales ou éloignées des grandes villes (Sfax, Sousse, Gabès, Gafsa…)</li>
  <li><strong>Disponibilité étendue</strong> : certains médecins proposent des créneaux le soir ou le week-end</li>
  <li><strong>Suivi facilité</strong> : pour les maladies chroniques (diabète, hypertension), le médecin peut faire un point rapide sans mobiliser une consultation en cabinet</li>
  <li><strong>Moins de risques de contagion</strong> : parfait en cas de grippe, COVID ou autres maladies infectieuses</li>
  <li><strong>Confidentialité</strong> : consulter depuis chez soi pour des sujets sensibles (santé mentale, IST…)</li>
</ul>

<h2>Pour quels problèmes la téléconsultation est-elle adaptée ?</h2>
<p>La téléconsultation est parfaitement adaptée pour :</p>
<ul>
  <li>Les infections bénignes : rhume, angine, sinusite, cystite</li>
  <li>Le renouvellement d''ordonnances pour maladies chroniques</li>
  <li>Les consultations de suivi post-opératoire légères</li>
  <li>L''interprétation de résultats d''analyses</li>
  <li>Les questions de santé mentale (anxiété, dépression légère)</li>
  <li>Les problèmes dermatologiques visibles (acné, rash cutané, plaie)</li>
  <li>Les conseils nutritionnels ou de prévention</li>
</ul>

<h2>Quand la téléconsultation ne suffit pas ?</h2>
<p>Certaines situations nécessitent impérativement une consultation physique :</p>
<ul>
  <li>Douleur thoracique ou suspicion d''infarctus — <strong>appelez le 190 (SAMU)</strong></li>
  <li>Traumatisme physique, fracture, plaie profonde</li>
  <li>Examen physique indispensable (auscultation, palpation abdominale)</li>
  <li>Nourrisson de moins de 3 mois avec fièvre</li>
  <li>Signes neurologiques aigus (paralysie faciale, trouble de la parole)</li>
  <li>Urgences psychiatriques</li>
</ul>
<p>En cas de doute, le médecin en téléconsultation vous orientera vers les soins appropriés.</p>

<h2>La téléconsultation est-elle remboursée par la CNAM ?</h2>
<p>En 2026, la CNAM (Caisse Nationale d''Assurance Maladie) travaille à l''intégration de la téléconsultation dans son dispositif de remboursement. Certains actes de télémédecine sont déjà pris en charge dans le cadre de conventions spécifiques. Renseignez-vous auprès de votre caisse régionale ou consultez votre mutuelle complémentaire, qui couvre souvent les consultations en ligne.</p>

<h2>Conseils pour une bonne téléconsultation</h2>
<ul>
  <li>Choisissez un endroit calme, bien éclairé et avec une bonne connexion internet</li>
  <li>Testez votre caméra et votre micro avant le rendez-vous</li>
  <li>Ayez vos documents médicaux à portée de main</li>
  <li>Préparez vos questions à l''avance — le temps est limité</li>
  <li>Si vous devez montrer une zone de la peau ou une blessure, prévoyez un bon éclairage</li>
</ul>

<h2>Conclusion</h2>
<p>La téléconsultation représente une avancée majeure pour l''accessibilité aux soins en Tunisie. Elle ne remplace pas le médecin — elle le rend plus accessible. Sur <strong>Doktori</strong>, vous pouvez trouver des médecins disponibles pour une téléconsultation dans les prochaines heures, depuis Tunis, Sfax, Sousse ou n''importe où en Tunisie.</p>',
  'Dr. Équipe Doktori',
  'conseil',
  '["téléconsultation", "médecine en ligne", "CNAM", "tunisie", "2026"]',
  true,
  '2026-04-07 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 4: Guide — Urgences médicales : SAMU vs SOS médecin
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'urgences-medicales-samu-190-sos-medecin-tunisie',
  'Urgences médicales : quand appeler le SAMU (190) et quand consulter SOS médecin',
  'Guide pratique pour savoir quoi faire face à une urgence médicale en Tunisie : différence entre le SAMU au 190 et le service SOS médecin à domicile.',
  '<h2>Face à une urgence médicale, chaque minute compte</h2>
<p>En situation d''urgence, prendre la bonne décision rapidement peut sauver une vie. En Tunisie, deux ressources principales s''offrent à vous selon la gravité de la situation : le <strong>SAMU (Service d''Aide Médicale Urgente)</strong> accessible au <strong>190</strong>, et les services de médecins à domicile comme <strong>SOS Médecin</strong>. Voici un guide clair pour ne pas vous tromper.</p>

<h2>Le 190 — SAMU : pour les urgences vitales</h2>
<p>Le <strong>190</strong> est le numéro national d''urgence médicale en Tunisie. Il est gratuit, disponible 24h/24 et 7j/7. Le SAMU mobilise des équipes médicales avec véhicules équipés (SMUR — Service Mobile d''Urgence et de Réanimation) pour les situations mettant la vie en danger.</p>

<h3>Appelez le 190 si vous observez :</h3>
<ul>
  <li><strong>Douleur thoracique intense</strong> — possible infarctus du myocarde</li>
  <li><strong>Difficultés respiratoires sévères</strong> — asthme grave, œdème pulmonaire</li>
  <li><strong>Perte de connaissance</strong> ou personne inconsciente qui ne répond pas</li>
  <li><strong>Paralysie brutale</strong> d''un membre, d''un côté du visage, trouble de la parole — signes d''AVC</li>
  <li><strong>Convulsions</strong> prolongées ou répétées</li>
  <li><strong>Hémorragie abondante</strong> incontrôlable</li>
  <li><strong>Accident de la voie publique</strong> avec blessés</li>
  <li><strong>Intoxication grave</strong> (médicaments, produits chimiques, monoxyde de carbone)</li>
  <li><strong>Tentative de suicide</strong> ou automutilation grave</li>
  <li><strong>Nourrisson en détresse respiratoire</strong> ou ne réagissant plus</li>
  <li><strong>Brûlures étendues</strong> (plus de 10 % de la surface corporelle)</li>
  <li><strong>Accouchement imminent</strong> hors maternité</li>
</ul>

<h3>Comment communiquer avec le SAMU au 190 ?</h3>
<p>Restez calme et donnez au régulateur :</p>
<ol>
  <li>Votre <strong>numéro de téléphone</strong> (il rappellera si la communication est coupée)</li>
  <li>L''<strong>adresse précise</strong> — rue, numéro, gouvernorat, point de repère visible</li>
  <li>La <strong>nature du problème</strong> — ce que vous observez</li>
  <li>Le <strong>nombre de personnes</strong> concernées</li>
  <li>L''<strong>état de conscience</strong> de la personne</li>
</ol>
<p><strong>Ne raccrochez pas en premier</strong> — suivez les instructions données par le médecin régulateur jusqu''à l''arrivée des secours.</p>

<h2>SOS Médecin à domicile : pour les urgences non vitales</h2>
<p>Le service <strong>SOS Médecin</strong> et les médecins de garde à domicile interviennent pour des situations urgentes mais ne mettant pas immédiatement la vie en danger. Le médecin se déplace à votre domicile, généralement dans un délai de 30 minutes à 1 heure.</p>

<h3>Faites appel à SOS Médecin pour :</h3>
<ul>
  <li><strong>Fièvre élevée</strong> chez l''adulte (39-40°C) ne répondant pas aux antipyrétiques</li>
  <li><strong>Fièvre chez l''enfant</strong> de moins de 3 ans résistant au traitement</li>
  <li><strong>Douleur abdominale intense</strong> sans signe de gravité immédiate</li>
  <li><strong>Otite, angine ou infection ORL</strong> douloureuse la nuit ou le week-end</li>
  <li><strong>Blessure, plaie</strong> nécessitant des points de suture mais sans hémorragie incontrôlable</li>
  <li><strong>Crise d''allergie</strong> modérée (sans atteinte respiratoire sévère)</li>
  <li><strong>Douleur dentaire violente</strong> hors horaires de cabinet</li>
  <li><strong>Perte de connaissance brève</strong> avec retour rapide à la normale (malaise vagal)</li>
  <li><strong>Cystite douloureuse</strong> chez la femme enceinte ou diabétique</li>
  <li><strong>Prescription urgente</strong> (renouvellement en cas de pénurie de médicament vital)</li>
</ul>

<h2>Tableau récapitulatif : 190 ou SOS Médecin ?</h2>
<p>Retenez cette règle simple :</p>
<ul>
  <li><strong>190 (SAMU)</strong> → Vie en danger, urgence vitale immédiate, état inconscient</li>
  <li><strong>SOS Médecin</strong> → Urgent mais stable, soins nécessaires dans l''heure</li>
  <li><strong>Doktori / Consultation en cabinet</strong> → Problème sérieux mais peut attendre quelques heures</li>
</ul>

<h2>Autres numéros d''urgence en Tunisie</h2>
<ul>
  <li><strong>190</strong> — SAMU (urgences médicales)</li>
  <li><strong>197</strong> — Police secours</li>
  <li><strong>198</strong> — Protection civile (pompiers)</li>
  <li><strong>193</strong> — Garde nationale</li>
  <li><strong>Centre antipoison Tunis</strong> : +216 71 578 902</li>
</ul>

<h2>Conclusion</h2>
<p>Connaître ces numéros et ces critères peut faire la différence entre une mauvaise frayeur et une catastrophe évitée. Enregistrez le <strong>190</strong> dans vos favoris et partagez ce guide avec vos proches. Et pour les consultations non urgentes, planifiez à l''avance avec <strong>Doktori</strong> — parce que la santé n''attend pas.</p>',
  'Dr. Équipe Doktori',
  'guide',
  '["urgences", "SAMU", "190", "SOS médecin", "tunisie", "premiers secours"]',
  true,
  '2026-04-10 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 5: Specialite — Dermatologie en Tunisie
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'dermatologie-tunisie-problemes-peau-frequents',
  'Dermatologie en Tunisie : les problèmes de peau les plus fréquents',
  'Acné, eczéma, psoriasis, taches solaires… Découvrez les affections cutanées les plus courantes en Tunisie et les conseils de nos dermatologues.',
  '<h2>La peau en Tunisie : un organe mis à rude épreuve</h2>
<p>Avec plus de 300 jours de soleil par an et des températures qui dépassent régulièrement 40°C en été, la peau des Tunisiens fait face à des défis climatiques importants. À cela s''ajoutent la pollution urbaine à Tunis, l''eau calcaire et des facteurs génétiques propres aux phototypes méditerranéens et maghrébins. Sans surprise, la dermatologie figure parmi les spécialités les plus consultées en Tunisie.</p>

<h2>1. L''acné : le problème numéro un chez les jeunes</h2>
<p>L''<strong>acné</strong> touche entre 70 et 80 % des adolescents tunisiens, et de plus en plus d''adultes — notamment les femmes entre 25 et 40 ans (acné hormonale). Les formes légères (points noirs, comédons) peuvent être traitées avec des soins adaptés, mais les formes modérées à sévères (pustules, nodules, kystes) nécessitent un suivi dermatologique.</p>
<p><em>Traitements courants :</em> rétinoïdes locaux, peroxyde de benzoyle, antibiotiques locaux ou oraux, et dans les cas sévères, l''isotrétinoïne (Roaccutane) sous surveillance médicale stricte.</p>
<p><strong>Conseil Doktori :</strong> N''attendez pas que l''acné laisse des cicatrices — consultez dès que les boutons persistent plus de 3 mois malgré un nettoyage régulier.</p>

<h2>2. Les taches et l''hyperpigmentation</h2>
<p>Le mélasma (taches brunes sur le visage, surtout chez la femme) est extrêmement fréquent en Tunisie, favorisé par l''exposition solaire intense et les changements hormonaux (grossesse, pilule contraceptive). Il se manifeste par des plaques brun-grisâtre symétriques sur le front, les pommettes et la lèvre supérieure.</p>
<p><em>Traitement :</em> crèmes dépigmentantes (acide kojique, niacinamide, hydroquinone sur prescription), protection solaire quotidienne indispensable (SPF 50+), et en dernier recours, peelings chimiques ou laser.</p>
<p><strong>Attention :</strong> de nombreux produits dépigmentants vendus sans ordonnance dans les souks contiennent des corticoïdes ou du mercure — consultez un dermatologue avant tout usage.</p>

<h2>3. L''eczéma (dermatite atopique)</h2>
<p>L''eczéma atopique touche environ 10 % des enfants tunisiens et persiste chez une partie des adultes. Il se caractérise par des plaques rouges, des démangeaisons intenses et une sécheresse cutanée chronique. Les facteurs déclenchants en Tunisie incluent la chaleur, la transpiration, l''eau de mer (paradoxalement irritante pour certains) et les acariens.</p>
<p><em>Traitement :</em> émollients quotidiens (crèmes hydratantes), corticoïdes locaux lors des poussées, et pour les formes sévères, des traitements biologiques modernes (dupilumab) sont désormais disponibles en Tunisie.</p>

<h2>4. Le psoriasis</h2>
<p>Le psoriasis est une maladie inflammatoire chronique de la peau qui touche 2 à 3 % de la population tunisienne. Il se manifeste par des plaques épaisses, rouges et recouvertes de squames blanches, le plus souvent sur les coudes, les genoux, le cuir chevelu et le bas du dos. Ce n''est <strong>pas contagieux</strong> — une idée reçue encore très répandue en Tunisie.</p>
<p><em>Traitement :</em> crèmes corticoïdes, analogues de la vitamine D, photothérapie, et pour les formes sévères, des biothérapies (anti-TNF, anti-IL17) accessibles dans les hôpitaux universitaires tunisiens.</p>

<h2>5. Les infections cutanées fongiques</h2>
<p>La chaleur et l''humidité tunisiennes favorisent les mycoses cutanées : pied d''athlète (tinea pedis) entre les orteils, teigne du cuir chevelu chez les enfants, intertrigo dans les plis, et pityriasis versicolor (taches décolorées sur le tronc). Ces infections sont très fréquentes et très contagieuses dans les piscines, hammams et vestiaires.</p>
<p><em>Traitement :</em> antifongiques locaux (clotrimazole, terbinafine) ou oraux selon l''étendue, et mesures d''hygiène adaptées.</p>

<h2>6. Cancer de la peau et lésions suspectes</h2>
<p>Bien que les phototypes sombres (III à VI), fréquents en Tunisie, offrent une protection naturelle contre les UV, le cancer de la peau existe et est diagnostiqué tardivement. La règle ABCDE permet de surveiller ses grains de beauté :</p>
<ul>
  <li><strong>A</strong>symmetrie — un côté différent de l''autre</li>
  <li><strong>B</strong>ords — irréguliers, flous ou découpés</li>
  <li><strong>C</strong>ouleur — inhomogène, mélange de brun, noir, rouge</li>
  <li><strong>D</strong>iamètre — supérieur à 6 mm</li>
  <li><strong>E</strong>volution — qui change de forme, de taille ou de couleur</li>
</ul>
<p>Consultez un dermatologue immédiatement si l''un de ces critères est présent.</p>

<h2>La protection solaire : un réflexe à adopter toute l''année</h2>
<p>En Tunisie, la protection solaire ne s''arrête pas à l''été. L''indice UV peut atteindre 8 à 10 même en mars ou en octobre. Les dermatologues tunisiens recommandent :</p>
<ul>
  <li>Un <strong>écran solaire SPF 50+</strong> toute l''année sur le visage</li>
  <li>La <strong>reapplication toutes les 2 heures</strong> en cas d''exposition prolongée</li>
  <li>Éviter l''exposition entre <strong>10h et 16h</strong> de mai à septembre</li>
  <li>Porter un <strong>chapeau et des vêtements couvrants</strong> lors des sorties prolongées</li>
</ul>

<h2>Conclusion</h2>
<p>La santé de votre peau mérite une attention particulière dans le contexte climatique tunisien. Si vous observez un symptôme cutané persistant, ne tardez pas à consulter un dermatologue. Sur <strong>Doktori</strong>, vous pouvez trouver un dermatologue disponible près de chez vous et réserver en ligne en quelques secondes.</p>',
  'Dr. Équipe Doktori',
  'specialite',
  '["dermatologie", "peau", "acné", "eczéma", "soleil", "tunisie"]',
  true,
  '2026-04-12 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 6: Conseil — Vaccination des enfants en Tunisie : calendrier 2026
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'vaccination-enfants-tunisie-calendrier-2026',
  'Vaccination des enfants en Tunisie : calendrier 2026 et conseils',
  'Calendrier vaccinal officiel en Tunisie pour 2026, vaccins obligatoires, recommandés et conseils pratiques pour les parents.',
  '<h2>La vaccination : un geste qui protège toute la communauté</h2>
<p>La vaccination est l''une des avancées médicales les plus efficaces de l''histoire. En Tunisie, le Programme National d''Immunisation (PNI), mis en place par le Ministère de la Santé, protège chaque année des milliers d''enfants contre des maladies graves. Grâce à ce programme, la poliomyélite a été éradiquée et des maladies comme la diphtérie ou la coqueluche sont devenues rarissimes.</p>
<p>Voici le calendrier vaccinal en vigueur en Tunisie pour 2026, avec des conseils pratiques pour chaque étape.</p>

<h2>À la naissance (maternité)</h2>
<ul>
  <li><strong>BCG</strong> (tuberculose) — vaccin intradermique administré dès les premières heures de vie. Il laisse une petite cicatrice sur le bras gauche. Obligatoire en Tunisie.</li>
  <li><strong>Hépatite B — 1ère dose</strong> — administrée dans les 24 premières heures, idéalement dans les 12 premières heures.</li>
</ul>

<h2>À 2 mois</h2>
<ul>
  <li><strong>Pentavalent (DTC-HepB-Hib)</strong> — 1ère dose : protège contre la diphtérie, le tétanos, la coqueluche, l''hépatite B et les infections à <em>Haemophilus influenzae</em> de type b (méningite bactérienne).</li>
  <li><strong>Vaccin antipoliomyélitique oral (VPO)</strong> — 1ère dose</li>
  <li><strong>Vaccin antipneumococcique (PCV13)</strong> — 1ère dose (protège contre 13 types de pneumocoques, responsables de pneumonies et méningites)</li>
  <li><strong>Rotavirus</strong> — 1ère dose (protège contre les gastro-entérites sévères du nourrisson)</li>
</ul>

<h2>À 4 mois</h2>
<ul>
  <li><strong>Pentavalent</strong> — 2ème dose</li>
  <li><strong>VPO</strong> — 2ème dose</li>
  <li><strong>PCV13</strong> — 2ème dose</li>
  <li><strong>Rotavirus</strong> — 2ème dose</li>
</ul>

<h2>À 6 mois</h2>
<ul>
  <li><strong>Pentavalent</strong> — 3ème dose</li>
  <li><strong>VPO</strong> — 3ème dose</li>
</ul>

<h2>À 12 mois</h2>
<ul>
  <li><strong>ROR (Rougeole-Oreillons-Rubéole)</strong> — 1ère dose. Important : la rougeole reste active dans certaines régions du Maghreb — ne négligez pas ce vaccin.</li>
  <li><strong>PCV13</strong> — dose de rappel</li>
  <li><strong>Méningocoque A</strong> — 1ère dose (méningite à méningocoque, mortelle dans 10 % des cas)</li>
</ul>

<h2>À 15-18 mois</h2>
<ul>
  <li><strong>DTC (rappel)</strong> — rappel diphtérie-tétanos-coqueluche</li>
  <li><strong>VPO</strong> — dose de rappel</li>
  <li><strong>ROR</strong> — 2ème dose (deux doses nécessaires pour une protection complète)</li>
</ul>

<h2>À 6 ans (entrée à l''école primaire)</h2>
<ul>
  <li><strong>DT (diphtérie-tétanos)</strong> — rappel scolaire</li>
  <li><strong>VPO</strong> — rappel</li>
  <li>Vérification du carnet vaccinal complet — obligatoire pour l''inscription scolaire en Tunisie</li>
</ul>

<h2>À 12 ans (entrée au collège)</h2>
<ul>
  <li><strong>dT (diphtérie-tétanos adulte)</strong> — rappel adolescent</li>
  <li><strong>VPH (Papillomavirus humain)</strong> — recommandé pour les filles, 2 doses à 6 mois d''intervalle, protège contre le cancer du col de l''utérus</li>
</ul>

<h2>Conseils pratiques pour les parents</h2>
<ul>
  <li><strong>Tenez à jour le carnet de santé</strong> de votre enfant — exigez systématiquement l''enregistrement de chaque vaccin avec la date et le numéro de lot</li>
  <li><strong>Ne retardez pas les vaccins</strong> — les intervalles sont calculés pour optimiser la protection immunitaire</li>
  <li><strong>Signes normaux après vaccination</strong> : légère fièvre, douleur au point d''injection, irritabilité pendant 24-48h — ce sont des réactions normales et bénignes</li>
  <li><strong>Signes d''alerte à surveiller</strong> : fièvre > 39°C persistante, convulsions, pleurs inconsolables > 3h, éruption cutanée étendue → consultez un médecin</li>
  <li>Les vaccins du PNI sont <strong>entièrement gratuits</strong> dans les centres de santé publics de base (CSB) en Tunisie</li>
  <li>En cas de vaccin manqué, <strong>il n''est jamais trop tard</strong> — le calendrier de rattrapage peut être mis en place par votre pédiatre</li>
</ul>

<h2>Vaccins recommandés hors PNI</h2>
<p>Certains vaccins, non inclus dans le programme gratuit, sont fortement recommandés si vous pouvez y accéder :</p>
<ul>
  <li><strong>Grippe saisonnière</strong> — chaque année, surtout pour les enfants de moins de 5 ans et ceux avec maladies chroniques</li>
  <li><strong>Varicelle</strong> — 2 doses recommandées entre 12 mois et 12 ans</li>
  <li><strong>Hépatite A</strong> — 2 doses recommandées pour les enfants voyageant dans des zones à risque</li>
</ul>

<h2>Conclusion</h2>
<p>Le respect du calendrier vaccinal est l''un des actes préventifs les plus importants que vous pouvez faire pour votre enfant. Si vous avez des doutes sur le statut vaccinal de votre enfant ou si vous souhaitez consulter un pédiatre pour un bilan, prenez rendez-vous facilement sur <strong>Doktori</strong>.</p>',
  'Dr. Équipe Doktori',
  'conseil',
  '["vaccination", "enfants", "calendrier vaccinal", "pédiatrie", "tunisie", "2026"]',
  true,
  '2026-04-14 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 7: Santé — Diabète en Tunisie
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'diabete-tunisie-prevention-depistage-prise-en-charge',
  'Diabète en Tunisie : prévention, dépistage et prise en charge',
  'La Tunisie compte plus d''un million de diabétiques. Tout ce qu''il faut savoir sur le dépistage, les symptômes et la prise en charge du diabète de type 2.',
  '<h2>Une épidémie silencieuse</h2>
<p>Le diabète est l''une des maladies chroniques les plus répandues en Tunisie. Selon les estimations de 2025, plus d''un million de Tunisiens vivent avec le diabète — et environ 30 à 40 % d''entre eux l''ignorent. Cette maladie silencieuse, lorsqu''elle est mal contrôlée, peut entraîner des complications graves : cécité, insuffisance rénale, amputation, maladies cardiovasculaires. La bonne nouvelle : un dépistage précoce et une prise en charge adaptée permettent de vivre normalement avec le diabète.</p>

<h2>Comprendre le diabète : types et mécanismes</h2>
<h3>Diabète de type 1 (DT1)</h3>
<p>Il s''agit d''une maladie auto-immune où le pancréas ne produit plus d''insuline. Il survient généralement dans l''enfance ou l''adolescence et nécessite des injections d''insuline à vie. Il représente environ 10 % des cas de diabète en Tunisie.</p>

<h3>Diabète de type 2 (DT2)</h3>
<p>C''est le diabète le plus fréquent (90 % des cas). Il apparaît généralement après 40 ans, lié à la résistance à l''insuline. Les facteurs de risque en Tunisie sont bien identifiés :</p>
<ul>
  <li>Surpoids et obésité (abdominale en particulier)</li>
  <li>Sédentarité et mode de vie peu actif</li>
  <li>Alimentation riche en sucres raffinés et en graisses saturées</li>
  <li>Antécédents familiaux de diabète</li>
  <li>Hypertension artérielle</li>
  <li>Diabète gestationnel lors d''une grossesse précédente</li>
</ul>

<h3>Diabète gestationnel</h3>
<p>Il survient pendant la grossesse et concerne environ 10 à 15 % des femmes enceintes en Tunisie. Il nécessite un suivi rigoureux et augmente le risque de DT2 ultérieur pour la mère.</p>

<h2>Les symptômes qui doivent alerter</h2>
<p>Le diabète de type 2 est souvent asymptomatique pendant des années. Cependant, certains signes doivent conduire à une consultation :</p>
<ul>
  <li><strong>Soif intense et persistante</strong> (polydipsie)</li>
  <li><strong>Urinations fréquentes</strong>, surtout la nuit (polyurie)</li>
  <li><strong>Fatigue inexpliquée</strong> malgré un repos suffisant</li>
  <li><strong>Vision floue</strong> ou changeante</li>
  <li><strong>Cicatrisation lente</strong> des plaies</li>
  <li><strong>Infections répétées</strong> (urinaires, cutanées, dentaires)</li>
  <li><strong>Fourmillements</strong> dans les pieds et les mains</li>
  <li><strong>Perte de poids inexpliquée</strong> (surtout dans le DT1)</li>
</ul>

<h2>Le dépistage : qui doit se faire tester ?</h2>
<p>En Tunisie, le dépistage du diabète repose sur une simple <strong>glycémie à jeun</strong> (prise de sang après 8 heures de jeûne). Il est recommandé :</p>
<ul>
  <li>À partir de <strong>45 ans</strong> pour toute personne, même sans symptôme</li>
  <li>Dès <strong>30 ans</strong> en présence d''un facteur de risque (surpoids, antécédents familiaux)</li>
  <li>Lors de toute <strong>grossesse</strong> (entre la 24ème et 28ème semaine)</li>
  <li>En cas de <strong>symptômes évocateurs</strong> à tout âge</li>
</ul>
<p>Interprétation de la glycémie à jeun :</p>
<ul>
  <li>Normale : < 1,00 g/L (5,6 mmol/L)</li>
  <li>Prédiabète : 1,00 à 1,25 g/L → risque élevé, intervention nécessaire</li>
  <li>Diabète : ≥ 1,26 g/L confirmée sur deux prises → diagnostic de diabète</li>
</ul>

<h2>La prise en charge du diabète de type 2</h2>
<h3>Les règles hygiéno-diététiques — la base</h3>
<p>Pour les prédiabétiques et les diabétiques légers, les modifications du mode de vie peuvent suffire :</p>
<ul>
  <li><strong>Activité physique</strong> : 30 minutes de marche rapide au moins 5 jours par semaine. En Tunisie, les promenades du soir (après 18h en été) sont une option idéale.</li>
  <li><strong>Alimentation équilibrée</strong> : réduire les sucres rapides (pain blanc, pâtisseries, jus de fruits, sodas), favoriser les céréales complètes, les légumineuses (lentilles, pois chiches — des incontournables de la cuisine tunisienne), les légumes et les protéines maigres.</li>
  <li><strong>Perte de poids</strong> : une perte de 5 à 10 % du poids corporel peut normaliser la glycémie chez les prédiabétiques.</li>
</ul>

<h3>Les médicaments</h3>
<p>Lorsque les règles hygiéno-diététiques ne suffisent plus, des médicaments antidiabétiques oraux sont prescrits, en première intention la <strong>metformine</strong> (moins chère et bien tolérée). D''autres classes existent pour les cas plus complexes. L''insuline est utilisée lorsque le pancréas est très défaillant.</p>

<h3>Le suivi du diabétique en Tunisie</h3>
<p>Un diabétique bien suivi consulte :</p>
<ul>
  <li>Son <strong>médecin généraliste ou endocrinologue</strong> tous les 3 mois (avec HbA1c)</li>
  <li>Un <strong>ophtalmologue</strong> une fois par an (dépistage de la rétinopathie diabétique)</li>
  <li>Un <strong>néphrologue</strong> si la créatinine ou la microalbuminurie est anormale</li>
  <li>Un <strong>podologue</strong> pour le soin des pieds (prévention des ulcères du pied diabétique)</li>
  <li>Un <strong>cardiologue</strong> en cas de facteurs de risque cardiovasculaires associés</li>
</ul>

<h2>Les complications à prévenir</h2>
<p>Un diabète mal contrôlé sur le long terme peut entraîner :</p>
<ul>
  <li><strong>Rétinopathie diabétique</strong> — 1ère cause de cécité chez l''adulte en Tunisie</li>
  <li><strong>Néphropathie diabétique</strong> — 1ère cause d''insuffisance rénale chronique terminale</li>
  <li><strong>Neuropathie</strong> — fourmillements, perte de sensibilité dans les pieds</li>
  <li><strong>Pied diabétique</strong> — plaies qui ne cicatrisent pas, pouvant mener à l''amputation</li>
  <li><strong>Maladies cardiovasculaires</strong> — infarctus et AVC, 2 à 3 fois plus fréquents chez les diabétiques</li>
</ul>

<h2>Conclusion</h2>
<p>Le diabète est une maladie sérieuse mais gérable. Le dépistage précoce et le suivi régulier sont les clés pour éviter les complications. Si vous avez des facteurs de risque ou des symptômes évocateurs, prenez rendez-vous avec un médecin généraliste ou un endocrinologue sur <strong>Doktori</strong> — ne laissez pas le diabète s''installer en silence.</p>',
  'Dr. Équipe Doktori',
  'sante',
  '["diabète", "glycémie", "prévention", "dépistage", "endocrinologie", "tunisie"]',
  true,
  '2026-04-16 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 8: Actualite — Présentation de Doktori.tn
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'doktori-tn-premiere-plateforme-rendez-vous-medicaux-tunisie',
  'Doktori.tn : la première plateforme de prise de rendez-vous médicaux en Tunisie',
  'Découvrez Doktori.tn, la plateforme tunisienne qui révolutionne l''accès aux soins en permettant aux patients de trouver et réserver un médecin en ligne, 24h/24.',
  '<h2>L''accès aux soins médicaux en Tunisie, réinventé</h2>
<p>Combien de fois avez-vous passé de longues minutes au téléphone pour obtenir un rendez-vous chez un spécialiste, pour finalement vous entendre dire : "Le prochain créneau disponible est dans trois semaines" ? Combien de fois vous êtes-vous rendu chez un médecin sans rendez-vous, en espérant être reçu entre deux patients ?</p>
<p>Ce quotidien, des millions de Tunisiens le vivent chaque semaine. <strong>Doktori.tn</strong> est née de ce constat simple : prendre rendez-vous chez un médecin en Tunisie ne devrait pas être une épreuve.</p>

<h2>Qu''est-ce que Doktori ?</h2>
<p><strong>Doktori</strong> est la première plateforme tunisienne de prise de rendez-vous médicaux en ligne. Elle connecte patients et professionnels de santé en temps réel, permettant à chacun de trouver le bon médecin et de réserver son créneau en quelques clics — 24 heures sur 24, 7 jours sur 7, sans attente téléphonique.</p>
<p>La plateforme est disponible sur <a href="https://doktori.tn">doktori.tn</a>, depuis n''importe quel smartphone, tablette ou ordinateur.</p>

<h2>Ce que Doktori permet aux patients</h2>
<ul>
  <li><strong>Trouver le bon médecin</strong> — recherchez par spécialité, par ville ou par quartier. Comparez les profils, les disponibilités et les tarifs en un coup d''œil.</li>
  <li><strong>Réserver en ligne 24h/24</strong> — plus besoin d''appeler pendant les heures d''ouverture du cabinet. Réservez le soir, le week-end, depuis votre canapé.</li>
  <li><strong>Recevoir des rappels automatiques</strong> — un SMS de confirmation immédiat et un rappel 24h avant votre rendez-vous pour ne jamais l''oublier.</li>
  <li><strong>Gérer facilement ses rendez-vous</strong> — annuler, reporter ou modifier votre rendez-vous en 1 clic, sans stress.</li>
  <li><strong>Consulter en téléconsultation</strong> — pour les situations où vous n''avez pas besoin de vous déplacer, certains médecins proposent une consultation vidéo directement via la plateforme.</li>
  <li><strong>Demander un médecin à domicile</strong> — via notre service SOS Médecin, un médecin se déplace chez vous pour les urgences non vitales.</li>
</ul>

<h2>Ce que Doktori apporte aux médecins</h2>
<p>Doktori n''est pas uniquement une plateforme pour les patients. Elle est conçue pour simplifier le quotidien des professionnels de santé :</p>
<ul>
  <li><strong>Agenda en ligne intelligent</strong> — gérez votre planning depuis n''importe quel appareil, avec synchronisation en temps réel</li>
  <li><strong>Réduction des no-shows</strong> — les rappels automatiques par SMS réduisent les absences de 40 %</li>
  <li><strong>Moins de temps perdu au téléphone</strong> — la secrétaire ou le médecin n''ont plus à gérer manuellement chaque prise de rendez-vous</li>
  <li><strong>Visibilité accrue</strong> — votre profil est visible par des milliers de patients tunisiens qui cherchent votre spécialité</li>
  <li><strong>Gestion des dossiers patients</strong> — historique des consultations et accès simplifié aux informations des patients</li>
</ul>

<h2>Disponible dans tout le Grand Tunis et au-delà</h2>
<p>Doktori est disponible dans les principales villes tunisiennes : <strong>Tunis</strong> (La Marsa, Ariana, Lac 1, Lac 2, Ennasr, Menzah, Mutuelleville, El Manar), <strong>Sousse</strong>, <strong>Sfax</strong>, <strong>Monastir</strong>, <strong>Bizerte</strong>, <strong>Nabeul</strong> et de nombreuses autres villes. Le réseau de médecins partenaires s''agrandit chaque semaine.</p>

<h2>Toutes les spécialités disponibles</h2>
<p>Sur Doktori, vous pouvez réserver une consultation chez :</p>
<ul>
  <li>Médecins généralistes</li>
  <li>Cardiologues, Pneumologues</li>
  <li>Dermatologues</li>
  <li>Gynécologues-Obstétriciens</li>
  <li>Pédiatres</li>
  <li>Ophtalmologues</li>
  <li>Orthopédistes, Rhumatologues</li>
  <li>Endocrinologues, Diabétologues</li>
  <li>Gastro-entérologues, Hépatologues</li>
  <li>Urologues, Néphrologues</li>
  <li>Neurologues, Psychiatres</li>
  <li>ORL (Oto-rhino-laryngologistes)</li>
  <li>Dentistes, Orthodontistes</li>
  <li>Et bien d''autres…</li>
</ul>

<h2>Gratuit pour les patients, simple pour les médecins</h2>
<p>L''utilisation de Doktori est <strong>entièrement gratuite pour les patients</strong>. Créez votre compte en moins de 2 minutes avec votre numéro de téléphone tunisien et commencez à réserver vos consultations immédiatement.</p>
<p>Pour les médecins et cliniques souhaitant rejoindre la plateforme, contactez notre équipe via la page <a href="https://doktori.tn/pro">doktori.tn/pro</a>.</p>

<h2>La santé tunisienne mérite mieux</h2>
<p>Doktori croit fermement que chaque Tunisien mérite un accès simple, rapide et fiable aux soins médicaux. Que vous soyez à La Soukra ou à Sfax, que vous ayez besoin d''un médecin généraliste ou d''un cardiologue, que ce soit un mardi matin ou un dimanche soir — <strong>Doktori est là pour vous</strong>.</p>
<p>Rejoignez les milliers de patients qui font déjà confiance à Doktori pour gérer leur santé. <strong>Inscrivez-vous gratuitement sur <a href="https://doktori.tn">doktori.tn</a></strong> et prenez votre prochain rendez-vous médical dès aujourd''hui.</p>',
  'Doktori',
  'actualite',
  '["doktori", "plateforme médicale", "rendez-vous en ligne", "tunisie", "santé numérique"]',
  true,
  '2026-04-18 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;
