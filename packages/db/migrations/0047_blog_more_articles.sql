-- Migration: 0047_blog_more_articles.sql
-- Seed 6 medical blog articles covering remaining specialties for Doktori.tn
-- All content in French, targeting Tunisian patients

-- Article 1: Spécialité — Cardiologie
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'cardiologie-tunisie-hypertension-cholesterol-prevention',
  'Cardiologie en Tunisie : hypertension, cholestérol et prévention cardiovasculaire',
  'Tout ce que vous devez savoir sur la santé cardiaque en Tunisie : chiffres de l''hypertension, risques du cholestérol, signes d''alerte et conseils de prévention.',
  '<h2>Le cœur, première cause de mortalité en Tunisie</h2>
<p>Les maladies cardiovasculaires représentent la <strong>première cause de décès en Tunisie</strong>, responsables de plus de 30 % des décès selon le Ministère de la Santé. Pourtant, la grande majorité de ces décès pourrait être évitée grâce à une prise en charge précoce et à des changements de mode de vie. La cardiologie est donc l''une des spécialités les plus cruciales — et les plus consultées — du pays.</p>

<h2>L''hypertension artérielle : le mal silencieux</h2>
<p>En Tunisie, on estime qu''<strong>un adulte sur trois</strong> souffre d''hypertension artérielle, et une large partie de ces personnes ne le sait pas. L''hypertension (tension ≥ 140/90 mmHg) est souvent asymptomatique pendant des années, d''où son surnom de « tueur silencieux ».</p>
<p>Elle abîme progressivement les artères, le cœur, les reins et le cerveau. Non traitée, elle multiplie par quatre le risque d''accident vasculaire cérébral (AVC) et double le risque d''infarctus du myocarde.</p>
<h3>Qui est à risque ?</h3>
<ul>
  <li>Personnes de plus de 50 ans</li>
  <li>Hommes, en particulier avant 65 ans</li>
  <li>Personnes en surpoids ou obèses</li>
  <li>Fumeurs et consommateurs réguliers d''alcool</li>
  <li>Personnes soumises à un stress chronique</li>
  <li>Antécédents familiaux d''hypertension ou de maladie cardiaque</li>
</ul>
<p><strong>Conseil :</strong> Faites mesurer votre tension au moins une fois par an, même si vous vous sentez bien. Un appareil en pharmacie ou chez votre médecin suffit.</p>

<h2>Le cholestérol : le bon et le mauvais</h2>
<p>Le cholestérol n''est pas en soi un ennemi — votre organisme en a besoin pour fabriquer certaines hormones et protéger les membranes cellulaires. Le problème vient du déséquilibre :</p>
<ul>
  <li><strong>LDL (« mauvais » cholestérol) :</strong> s''accumule dans les parois des artères et forme des plaques d''athérome qui rétrécissent les vaisseaux.</li>
  <li><strong>HDL (« bon » cholestérol) :</strong> transporte le cholestérol vers le foie pour élimination. Plus il est élevé, mieux c''est.</li>
</ul>
<p>En Tunisie, la prévalence d''hypercholestérolémie (cholestérol LDL trop élevé) est estimée à plus de 40 % chez les adultes de plus de 40 ans. Une alimentation riche en graisses saturées (fritures, viandes grasses, pâtisseries), couplée à la sédentarité, explique en grande partie cette statistique.</p>

<h2>Quand consulter un cardiologue ?</h2>
<p>Ne tardez pas à prendre rendez-vous avec un cardiologue si vous présentez l''un de ces signes :</p>
<ul>
  <li>Douleur ou oppression dans la poitrine, même brève</li>
  <li>Essoufflement inhabituel à l''effort ou au repos</li>
  <li>Palpitations (sensation de cœur qui bat trop vite ou de manière irrégulière)</li>
  <li>Tension artérielle supérieure à 140/90 mmHg mesurée à plusieurs reprises</li>
  <li>Étourdissements ou malaises inexpliqués</li>
  <li>Antécédents familiaux de maladie cardiaque ou d''AVC avant 60 ans</li>
  <li>Diabète — les patients diabétiques doivent faire un bilan cardiaque annuel</li>
</ul>
<p>Le cardiologue dispose d''un arsenal diagnostique précis : <strong>électrocardiogramme (ECG)</strong>, <strong>échocardiographie</strong> (échographie du cœur), <strong>test d''effort</strong>, <strong>Holter tensionnel</strong> sur 24 heures. Ces examens permettent de détecter très tôt les anomalies et d''adapter le traitement.</p>

