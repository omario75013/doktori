import type { Metadata } from "next";
import { Stethoscope, Shield, Heart, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "À propos | Doktori",
  description:
    "Doktori — la plateforme tunisienne de prise de rendez-vous médicaux en ligne. Notre mission, notre équipe, nos valeurs.",
  alternates: { canonical: "https://doktori.tn/a-propos" },
};

export default function AProposPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-[#F0FDFA] via-white to-[#F0FDFA] border-b border-[#E6F4F1]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0891B2]/10 px-4 py-2 text-sm font-medium text-[#0891B2] mb-6">
            <Heart className="h-4 w-4" />
            Plateforme de santé tunisienne
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#134E4A]">
            À propos de <span className="text-[#0891B2]">Doktori</span>
          </h1>
          <p className="mt-6 text-lg text-foreground/70 leading-relaxed">
            Doktori est la plateforme tunisienne qui simplifie la prise de rendez-vous médicaux.
            Nous mettons en relation patients et médecins pour faciliter l'accès aux soins,
            partout en Tunisie.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div>
          <h2 className="text-2xl font-bold text-[#134E4A] mb-4">Notre mission</h2>
          <p className="text-foreground/80 leading-relaxed">
            Permettre à chaque Tunisien de trouver le bon médecin et de prendre rendez-vous en
            moins de 60 secondes. Nous voulons réduire les barrières à l'accès aux soins en
            Tunisie : files d'attente téléphoniques, créneaux indisponibles, oublis de
            rendez-vous.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#E6F4F1] bg-white p-6">
            <div className="h-10 w-10 rounded-lg bg-[#0891B2]/10 flex items-center justify-center mb-4">
              <Stethoscope className="h-5 w-5 text-[#0891B2]" />
            </div>
            <h3 className="font-semibold text-[#134E4A] mb-2">Pour les patients</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">
              Recherche de médecins par spécialité, ville, ou nom. Réservation 24/7, rappels SMS,
              annulation en 1 clic. Gratuit pour les patients.
            </p>
          </div>
          <div className="rounded-xl border border-[#E6F4F1] bg-white p-6">
            <div className="h-10 w-10 rounded-lg bg-[#0891B2]/10 flex items-center justify-center mb-4">
              <Shield className="h-5 w-5 text-[#0891B2]" />
            </div>
            <h3 className="font-semibold text-[#134E4A] mb-2">Pour les médecins</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">
              Agenda en ligne 24/7, vitrine référencée Google, dossier patient électronique,
              ordonnances, statistiques en temps réel. Gestion d'équipe et secrétaires.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[#134E4A] mb-4">Nos valeurs</h2>
          <ul className="space-y-3 text-foreground/80">
            <li className="flex gap-3">
              <span className="text-[#0891B2] font-bold">•</span>
              <span>
                <strong className="text-[#134E4A]">Confidentialité.</strong> Les données de santé
                sont sensibles. Doktori applique des standards stricts de protection des données.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#0891B2] font-bold">•</span>
              <span>
                <strong className="text-[#134E4A]">Accessibilité.</strong> Plateforme gratuite
                pour les patients, disponible en français et en arabe, sur web et mobile.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#0891B2] font-bold">•</span>
              <span>
                <strong className="text-[#134E4A]">Fait en Tunisie.</strong> Une équipe locale qui
                comprend les besoins du système de santé tunisien et de ses professionnels.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#0891B2] font-bold">•</span>
              <span>
                <strong className="text-[#134E4A]">Responsabilité médicale.</strong> Doktori est
                un outil de gestion ; le médecin reste seul responsable de la prescription, du
                diagnostic et de la prise en charge clinique.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border-2 border-[#0891B2] bg-[#F0FDFA] p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-[#0891B2] flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#134E4A] mb-2">Couverture géographique</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Doktori est actuellement disponible dans le Grand Tunis (Tunis, Ariana, La Marsa,
                Manouba) et déploie progressivement dans les autres gouvernorats de Tunisie.
                Vous êtes médecin dans une autre ville ? Inscrivez-vous pour être notifié dès que
                nous arrivons chez vous.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E6F4F1] pt-8">
          <h2 className="text-2xl font-bold text-[#134E4A] mb-4">Contact</h2>
          <p className="text-foreground/80">
            Questions, suggestions, partenariats :{" "}
            <a
              href="mailto:contact@doktori.tn"
              className="text-[#0891B2] font-semibold hover:underline"
            >
              contact@doktori.tn
            </a>
          </p>
          <p className="text-sm text-foreground/60 mt-2">
            Édité par Random Walkers SUARL · Tunisie.
          </p>
        </div>
      </section>
    </main>
  );
}
