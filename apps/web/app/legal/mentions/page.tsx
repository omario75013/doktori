import type { Metadata } from "next";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions Légales | Doktori",
  description: "Informations légales de Doktori.tn — éditeur, hébergeur, protection des données.",
};

export default function MentionsPage() {
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
            <h1 className="text-2xl font-bold">Mentions Légales</h1>
            <p className="text-cyan-100 text-sm mt-0.5">Dernière mise à jour : 18 avril 2026</p>
          </div>
        </div>
      </div>

      {/* Content card */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-[#E6F4F1] bg-white p-8 shadow-sm">
          <div className="space-y-6 text-sm leading-relaxed text-gray-700">
            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">1. Éditeur du site</h2>
              <p>
                Le site <strong>Doktori.tn</strong> est édité par <strong>RANDOM WALKERS</strong>, Société Unipersonnelle à Responsabilité Limitée (SUARL) au capital de 1 400 TND, immatriculée au Registre National des Entreprises sous le n° <strong>1625867B</strong> (n° de gestion interne : B01130082019), dont le siège social est situé à l&apos;Immeuble Babel, Bloc D, Montplaisir, 1073 Bab Bhar, Tunis, Tunisie.
              </p>
              <ul className="mt-3 space-y-1.5">
                <li><strong>RNE :</strong> 1625867B</li>
                <li><strong>Code activité (NAT) :</strong> 74 — Consultations en informatique</li>
                <li><strong>Date début activité :</strong> 7 juin 2019</li>
                <li><strong>Gérant :</strong> Omar Harbi</li>
                {/* TODO: ajouter le matricule fiscal complet format 1234567/A/B/C/000 */}
                <li><strong>Matricule fiscal :</strong> <em className="text-amber-600">[À remplir — format complet avec code TVA]</em></li>
                <li><strong>Email :</strong> <a href="mailto:contact@doktori.tn" className="text-[#0891B2] hover:underline">contact@doktori.tn</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">2. Directeur de la publication</h2>
              <p>Omar Harbi, en qualité de Gérant de Random Walkers SUARL.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">3. Hébergement</h2>
              <p>
                Le site est hébergé par <strong>Hetzner Online GmbH</strong>, Industriestrasse 25, 91710 Gunzenhausen, Allemagne.
                Téléphone : +49 9831 505-0.
                Site web : <a href="https://www.hetzner.com" className="text-[#0891B2] hover:underline" target="_blank" rel="noopener">www.hetzner.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">4. Propriété intellectuelle</h2>
              <p>
                Le contenu, les marques, logos et éléments graphiques présents sur Doktori.tn sont la propriété exclusive de Random Walkers SUARL ou de leurs titulaires respectifs. Toute reproduction, représentation, modification ou adaptation, partielle ou totale, est strictement interdite sans autorisation préalable écrite.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">5. Protection des données personnelles</h2>
              <p>
                Conformément à la <strong>Loi organique n°2004-63 du 27 juillet 2004</strong> relative à la protection des données à caractère personnel, Random Walkers SUARL a procédé à la déclaration préalable auprès de l&apos;INPDP (Instance Nationale de Protection des Données Personnelles).
              </p>
              <ul className="mt-3 space-y-1.5">
                {/* TODO: renseigner le numéro de déclaration INPDP */}
                <li><strong>N° de déclaration INPDP :</strong> <em className="text-amber-600">[À remplir]</em></li>
                {/* TODO: désigner le DPO */}
                <li><strong>Délégué à la Protection des Données (DPO) :</strong> <em className="text-amber-600">[À remplir]</em></li>
                <li><strong>Contact DPO :</strong> <a href="mailto:dpo@doktori.tn" className="text-[#0891B2] hover:underline">dpo@doktori.tn</a></li>
              </ul>
              <p className="mt-3">
                Vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles. Pour exercer ces droits, contactez-nous à <a href="mailto:dpo@doktori.tn" className="text-[#0891B2] hover:underline">dpo@doktori.tn</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">6. Limitation de responsabilité</h2>
              <p>
                Doktori met tout en œuvre pour offrir un service de qualité mais ne saurait être tenu responsable d&apos;éventuelles erreurs ou indisponibilités temporaires. Les informations fournies par les médecins inscrits relèvent de leur seule responsabilité. Doktori ne fournit aucun avis médical.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">7. Droit applicable</h2>
              <p>
                Le présent site est soumis au droit tunisien. Tout litige relatif à l&apos;utilisation du site relève de la compétence exclusive des tribunaux de Tunis.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#134E4A] mb-3">8. Crédits</h2>
              <p>
                Conception et développement : Random Walkers SUARL.<br />
                Doktori.tn est la première initiative de Random Walkers dédiée à la santé digitale en Tunisie.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