<h2>5 conseils de prévention cardiovasculaire au quotidien</h2>
<ul>
  <li><strong>Bougez 30 minutes par jour :</strong> marche rapide, natation, vélo — sans attendre de faire du sport intensif.</li>
  <li><strong>Réduisez le sel :</strong> moins de 5 g par jour (évitez de resaler à table, limitez les plats préparés et la charcuterie).</li>
  <li><strong>Adoptez le régime méditerranéen :</strong> huile d''olive, légumineuses, poisson, légumes frais — un régime déjà ancré dans la culture tunisienne.</li>
  <li><strong>Arrêtez de fumer :</strong> le tabagisme est l''un des principaux facteurs de risque cardiovasculaire. Les services d''aide au sevrage sont disponibles dans les hôpitaux publics.</li>
  <li><strong>Gérez votre stress :</strong> le stress chronique fait monter la tension. Des techniques comme la respiration abdominale, la marche ou la méditation peuvent aider.</li>
</ul>

<h2>Conclusion</h2>
<p>La santé cardiaque se construit au quotidien. Un bilan cardiovasculaire régulier chez votre médecin ou cardiologue, couplé à une hygiène de vie saine, peut vous protéger efficacement. Sur <strong>Doktori</strong>, trouvez un cardiologue disponible près de chez vous et prenez rendez-vous en ligne en quelques secondes — parce que votre cœur mérite toute votre attention.</p>',
  'Dr. Équipe Doktori',
  'specialite',
  '["cardiologie", "hypertension", "cholestérol", "prévention", "tunisie", "cœur"]',
  true,
  '2026-04-19 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 2: Spécialité — ORL
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'orl-tunisie-sinusite-otite-troubles-audition',
  'ORL en Tunisie : sinusite, otite et troubles de l''audition',
  'Découvrez les pathologies ORL les plus fréquentes en Tunisie, quand consulter un oto-rhino-laryngologiste et quels traitements sont disponibles.',
  '<h2>Qu''est-ce qu''un médecin ORL ?</h2>
<p>L''oto-rhino-laryngologiste — plus communément appelé <strong>ORL</strong> — est le spécialiste des maladies des oreilles, du nez, de la gorge, mais aussi du larynx, du pharynx et des sinus. En Tunisie, l''ORL est parmi les cinq spécialistes les plus consultés, toutes tranches d''âge confondues. Enfants comme adultes souffrent régulièrement d''infections des voies respiratoires supérieures, d''autant plus dans un pays où les hivers peuvent être rigoureux dans les régions intérieures.</p>

<h2>La sinusite : bien plus qu''un simple rhume</h2>
<p>La sinusite est une inflammation des sinus paranasaux, souvent consécutive à une infection virale (rhume) ou bactérienne. Elle se manifeste par :</p>
<ul>
  <li>Des douleurs ou pressions autour des yeux, du nez et du front</li>
  <li>Un nez bouché et des sécrétions épaisses (jaunes ou vertes)</li>
  <li>Une fièvre légère à modérée</li>
  <li>Une mauvaise odeur dans le nez ou la bouche</li>
  <li>Une toux persistante, surtout la nuit</li>
</ul>
<h3>Sinusite aiguë vs chronique</h3>
<p>La <strong>sinusite aiguë</strong> dure moins de 12 semaines et se résout généralement avec un traitement médical adapté (décongestionnants, corticoïdes nasaux, parfois antibiotiques si origine bactérienne). La <strong>sinusite chronique</strong>, qui persiste au-delà de 12 semaines malgré le traitement, peut nécessiter une intervention chirurgicale — la chirurgie endoscopique des sinus (FESS) — pratiquée sous anesthésie générale.</p>
<p>En Tunisie, la pollution atmosphérique dans les grandes villes comme Tunis, Sfax et Sousse, ainsi que la présence de poussière de sable (chergui), aggravent les sinusites chroniques chez les personnes prédisposées.</p>

<h2>L''otite : fréquente chez l''enfant, sérieuse chez l''adulte</h2>
<p>L''otite est une infection de l''oreille. Il en existe deux types principaux :</p>
<ul>
  <li><strong>Otite moyenne aiguë :</strong> infection de l''oreille moyenne, très fréquente chez les enfants de moins de 6 ans. Elle se manifeste par une douleur intense de l''oreille, de la fièvre et parfois un écoulement.</li>
  <li><strong>Otite externe :</strong> infection du conduit auditif, souvent liée aux bains de mer en été. En Tunisie, le tourisme balnéaire explique le pic de consultations ORL entre juin et septembre.</li>
</ul>
<p>Une otite non traitée peut évoluer vers une perforation du tympan ou une atteinte de l''oreille interne, entraînant une perte auditive partielle ou totale. Il est donc essentiel de consulter rapidement dès les premiers signes.</p>

<h2>Les troubles de l''audition</h2>
<p>La perte d''audition (hypoacousie) est sous-diagnostiquée en Tunisie, notamment chez les personnes âgées et les travailleurs exposés au bruit (chantiers, usines). Les signes d''alerte incluent :</p>
<ul>
  <li>Difficulté à suivre une conversation dans un lieu bruyant</li>
  <li>Besoin d''augmenter le volume de la télévision ou du téléphone</li>
  <li>Sifflements ou bourdonnements dans les oreilles (acouphènes)</li>
  <li>Impression que les gens « mumblent »</li>
