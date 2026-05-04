import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { MapPin, Star, Calendar, ChevronRight } from "lucide-react";
import { NewsletterSignup } from "@/components/newsletter-signup";

export async function generateStaticParams() {
  const params = [];
  for (const spec of SPECIALTIES) {
    for (const city of CITIES) {
      params.push({ specialite: spec.id, quartier: city.id });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ specialite: string; quartier: string }>;
}): Promise<Metadata> {
  const { specialite, quartier } = await params;
  const spec = SPECIALTIES.find((s) => s.id === specialite);
  const city = CITIES.find((c) => c.id === quartier);

  if (!spec || !city) return { title: "Page introuvable" };

  const title = `${spec.label} à ${city.label} — Prendre RDV en ligne | Doktori`;
  const description = `Trouvez un ${spec.label.toLowerCase()} à ${city.label} et prenez rendez-vous en ligne gratuitement sur Doktori. Créneaux disponibles en temps réel.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://doktori.tn/medecins/${specialite}/${quartier}`,
      type: "website",
    },
    alternates: {
      canonical: `https://doktori.tn/medecins/${specialite}/${quartier}`,
    },
  };
}

function getIntroText(specLabel: string, cityLabel: string): string {
  return `Vous cherchez un ${specLabel.toLowerCase()} à ${cityLabel} ? Doktori vous permet de consulter la liste des médecins disponibles dans votre quartier et de prendre rendez-vous en ligne en quelques secondes, sans attente ni appel téléphonique.

Les ${specLabel.toLowerCase()}s à ${cityLabel} proposent des consultations en cabinet, certains offrent également des visites à domicile ou des téléconsultations. Grâce à Doktori, vous accédez aux créneaux disponibles en temps réel, aux tarifs pratiqués, aux avis vérifiés d'autres patients et aux informations complètes sur chaque praticien.

Que vous ayez besoin d'un suivi régulier, d'une consultation urgente ou d'un deuxième avis médical, notre plateforme vous connecte instantanément avec les meilleurs spécialistes de ${cityLabel} et de ses environs. La prise de rendez-vous est 100% gratuite pour les patients — aucun abonnement requis.

Après votre consultation, vous pouvez laisser un avis sur la plateforme pour aider d'autres patients à choisir le bon médecin. Doktori s'engage à maintenir un annuaire médical à jour, vérifié et transparent pour toute la région du Grand Tunis.`;
}

function getFaqItems(specLabel: string, cityLabel: string) {
  return [
    {
      q: `Comment prendre rendez-vous avec un ${specLabel.toLowerCase()} à ${cityLabel} ?`,
      a: `Sur Doktori, sélectionnez le médecin de votre choix dans la liste ci-dessus, cliquez sur "Prendre rendez-vous", choisissez un créneau disponible et confirmez votre réservation. Vous recevrez une confirmation par SMS.`,
    },
    {
      q: `Quel est le tarif d'une consultation chez un ${specLabel.toLowerCase()} à ${cityLabel} ?`,
      a: `Les tarifs varient selon les médecins et leur expérience. Sur chaque fiche médecin Doktori, vous trouverez le tarif de consultation affiché clairement avant de réserver. Vous pouvez également filtrer par fourchette de prix.`,
    },
    {
      q: `Est-il possible de consulter un ${specLabel.toLowerCase()} en téléconsultation depuis ${cityLabel} ?`,
      a: `Oui, certains médecins proposent des consultations vidéo depuis leur domicile ou leur cabinet. Filtrez les médecins par mode de consultation "Téléconsultation" sur Doktori pour trouver ceux qui offrent ce service.`,
    },
  ];
}

