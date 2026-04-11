import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions Légales | Doktori",
  description: "Informations légales de Doktori.",
};

export default function MentionsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Mentions Légales</h1>
      <p className="text-gray-500 mb-8">Dernière mise à jour : 10 avril 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-3">Éditeur du site</h2>
          <p>
            Le site Doktori.tn est édité par [RAISON SOCIALE — à compléter lors de l'immatriculation],
            société [forme juridique] au capital de [montant] DT, dont le siège social est situé
            à [adresse à Tunis], Tunisie.
          </p>
          <ul className="mt-3 space-y-1">
            <li><strong>Registre du Commerce :</strong> [à compléter]</li>
            <li><strong>Matricule Fiscal :</strong> [à compléter]</li>
            <li><strong>Email :</strong> <a href="mailto:contact@doktori.tn" className="text-blue-600 hover:underline">contact@doktori.tn</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Directeur de la publication</h2>
          <p>[Nom du représentant légal — à compléter]</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Hébergement</h2>
          <p>
            Le site est hébergé par Hetzner Online GmbH, Industriestrasse 25, 91710 Gunzenhausen, Allemagne.
            Site web : <a href="https://www.hetzner.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener">www.hetzner.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Propriété intellectuelle</h2>
          <p>
            L'ensemble du contenu du site Doktori.tn (textes, logos, graphismes, code source) est protégé par
            les lois tunisiennes et internationales relatives à la propriété intellectuelle. Toute reproduction,
            représentation, modification ou adaptation, partielle ou totale, est strictement interdite sans
            autorisation préalable écrite.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Limitation de responsabilité</h2>
          <p>
            Doktori met tout en œuvre pour offrir un service de qualité mais ne saurait être tenu responsable
            d'éventuelles erreurs ou indisponibilités temporaires. Les informations fournies par les médecins
            inscrits relèvent de leur seule responsabilité.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Crédits</h2>
          <p>
            Conception et développement : Équipe Doktori.<br />
            Le design s'inspire des meilleures pratiques UX/UI contemporaines.
          </p>
        </section>
      </div>
    </div>
  );
}
