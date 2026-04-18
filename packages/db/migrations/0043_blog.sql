CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(255) NOT NULL UNIQUE,
  title varchar(500) NOT NULL,
  description text,
  content text NOT NULL,
  cover_image_url text,
  author varchar(255) NOT NULL DEFAULT 'Doktori',
  category varchar(50),
  tags jsonb DEFAULT '[]',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX blog_posts_published_idx ON blog_posts(is_published, published_at DESC);

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS verification_token varchar(64);
CREATE INDEX IF NOT EXISTS prescriptions_verification_token_idx ON prescriptions(verification_token);

INSERT INTO blog_posts (slug, title, description, content, author, category, tags, is_published, published_at)
VALUES (
  'comment-prendre-rendez-vous-medecin-tunis-2026',
  'Comment prendre rendez-vous chez un médecin à Tunis en 2026',
  'Guide pratique pour réserver votre consultation médicale en ligne à Tunis grâce à Doktori — la plateforme numéro 1 en Tunisie.',
  '<h2>Pourquoi réserver en ligne ?</h2>
<p>En 2026, prendre rendez-vous chez un médecin à Tunis n''a jamais été aussi simple. Fini les longues attentes au téléphone ou les files d''attente interminables dans les cabinets médicaux. Les plateformes numériques comme <strong>Doktori</strong> permettent aux patients tunisiens de réserver leur consultation en quelques clics, 24h/24 et 7j/7.</p>

<h2>Étape 1 : Choisir votre spécialité</h2>
<p>La première étape consiste à identifier le type de médecin dont vous avez besoin. Sur Doktori, vous pouvez rechercher parmi plus de 10 spécialités médicales disponibles à Tunis et dans sa région :</p>
<ul>
  <li><strong>Médecin généraliste</strong> — pour un bilan de santé général ou un suivi de routine</li>
  <li><strong>Dermatologue</strong> — pour les problèmes de peau, ongles ou cheveux</li>
  <li><strong>Cardiologue</strong> — pour le suivi cardiovasculaire</li>
  <li><strong>Pédiatre</strong> — pour la santé de vos enfants</li>
  <li><strong>Gynécologue</strong> — pour le suivi gynécologique et obstétrical</li>
</ul>

<h2>Étape 2 : Sélectionner un médecin à Tunis</h2>
<p>Une fois la spécialité choisie, parcourez les profils de médecins disponibles. Chaque fiche médecin sur Doktori affiche :</p>
<ul>
  <li>Les créneaux disponibles en temps réel</li>
  <li>Le lieu du cabinet (quartier, adresse précise)</li>
  <li>Le tarif de consultation</li>
  <li>Les avis vérifiés d''autres patients</li>
  <li>Les modes de consultation : cabinet, visite à domicile ou téléconsultation</li>
</ul>

<h2>Étape 3 : Réserver votre créneau</h2>
<p>Cliquez sur "Prendre rendez-vous", choisissez la date et l''heure qui vous conviennent parmi les créneaux disponibles, puis confirmez votre réservation. Vous recevrez immédiatement un SMS de confirmation ainsi qu''un rappel 24h avant votre rendez-vous.</p>

<h2>Étape 4 : Préparer votre consultation</h2>
<p>Avant de vous rendre chez le médecin, pensez à rassembler :</p>
<ul>
  <li>Votre carte CNAM ou votre assurance maladie complémentaire</li>
  <li>Vos ordonnances et résultats d''analyses précédents</li>
  <li>Une liste de vos médicaments actuels</li>
  <li>Vos questions préparées à l''avance</li>
</ul>

<h2>Le cas des urgences non-vitales</h2>
<p>Pour les situations urgentes mais non mortelles — une forte fièvre un dimanche soir, une douleur intense — Doktori propose un service <strong>SOS Docteur</strong>. Des médecins disponibles se déplacent à votre domicile dans un rayon défini, généralement dans l''heure qui suit votre demande.</p>

<h2>Annulation et modification</h2>
<p>La vie est imprévisible. Si votre planning change, vous pouvez annuler ou modifier votre rendez-vous directement depuis la plateforme, en 1 clic, jusqu''à 2 heures avant l''heure prévue. Aucune pénalité ne s''applique pour une annulation respectueuse du délai.</p>

<h2>Conclusion</h2>
<p>Avec Doktori, prendre rendez-vous chez un médecin à Tunis est devenu aussi simple qu''une commande en ligne. La plateforme compte aujourd''hui des centaines de médecins dans toute la région du Grand Tunis — La Marsa, Ariana, Lac 1, Lac 2, La Soukra — prêts à vous accueillir. Inscrivez-vous gratuitement et profitez d''une santé sans stress.</p>',
  'Doktori',
  'guide',
  '["guide", "tunis", "rendez-vous", "médecin"]',
  true,
  now()
)
ON CONFLICT (slug) DO NOTHING;