export default async function SpecialiteCityPage({
  params,
}: {
  params: Promise<{ specialite: string; quartier: string }>;
}) {
  const { specialite, quartier } = await params;

  const spec = SPECIALTIES.find((s) => s.id === specialite);
  const city = CITIES.find((c) => c.id === quartier);

  if (!spec || !city) notFound();

  // Fetch matching doctors
  const matchingDoctors = await db
    .select({
      id: doctors.id,
      name: doctors.name,
      slug: doctors.slug,
      specialty: doctors.specialty,
      city: doctors.city,
      address: doctors.address,
      consultationFee: doctors.consultationFee,
      averageRating: doctors.averageRating,
      reviewCount: doctors.reviewCount,
      photoUrl: doctors.photoUrl,
      consultationMode: doctors.consultationMode,
      isActive: doctors.isActive,
    })
    .from(doctors)
    .where(
      and(
        eq(doctors.specialty, specialite),
        eq(doctors.city, quartier),
        eq(doctors.isActive, true)
      )
    )
    .limit(20);

  // Related cities (same specialty, other cities)
  const otherCities = CITIES.filter((c) => c.id !== quartier).slice(0, 4);
  // Related specialties (same city, other specialties)
  const otherSpecialties = SPECIALTIES.filter((s) => s.id !== specialite).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: `${spec.label} à ${city.label}`,
    description: `Consultez un ${spec.label.toLowerCase()} à ${city.label} et prenez rendez-vous en ligne sur Doktori.`,
    areaServed: {
      "@type": "City",
      name: city.label,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: city.governorate,
      },
    },
    medicalSpecialty: spec.label,
    url: `https://doktori.tn/medecins/${specialite}/${quartier}`,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://doktori.tn" },
      { "@type": "ListItem", position: 2, name: "Médecins", item: "https://doktori.tn/recherche" },
      {
        "@type": "ListItem",
        position: 3,
        name: spec.label,
        item: `https://doktori.tn/medecins/${specialite}/${quartier}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: city.label,
        item: `https://doktori.tn/medecins/${specialite}/${quartier}`,
      },
    ],
  };

  const faqItems = getFaqItems(spec.label, city.label);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="min-h-screen bg-secondary">
        {/* Hero */}
        <div className="bg-foreground py-12 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm text-teal-300 mb-4">
              <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
              <ChevronRight className="w-4 h-4" />
              <Link href="/recherche" className="hover:text-white transition-colors">Médecins</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white font-medium">{spec.label}</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white font-medium">{city.label}</span>
            </nav>

            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              {spec.label} à {city.label}
            </h1>
            <p className="text-teal-200 mt-2 text-lg">
              Prendre rendez-vous en ligne — rapide, gratuit, sans téléphone
            </p>
            <div className="mt-4 flex items-center gap-2 text-teal-300 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{city.label}, {city.governorate}</span>
              <span className="mx-2">·</span>
              <span>{matchingDoctors.length} médecin{matchingDoctors.length !== 1 ? "s" : ""} disponible{matchingDoctors.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
          {/* Intro */}
          <section className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="prose prose-teal max-w-none text-foreground text-sm leading-relaxed whitespace-pre-line">
              {getIntroText(spec.label, city.label)}
            </div>
          </section>

          {/* Doctors list */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">
              {spec.label}s à {city.label}
            </h2>

            {matchingDoctors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border p-8 shadow-sm space-y-6">
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Aucun médecin disponible à {city.label} en {spec.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Soyez prévenu(e) dès qu&apos;un médecin rejoint la plateforme dans votre zone.
                  </p>
                </div>
                <div className="max-w-sm mx-auto">
                  <NewsletterSignup
                    source="seo_empty_city"
                    language="fr"
                    placeholder="Votre adresse email"
                    buttonLabel="M'alerter"
                    successMessage="Merci ! Vous serez prévenu(e) dès qu'un médecin rejoint."
                  />
                </div>
                <div className="text-center">
                  <Link
                    href="/recherche"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <Calendar className="w-4 h-4" />
                    Ou chercher dans toute la Tunisie
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {matchingDoctors.map((doctor) => (
                  <Link
                    key={doctor.id}
                    href={`/medecin/${doctor.slug}`}
                    className="group bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-secondary">
                      {doctor.photoUrl ? (
                        <img
                          src={doctor.photoUrl}
                          alt={doctor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🩺</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        Dr {doctor.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">{doctor.address}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {doctor.averageRating ? (
                          <div className="flex items-center gap-1 text-xs text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="font-semibold">{Number(doctor.averageRating).toFixed(1)}</span>
                            <span className="text-muted-foreground">({doctor.reviewCount ?? 0})</span>
                          </div>
                        ) : null}
                        {doctor.consultationFee && (
                          <span className="text-xs font-semibold text-primary">
                            {(doctor.consultationFee / 1000).toFixed(0)} DT
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* FAQ */}
          <section className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-5">
              Questions fréquentes
            </h2>
            <div className="space-y-5">
              {faqItems.map((item, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-foreground mb-1.5">{item.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Internal links */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Same specialty, other cities */}
              <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                <h3 className="font-bold text-foreground mb-3 text-sm">
                  {spec.label} dans d&apos;autres villes
                </h3>
                <ul className="space-y-2">
                  {otherCities.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/medecins/${specialite}/${c.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {spec.label} à {c.label} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Other specialties, same city */}
              <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                <h3 className="font-bold text-foreground mb-3 text-sm">
                  Autres spécialités à {city.label}
                </h3>
                <ul className="space-y-2">
                  {otherSpecialties.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/medecins/${s.id}/${quartier}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {s.label} à {city.label} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