</ul>
<p>L''ORL réalise un <strong>audiogramme</strong> pour quantifier précisément la perte auditive et en déterminer la cause. Selon le diagnostic, le traitement peut aller de simples conseils d''hygiène auriculaire à la prescription d''un appareil auditif, voire à une chirurgie (pose d''aérateurs transtympaniques chez l''enfant).</p>

<h2>Autres pathologies couramment traitées par l''ORL</h2>
<ul>
  <li><strong>Amygdalites et végétations :</strong> très fréquentes chez l''enfant en Tunisie, elles peuvent nécessiter une ablation (amygdalectomie) en cas de récidives répétées.</li>
  <li><strong>Rhinite allergique :</strong> inflammation nasale liée aux pollens, acariens ou poils d''animaux — en hausse en raison de l''augmentation des allergies en Tunisie.</li>
  <li><strong>Ronflement et apnée du sommeil :</strong> l''ORL évalue et traite les causes anatomiques (déviation de la cloison nasale, hypertrophie des amygdales).</li>
  <li><strong>Troubles de la voix (dysphonie) :</strong> enrouement persistant, perte de voix — à investiguer systématiquement si cela dure plus de 3 semaines.</li>
</ul>

<h2>Quand consulter un ORL en urgence ?</h2>
<p>Rendez-vous aux urgences ou consultez en urgence si vous présentez :</p>
<ul>
  <li>Une douleur d''oreille intense avec forte fièvre chez un nourrisson</li>
  <li>Une perte soudaine d''audition (surdité brusque — urgence absolue à traiter dans les 24-48 h)</li>
  <li>Un saignement abondant du nez qui ne cède pas après 20 minutes de compression</li>
  <li>Une difficulté à avaler ou à respirer liée à une angine sévère</li>
</ul>

<h2>Conclusion</h2>
<p>La santé ORL mérite une attention particulière, quel que soit votre âge. Un diagnostic précoce évite bien des complications. Sur <strong>Doktori</strong>, trouvez un spécialiste ORL disponible dans votre ville et prenez rendez-vous en ligne en toute simplicité.</p>',
  'Dr. Équipe Doktori',
  'specialite',
  '["ORL", "sinusite", "otite", "audition", "tunisie", "oreille", "nez", "gorge"]',
  true,
  '2026-04-21 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 3: Spécialité — Orthopédie
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'orthopedie-tunisie-mal-de-dos-arthrose-traumatologie-sportive',
  'Orthopédie en Tunisie : mal de dos, arthrose et traumatologie sportive',
  'Lombalgie, arthrose du genou, entorse de cheville : comprendre les pathologies orthopédiques les plus fréquentes en Tunisie et les solutions thérapeutiques disponibles.',
  '<h2>L''orthopédie, une spécialité au cœur du quotidien</h2>
<p>L''orthopédiste-traumatologue est le spécialiste de l''appareil locomoteur : os, articulations, tendons, ligaments et muscles. En Tunisie, la demande en orthopédie est en constante augmentation, portée par trois tendances majeures : la sédentarité croissante, le vieillissement de la population, et l''essor de la pratique sportive chez les jeunes.</p>

<h2>La lombalgie : le mal du siècle</h2>
<p>La <strong>lombalgie</strong> — ou douleur lombaire — est le motif de consultation orthopédique numéro un en Tunisie comme dans le monde. Elle touche <strong>8 personnes sur 10</strong> à un moment de leur vie. Elle se manifeste par une douleur dans le bas du dos, parfois irradiante vers la fesse ou la jambe (sciatique).</p>
<h3>Les causes principales</h3>
<ul>
  <li><strong>Lumbago ou lombalgie commune :</strong> contracture musculaire souvent liée à un faux mouvement ou au port de charges lourdes — très fréquente dans le secteur agricole et sur les chantiers en Tunisie.</li>
  <li><strong>Hernie discale :</strong> le disque intervertébral sort de son emplacement et comprime les nerfs voisins, causant parfois une sciatique paralysante.</li>
  <li><strong>Arthrose lombaire :</strong> usure progressive du cartilage des vertèbres, fréquente après 50 ans.</li>
  <li><strong>Spondylolisthésis :</strong> glissement d''une vertèbre sur l''autre, plus rare mais handicapant.</li>
</ul>
<p>La grande majorité des lombalgies (90 %) guérissent spontanément en 6 semaines avec des mesures conservatrices. <strong>Rester actif</strong> est le meilleur traitement — le repos strict au lit est déconseillé.</p>

