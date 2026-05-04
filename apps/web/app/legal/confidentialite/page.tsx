import type { Metadata } from "next";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de Confidentialité | Doktori",
  description: "Politique de confidentialité et protection des données personnelles de Doktori.",
};

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-secondary">
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
            <h1 className="text-2xl font-bold">Politique de Confidentialité</h1>
            <p className="text-cyan-100 text-sm mt-0.5">Dernière mise à jour : 4 mai 2026</p>
          </div>
        </div>
      </div>

      {/* Content card */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="space-y-6 text-sm leading-relaxed text-gray-700">
            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">1. Responsable du traitement</h2>
              <p>
                Le responsable du traitement de vos données personnelles est <strong>Random Walkers SUARL</strong>,
                immatriculée au Registre National des Entreprises sous le n° <strong>1625867B</strong>, ayant son
                siège social à Immeuble Babel, Bloc D, Montplaisir 1073, Bab Bhar, Tunis — Tunisie.
              </p>
              <p className="mt-2">
                Email : <a href="mailto:contact@doktori.tn" className="text-primary hover:text-doktori-teal-dark hover:underline">contact@doktori.tn</a>
              </p>
              <p className="mt-2">
                La présente politique est établie en conformité avec la <strong>loi tunisienne n° 2004-63 du 27 juillet 2004</strong> relative
                à la protection des données à caractère personnel, ainsi que le <strong>Règlement Général sur la Protection des
                Données (RGPD)</strong> pour les utilisateurs européens.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">2. Engagement de Doktori</h2>
              <p>
                Doktori s&apos;engage à protéger la vie privée de ses utilisateurs et à traiter leurs données personnelles
                dans le respect de la loi organique n°2004-63 du 27 juillet 2004 relative à la protection des
                données personnelles en Tunisie, ainsi que des standards internationaux (RGPD européen).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">3. Données collectées</h2>
              <p><strong>Pour les patients :</strong></p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Nom, prénom</li>
                <li>Numéro de téléphone</li>
                <li>Email (optionnel)</li>
                <li>Historique de rendez-vous</li>
                <li>Géolocalisation (uniquement pour le service SOS Docteur, avec consentement)</li>
              </ul>
              <p className="mt-3"><strong>Pour les médecins :</strong></p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Nom, prénom, spécialité</li>
                <li>Coordonnées professionnelles (téléphone, email, adresse du cabinet)</li>
                <li>Tarifs et horaires</li>
                <li>Historique d'activité sur la Plateforme</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">4. Ce que nous ne stockons JAMAIS</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Diagnostics médicaux, pathologies, antécédents</li>
                <li>Allergies, traitements en cours, médicaments</li>
                <li>Ordonnances (seules les ordonnances explicitement générées par le médecin sont stockées)</li>
                <li>Résultats d'examens, imagerie médicale</li>
                <li>Données de carte bancaire (gérées par nos partenaires de paiement Flouci et Paymee)</li>
              </ul>
              <p className="mt-3 font-semibold text-foreground">
                Doktori est un outil de gestion de rendez-vous, pas un dossier médical électronique.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">5. Finalités du traitement</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Permettre la prise de rendez-vous et leur gestion</li>
                <li>Envoyer des rappels SMS et WhatsApp</li>
                <li>Fournir des statistiques anonymisées aux médecins</li>
                <li>Améliorer la qualité du service</li>
                <li>Prévenir les fraudes et abus</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">6. Sécurité</h2>
              <p>
                Les données sont stockées sur des serveurs sécurisés. Les mots de passe sont chiffrés (bcrypt).
                Les communications transitent via HTTPS. Des sauvegardes chiffrées sont effectuées quotidiennement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">7. Vos droits</h2>
              <p>Conformément à la loi, vous disposez des droits suivants :</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
                <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
                <li><strong>Droit de suppression</strong> : demander l'effacement de vos données</li>
                <li><strong>Droit d'opposition</strong> : refuser certains traitements</li>
                <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format lisible</li>
              </ul>
              <p className="mt-3">
                Pour exercer ces droits : <a href="mailto:privacy@doktori.tn" className="text-primary hover:text-doktori-teal-dark hover:underline">privacy@doktori.tn</a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">8. Cookies</h2>
              <p>
                Doktori utilise uniquement des cookies essentiels au fonctionnement (authentification, préférences
                linguistiques). Aucun cookie publicitaire ou de tracking tiers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">9. Conservation des données</h2>
              <p>
                Les données des rendez-vous sont conservées tant que le compte est actif. En cas de suppression
                de compte, les données sont effacées sous 30 jours, à l'exception des données comptables et
                légales conservées pour la durée requise par la loi.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">10. Partage avec des tiers</h2>
              <p>
                Doktori ne vend ni ne loue aucune donnée personnelle. Les données sont partagées uniquement avec :
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Les médecins, pour permettre la prise de rendez-vous</li>
                <li>Les opérateurs SMS (Ooredoo, Twilio) pour l'envoi de notifications</li>
                <li>Les fournisseurs de paiement (Flouci, Paymee) pour les abonnements</li>
                <li>Les autorités compétentes en cas d'obligation légale</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">11. Contact</h2>
              <p>
                Délégué à la protection des données : <a href="mailto:privacy@doktori.tn" className="text-primary hover:text-doktori-teal-dark hover:underline">privacy@doktori.tn</a>
              </p>
              <p className="mt-2">
                Vous pouvez également saisir l'Instance Nationale de Protection des Données Personnelles (INPDP) :
                <a href="https://www.inpdp.nat.tn" className="text-primary hover:text-doktori-teal-dark hover:underline" target="_blank" rel="noopener"> www.inpdp.nat.tn</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
