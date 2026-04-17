import type { Metadata } from "next";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation | Doktori",
  description: "Conditions générales d'utilisation de la plateforme Doktori.",
};

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-[#F0FDFA]">
      {/* Teal header banner */}
      <div
        className="py-10 px-4 text-white"
        style={{ background: "linear-gradient(135deg, #0891B2 0%, #134E4A 100%)" }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Conditions Générales d'Utilisation</h1>
            <p className="text-cyan-100 text-sm mt-0.5">Dernière mise à jour : 10 avril 2026</p>
          </div>
        </div>
      </div>

      {/* Content card */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-8 shadow-sm">
          <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">1. Objet</h2>
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et
                conditions d'utilisation de la plateforme Doktori, accessible à l'adresse doktori.tn, ainsi que
                les droits et obligations des utilisateurs.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">2. Définitions</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Plateforme</strong> : le site web et l'application mobile Doktori.</li>
                <li><strong>Patient</strong> : toute personne utilisant la Plateforme pour rechercher et prendre rendez-vous avec un médecin.</li>
                <li><strong>Médecin</strong> : tout professionnel de santé inscrit sur la Plateforme.</li>
                <li><strong>Rendez-vous</strong> : une consultation programmée entre un patient et un médecin.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">3. Services proposés</h2>
              <p>
                Doktori est une plateforme de mise en relation entre patients et professionnels de santé. La Plateforme
                permet :
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>La recherche de médecins par spécialité, ville et disponibilité</li>
                <li>La prise de rendez-vous en ligne 24h/24</li>
                <li>La réception de rappels SMS et WhatsApp</li>
                <li>La gestion des rendez-vous (annulation, modification)</li>
                <li>Pour les médecins : la gestion d'agenda, des patients et des statistiques</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">4. Nature des services</h2>
              <p>
                <strong>Doktori n'est PAS un service d'urgence médicale.</strong> En cas d'urgence vitale, composez
                immédiatement le <strong>190 (SAMU)</strong> ou le <strong>198 (Protection Civile)</strong>.
              </p>
              <p className="mt-2">
                Le service SOS Docteur de la Plateforme est destiné exclusivement aux consultations urgentes
                <strong> non-vitales</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">5. Inscription et compte utilisateur</h2>
              <p>
                L'inscription sur la Plateforme est gratuite pour les patients. Les médecins bénéficient d'une
                période gratuite puis d'un abonnement payant. L'utilisateur s'engage à fournir des informations
                exactes et à les mettre à jour.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">6. Responsabilité</h2>
              <p>
                Doktori agit uniquement en qualité d'intermédiaire technique. La Plateforme ne saurait être tenue
                responsable de la qualité des consultations médicales, du contenu des avis patients, ni des
                décisions médicales prises par les praticiens.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">7. Données personnelles</h2>
              <p>
                Les données personnelles des utilisateurs sont traitées conformément à la
                <a href="/legal/confidentialite" className="text-[#0891B2] hover:text-[#0E7490] hover:underline"> Politique de Confidentialité </a>
                et à la loi organique n°2004-63 du 27 juillet 2004 relative à la protection des données
                personnelles en Tunisie.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">8. Propriété intellectuelle</h2>
              <p>
                Tous les éléments de la Plateforme (textes, logos, graphismes, code) sont la propriété exclusive de
                Doktori. Toute reproduction non autorisée est interdite.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">9. Droit applicable</h2>
              <p>
                Les présentes CGU sont régies par le droit tunisien. Tout litige sera soumis aux tribunaux
                compétents de Tunis.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">10. Contact</h2>
              <p>
                Pour toute question relative aux présentes CGU : <a href="mailto:contact@doktori.tn" className="text-[#0891B2] hover:text-[#0E7490] hover:underline">contact@doktori.tn</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