<h2>L''arthrose : vivre avec l''usure articulaire</h2>
<p>L''arthrose est une maladie dégénérative du cartilage articulaire. Elle touche principalement le genou (gonarthrose), la hanche (coxarthrose), la colonne vertébrale (spondylarthrose) et les mains (rhizarthrose du pouce).</p>
<p>En Tunisie, la gonarthrose est particulièrement répandue en raison du surpoids (le genou supporte 3 à 5 fois le poids du corps à chaque pas) et des conditions de travail (positions accroupies répétées dans l''artisanat et l''agriculture).</p>
<h3>Comment soulager l''arthrose ?</h3>
<ul>
  <li><strong>Kinésithérapie :</strong> renforcement des muscles autour de l''articulation pour réduire la charge sur le cartilage.</li>
  <li><strong>Perte de poids :</strong> perdre 5 kg réduit la douleur au genou de manière significative.</li>
  <li><strong>Antalgiques et anti-inflammatoires :</strong> prescrits par le médecin pour les poussées douloureuses.</li>
  <li><strong>Infiltrations :</strong> injection de corticoïdes ou d''acide hyaluronique dans l''articulation pour soulager rapidement.</li>
  <li><strong>Chirurgie :</strong> en dernier recours, la prothèse totale de genou ou de hanche offre d''excellents résultats — la Tunisie dispose de plusieurs centres hospitaliers spécialisés (CHU Sahloul, CHU Mongi Slim).</li>
</ul>

<h2>La traumatologie sportive en pleine expansion</h2>
<p>La pratique sportive est en forte croissance en Tunisie : football, running, cyclisme, sports de salle. Avec elle, les blessures sportives se multiplient.</p>
<h3>Les traumatismes les plus fréquents</h3>
<ul>
  <li><strong>Entorse de cheville :</strong> la blessure la plus courante, souvent sous-estimée. Une entorse mal soignée devient chroniquement instable.</li>
  <li><strong>Rupture du ligament croisé antérieur (LCA) :</strong> fréquente au football et au ski. Nécessite une reconstruction chirurgicale (ligamentoplastie) suivie de 6 à 9 mois de rééducation.</li>
  <li><strong>Tendinite du tendon d''Achille ou rotulien :</strong> liée à un entraînement trop intense ou à une mauvaise posture de course.</li>
  <li><strong>Fractures de stress :</strong> microfractures dues à un effort répété, souvent chez les coureurs longue distance.</li>
  <li><strong>Lésions méniscales :</strong> déchirure du ménisque interne ou externe au genou — fréquente dans les sports de pivot.</li>
</ul>
<p><strong>Règle d''or :</strong> ne jamais ignorer une douleur sportive persistante. Un diagnostic précoce permet une prise en charge conservatrice (kinésithérapie, orthèse) et évite souvent la chirurgie.</p>

<h2>La kinésithérapie, alliée indispensable de l''orthopédie</h2>
<p>En Tunisie, le kinésithérapeute joue un rôle central dans la récupération orthopédique. Après une opération, une entorse ou une lombalgie, la rééducation permet de retrouver force, mobilité et proprioception. Le réseau de kinésithérapeutes conventionnés CNAM s''est considérablement développé ces dernières années, rendant la rééducation plus accessible.</p>

<h2>Quand consulter un orthopédiste ?</h2>
<ul>
  <li>Douleur articulaire ou osseuse persistant plus de 2 semaines</li>
  <li>Traumatisme sportif avec gonflement ou impossibilité d''appui</li>
  <li>Douleur du dos irradiant dans la jambe ou le bras</li>
  <li>Déformation visible d''une articulation</li>
  <li>Limitation progressive de la mobilité d''une articulation</li>
</ul>

<h2>Conclusion</h2>
<p>Qu''il s''agisse d''un mal de dos chronique, d''une arthrose débutante ou d''une blessure sportive, l''orthopédiste dispose des outils pour vous aider à retrouver une vie active sans douleur. Sur <strong>Doktori</strong>, consultez un orthopédiste qualifié près de chez vous et prenez rendez-vous en ligne rapidement.</p>',
  'Dr. Équipe Doktori',
  'specialite',
  '["orthopédie", "lombalgie", "arthrose", "traumatologie", "sport", "dos", "tunisie"]',
  true,
  '2026-04-23 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 4: Conseil — Santé mentale
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'sante-mentale-tunisie-briser-tabous-consulter-psychologue',
  'Santé mentale en Tunisie : briser les tabous et consulter un psychologue',
  'Dépression, anxiété, burnout : la santé mentale est encore trop souvent taboue en Tunisie. Comment reconnaître les signaux d''alerte et franchir le pas de la consultation ?',
  '<h2>La santé mentale, l''angle mort de notre système de santé</h2>
<p>En Tunisie, parler de ses souffrances psychologiques reste encore difficile. « C''est dans la tête », « il faut être fort », « la famille doit régler ça » — ces phrases, beaucoup les ont entendues. La santé mentale est pourtant <strong>aussi réelle que la santé physique</strong>, et elle mérite la même attention, le même soin et la même bienveillance.</p>
<p>Selon l''Organisation mondiale de la Santé (OMS), <strong>1 Tunisien sur 5</strong> souffrira d''un trouble mental au cours de sa vie. Anxiété, dépression, burnout, troubles du sommeil, phobies — ces pathologies sont courantes, traitables, et aucune honte ne devrait y être associée.</p>

<h2>Comprendre les principaux troubles mentaux</h2>
<h3>La dépression</h3>
<p>La dépression n''est pas une simple tristesse passagère. C''est une maladie qui altère durablement l''humeur, l''énergie, le sommeil et la concentration. Elle touche aussi bien les femmes que les hommes, et peut survenir à tout âge. Les signes incluent :</p>
<ul>
  <li>Tristesse persistante ou sentiment de vide</li>
  <li>Perte d''intérêt pour les activités autrefois plaisantes</li>
  <li>Fatigue chronique malgré le repos</li>
  <li>Difficultés de concentration ou de mémoire</li>
  <li>Troubles du sommeil (insomnie ou hypersomnie)</li>
  <li>Pensées négatives récurrentes ou idées sombres</li>
</ul>

<h3>L''anxiété généralisée</h3>
<p>L''anxiété est normale face au danger. Elle devient problématique quand elle est <strong>excessive, permanente et incontrôlable</strong>, envahissant tous les domaines de la vie. Les personnes souffrant d''anxiété généralisée s''inquiètent en permanence pour leur santé, leur travail, leur famille — même sans raison objective. Des symptômes physiques l''accompagnent souvent : tensions musculaires, maux de tête, palpitations, troubles digestifs.</p>

<h3>Le burnout</h3>
<p>Le burnout (épuisement professionnel) est reconnu par l''OMS comme un phénomène lié au travail. Il se développe progressivement chez des personnes surengagées qui se vident de leurs ressources. En Tunisie, il touche particulièrement les professionnels de santé, les enseignants et les employés du secteur privé soumis à une forte pression. Le travail perd tout sens, l''épuisement est total, et le cynisme s''installe.</p>

<h2>Pourquoi la stigmatisation persiste-t-elle ?</h2>
<p>Plusieurs facteurs expliquent la résistance culturelle à la consultation psychologique en Tunisie :</p>
<ul>
  <li><strong>Les croyances religieuses et culturelles :</strong> la souffrance psychologique est parfois interprétée comme un manque de foi ou une faiblesse morale.</li>
  <li><strong>La peur du jugement :</strong> beaucoup craignent d''être étiquetés « fous » par leur entourage.</li>
  <li><strong>La méconnaissance des ressources disponibles :</strong> peu de gens savent qu''il existe des psychologues cliniciens et des psychiatres compétents en Tunisie.</li>
  <li><strong>L''accessibilité financière :</strong> les consultations chez un psychologue privé représentent un coût non remboursé par la CNAM — un frein réel pour beaucoup de familles.</li>
</ul>

<h2>Psychologue ou psychiatre : quelle différence ?</h2>
<ul>
  <li><strong>Le psychologue clinicien</strong> est un professionnel formé en psychologie (Bac+5 minimum). Il propose des thérapies par la parole (TCC, EMDR, thérapie systémique) mais ne peut pas prescrire de médicaments.</li>
  <li><strong>Le psychiatre</strong> est un médecin spécialisé en psychiatrie. Il peut poser des diagnostics médicaux, prescrire des traitements médicamenteux et orienter vers une hospitalisation si nécessaire. Il peut également faire de la psychothérapie.</li>
</ul>
<p>Dans de nombreux cas, <strong>une collaboration entre les deux</strong> est la solution la plus efficace : médicaments pour stabiliser, thérapie pour comprendre et reconstruire.</p>

<h2>Quand franchir le pas de la consultation ?</h2>
<p>Il n''est pas nécessaire d''être en crise pour consulter. Vous pouvez prendre rendez-vous avec un psychologue ou un psychiatre si :</p>
<ul>
  <li>Vous vous sentez envahi par une tristesse ou une inquiétude depuis plus de deux semaines</li>
  <li>Vous avez des difficultés à fonctionner au travail, en famille ou socialement</li>
  <li>Vous utilisez l''alcool, la nourriture ou les écrans pour fuir des émotions difficiles</li>
  <li>Vous traversez un deuil, une rupture, une perte d''emploi difficile à surmonter seul</li>
  <li>Vous avez des pensées de mort ou d''automutilation — dans ce cas, consultez en urgence</li>
</ul>

<h2>Ressources disponibles en Tunisie</h2>
<ul>
  <li><strong>Hôpital Razi (La Manouba) :</strong> principal établissement psychiatrique public de Tunisie, avec des consultations en ambulatoire.</li>
  <li><strong>Policlinique CNSS :</strong> accès aux psychiatres dans le cadre de la couverture sociale.</li>
  <li><strong>Secteur privé :</strong> de nombreux psychologues et psychiatres libéraux exercent à Tunis, Sfax, Sousse et dans les principales villes.</li>
  <li><strong>Ligne d''écoute :</strong> en cas de détresse aiguë, certaines associations proposent des lignes d''écoute psychologique.</li>
</ul>

<h2>Conclusion</h2>
<p>Prendre soin de sa santé mentale est un acte de courage et d''intelligence, pas de faiblesse. Si vous souffrez en silence, rappelez-vous que vous n''êtes pas seul — et que de l''aide existe. Sur <strong>Doktori</strong>, vous pouvez trouver un psychologue ou un psychiatre disponible, en toute confidentialité, et prendre rendez-vous sans jugement.</p>',
  'Dr. Équipe Doktori',
  'conseil',
  '["santé mentale", "psychologue", "dépression", "anxiété", "burnout", "tunisie", "tabou"]',
  true,
  '2026-04-25 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 5: Guide — Choisir son médecin traitant
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'comment-choisir-medecin-traitant-tunisie-criteres',
  'Comment choisir son médecin traitant en Tunisie — les critères essentiels',
  'Proximité, disponibilité, communication, spécialisation : découvrez tous les critères pour bien choisir votre médecin traitant en Tunisie et construire une relation de confiance durable.',
  '<h2>Pourquoi le choix du médecin traitant est important</h2>
<p>En Tunisie, le médecin traitant est votre référent de santé au quotidien. C''est lui qui gère vos maladies courantes, renouvelle vos ordonnances, assure le suivi de vos pathologies chroniques et vous oriente vers le bon spécialiste au bon moment. Une relation de confiance avec votre médecin généraliste améliore concrètement votre prise en charge — les études montrent que les patients qui ont un médecin traitant attitré consultent plus tôt, suivent mieux leur traitement et font moins d''hospitalisations évitables.</p>
<p>Pourtant, en Tunisie, beaucoup de personnes n''ont pas de médecin fixe et consultent « à la volée » le cabinet disponible le plus proche. Voici les critères qui vous permettront de faire le bon choix.</p>

<h2>1. La proximité géographique</h2>
<p>Un médecin trop éloigné, c''est un médecin que l''on n''ira pas voir. La proximité reste le critère numéro un, particulièrement pour les personnes âgées, les familles avec enfants en bas âge et les patients atteints de maladies chroniques qui consultent fréquemment.</p>
<p>Cherchez un cabinet à moins de 15-20 minutes de votre domicile ou de votre lieu de travail, accessible à pied, en transport en commun ou en voiture. Vérifiez également la disponibilité de stationnement si vous venez en voiture — un critère non négligeable dans les grandes villes tunisiennes.</p>

<h2>2. La disponibilité et les délais de rendez-vous</h2>
<p>Un bon médecin traitant doit être joignable en cas de besoin urgent. Renseignez-vous sur :</p>
<ul>
  <li>Les délais habituels pour un rendez-vous non urgent (idéalement moins de 5 jours)</li>
  <li>La possibilité de consultation le jour même en cas d''urgence</li>
  <li>Les horaires d''ouverture du cabinet (plages du soir, consultations le samedi matin ?)</li>
  <li>La présence d''un médecin remplaçant en cas d''absence</li>
</ul>
<p>Avec les plateformes comme <strong>Doktori</strong>, vous pouvez visualiser en temps réel les créneaux disponibles et choisir un médecin dont l''agenda correspond à vos contraintes.</p>

<h2>3. La qualification et la formation continue</h2>
<p>Tous les médecins généralistes en Tunisie sont titulaires du doctorat en médecine, délivré après 7 années d''études. Certains ont en plus une <strong>formation complémentaire</strong> en médecine du sport, en nutrition, en médecine esthétique ou en acupuncture — des atouts selon vos besoins spécifiques.</p>
<p>La formation continue est également un indicateur de sérieux : un médecin qui participe à des congrès, des formations et des DPC (développement professionnel continu) reste à la pointe des recommandations médicales actualisées.</p>

<h2>4. Le style de communication</h2>
<p>La relation médecin-patient est une relation humaine avant tout. Vous devez vous sentir <strong>écouté, respecté et compris</strong>. Lors de votre première consultation, observez si le médecin :</p>
<ul>
  <li>Prend le temps de vous écouter sans vous interrompre</li>
  <li>Vous explique le diagnostic et le traitement en termes compréhensibles</li>
  <li>Répond à vos questions sans les minimiser</li>
  <li>Vous associe aux décisions concernant votre santé (décision partagée)</li>
  <li>Tient compte de vos contraintes (professionnelles, financières, familiales)</li>
</ul>
<p>Un médecin qui vous parle comme à un partenaire dans le soin — et non comme à un sujet passif — sera bien plus efficace dans votre accompagnement.</p>

<h2>5. Les avis d''autres patients</h2>
<p>Le bouche-à-oreille reste un outil puissant en Tunisie. Demandez à vos proches, voisins ou collègues s''ils ont un médecin de confiance à recommander. Les avis en ligne sur des plateformes comme Doktori sont également précieux : ils reflètent les expériences réelles d''autres patients.</p>
<p>Attention cependant à nuancer les avis extrêmes — un seul avis très négatif ou très positif peut être non représentatif. Cherchez la tendance générale sur un minimum de dix avis.</p>

<h2>6. L''environnement et l''organisation du cabinet</h2>
<p>Un cabinet bien organisé est un signe de professionnalisme :</p>
<ul>
  <li>La salle d''attente est-elle propre, agréable et bien ventilée ?</li>
  <li>Les délais d''attente sur place sont-ils raisonnables (moins de 30 minutes) ?</li>
  <li>Le médecin dispose-t-il d''équipements de base (ECG, spiromètre, tensiomètre électronique) ?</li>
  <li>La secrétaire médicale est-elle accueillante et réactive ?</li>
</ul>

<h2>7. L''acceptation des conventions CNAM</h2>
<p>En Tunisie, vérifiez si le médecin est conventionné avec la CNAM (Caisse nationale d''assurance maladie) ou avec votre assurance complémentaire. Les honoraires varient significativement entre secteur public, secteur privé conventionné et secteur libéral non conventionné. Renseignez-vous avant de prendre rendez-vous pour éviter les mauvaises surprises.</p>

<h2>Conclusion : prenez le temps de trouver le bon</h2>
<p>Choisir son médecin traitant n''est pas une décision anodine — c''est un investissement pour votre santé à long terme. N''hésitez pas à consulter deux ou trois médecins différents avant de faire votre choix définitif. Sur <strong>Doktori</strong>, filtrez par quartier, disponibilité et avis patients pour trouver le médecin généraliste qui vous correspond.</p>',
  'Doktori',
  'guide',
  '["médecin traitant", "choisir médecin", "généraliste", "CNAM", "tunisie", "guide"]',
  true,
  '2026-04-27 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;

-- Article 6: Santé — Ramadan et santé
INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'ramadan-sante-conseils-medicaux-jeune-securite',
  'Ramadan et santé : conseils médicaux pour jeûner en toute sécurité',
  'Médicaments, hydratation, sport et maladies chroniques : tout ce que vous devez savoir pour pratiquer le Ramadan sans risques pour votre santé.',
  '<h2>Le Ramadan, un mois à part dans le calendrier de santé tunisien</h2>
<p>Le Ramadan est bien plus qu''un mois de jeûne — c''est un mois de spiritualité, de partage et de régulation du rythme de vie. En Tunisie, où la quasi-totalité de la population est concernée, le Ramadan impose une réorganisation complète des habitudes alimentaires, du sommeil et de l''activité physique. Pour la plupart des personnes en bonne santé, le jeûne du Ramadan est sans danger. Pour les personnes souffrant de maladies chroniques, une préparation médicale est indispensable.</p>

<h2>Les effets physiologiques du jeûne sur l''organisme</h2>
<p>Pendant les heures de jeûne, l''organisme traverse plusieurs phases d''adaptation :</p>
<ul>
  <li><strong>De 0 à 8 heures après le dernier repas :</strong> utilisation des réserves de glycogène hépatique pour maintenir la glycémie.</li>
  <li><strong>De 8 à 16 heures :</strong> début de la lipolyse (combustion des graisses) — le corps entre en mode cétose légère.</li>
  <li><strong>Au-delà :</strong> la fonte musculaire devient possible si les apports protéiques au moment de l''Iftar et du Sohour sont insuffisants.</li>
</ul>
<p>Ces mécanismes expliquent pourquoi <strong>la qualité du repas du Sohour</strong> (repas avant l''aube) est aussi importante que celle de l''Iftar. Un Sohour riche en protéines et en glucides complexes (pain complet, légumineuses, œufs) retarde la faim et maintient l''énergie tout au long de la journée.</p>

<h2>Hydratation : le défi numéro un</h2>
<p>En Tunisie, le Ramadan tombe souvent en période chaude. La déshydratation est donc un risque réel, surtout pour les travailleurs en extérieur, les personnes âgées et les enfants.</p>
<h3>Conseils pratiques</h3>
<ul>
  <li>Boire <strong>au moins 1,5 à 2 litres d''eau</strong> entre l''Iftar et le Sohour, en répartissant les prises (ne pas tout boire d''un coup).</li>
  <li>Éviter les boissons sucrées, les jus industriels et les sodas à l''Iftar — ils créent une hyperglycémie suivie d''une chute de glycémie et n''hydratent pas efficacement.</li>
  <li>Limiter le thé et le café qui ont un effet diurétique.</li>
  <li>Consommer des aliments riches en eau : concombres, tomates, pastèque, soupe.</li>
  <li>Éviter les efforts physiques intenses entre 14 h et 17 h, aux heures les plus chaudes.</li>
</ul>

<h2>Diabète et Ramadan : une consultation médicale obligatoire</h2>
<p>Le jeûne représente un <strong>risque médical réel</strong> pour les personnes diabétiques. L''hypoglycémie (chute de la glycémie) peut survenir en fin de journée, surtout chez les patients sous insuline ou sous sulfonylurées.</p>
<p>Avant le Ramadan, tout patient diabétique doit consulter son médecin ou son endocrinologue pour :</p>
<ul>
  <li>Évaluer s''il est médicalement apte à jeûner (les diabètes de type 1 instables et les diabètes de type 2 très déséquilibrés sont des contre-indications relatives)</li>
  <li>Adapter les doses d''insuline ou de médicaments oraux</li>
  <li>Définir les règles de rupture du jeûne en cas d''hypoglycémie (glycémie &lt; 0,70 g/L) ou d''hyperglycémie sévère (glycémie &gt; 3 g/L)</li>
  <li>Augmenter la fréquence de l''autosurveillance glycémique</li>
</ul>
<p><strong>Important :</strong> selon les juristes islamiques, la rupture du jeûne pour raison médicale est non seulement permise mais recommandée.</p>

<h2>Hypertension et médicaments cardiaques</h2>
<p>Les patients hypertendus sous traitement doivent adapter leurs horaires de prise avec leur médecin. En général :</p>
<ul>
  <li>Les médicaments à prise unique peuvent être décalés à l''Iftar ou au Sohour</li>
  <li>Les médicaments à deux prises sont souvent répartis entre Iftar et Sohour</li>
  <li>Certains médicaments (diurétiques) peuvent aggraver la déshydratation — leur réduction peut être envisagée pendant le Ramadan sous supervision médicale</li>
</ul>
<p>Ne jamais modifier son traitement seul, sans avis médical préalable.</p>

<h2>Femmes enceintes et allaitantes</h2>
<p>Le Ramadan n''est pas formellement contre-indiqué pendant la grossesse, mais les risques (déshydratation, hypoglycémie, faiblesse fœtale) augmentent avec l''avancement de la grossesse. Une consultation avec votre gynécologue-obstétricien avant le début du Ramadan est indispensable. Les femmes enceintes après le 6ème mois sont généralement dispensées, avec possibilité de jours de récupération (kaffara).</p>

<h2>Activité physique pendant le Ramadan</h2>
<p>Le sport reste possible et même bénéfique pendant le Ramadan, à condition de l''adapter :</p>
<ul>
  <li><strong>Meilleur créneau :</strong> 1 à 2 heures après l''Iftar, quand vous êtes réhydraté et rassasié</li>
  <li><strong>Type d''activité :</strong> marche rapide, natation légère, yoga — évitez les sports intenses qui génèrent une sudation importante</li>
  <li><strong>Durée :</strong> 30 à 45 minutes maximum pendant le jeûne</li>
  <li>Évitez tout effort pendant les 2 à 3 dernières heures avant l''Iftar</li>
</ul>

<h2>L''Iftar : éviter les erreurs fréquentes</h2>
<p>La tradition de l''Iftar tunisien — chorba, brik, dattes, lablabi — est savoureuse, mais les excès sont fréquents. Quelques conseils pour un Iftar équilibré :</p>
<ul>
  <li>Commencez par des dattes et de l''eau (sunna et biologiquement judicieux — les dattes fournissent du fructose à absorption rapide)</li>
  <li>Attendez 10 à 15 minutes avant d''attaquer le repas principal — votre estomac a besoin de temps pour se réveiller</li>
  <li>Évitez les fritures répétées (brik, bambalouni) qui alourdissent l''appareil digestif</li>
  <li>Finissez par un fruit frais plutôt qu''une pâtisserie trop sucrée</li>
</ul>

<h2>Conclusion</h2>
<p>Le Ramadan est compatible avec une bonne santé pour la grande majorité des personnes. Une préparation médicale, une hydratation adéquate et une alimentation équilibrée sont les clés pour traverser ce mois béni en pleine forme. Si vous avez une maladie chronique, n''attendez pas le premier jour du Ramadan pour consulter votre médecin — prenez rendez-vous à l''avance sur <strong>Doktori</strong>.</p>',
  'Dr. Équipe Doktori',
  'sante',
  '["ramadan", "jeûne", "diabète", "hypertension", "hydratation", "tunisie", "santé"]',
  true,
  '2026-04-30 09:00:00+01'
)
ON CONFLICT (slug) DO NOTHING;
