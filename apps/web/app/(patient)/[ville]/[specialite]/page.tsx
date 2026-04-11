import { db, doctors } from "@doktori/db";
import { eq, and } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { DoctorCard } from "@/components/doctor-card";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ ville: string; specialite: string }>;
}

export async function generateStaticParams() {
  const params: Array<{ ville: string; specialite: string }> = [];
  for (const city of CITIES) {
    for (const spec of SPECIALTIES) {
      params.push({ ville: city.id, specialite: spec.id });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ville, specialite } = await params;
  const city = CITIES.find((c) => c.id === ville);
  const spec = SPECIALTIES.find((s) => s.id === specialite);
  if (!city || !spec) return {};

  return {
    title: `${spec.label} à ${city.label} — Prendre RDV en ligne | Doktori`,
    description: `Trouvez votre ${spec.label.toLowerCase()} à ${city.label} et réservez votre rendez-vous en ligne. Consultez les disponibilités et prenez RDV en 2 clics sur Doktori.`,
  };
}

export default async function SEOListingPage({ params }: Props) {
  const { ville, specialite } = await params;
  const city = CITIES.find((c) => c.id === ville);
  const spec = SPECIALTIES.find((s) => s.id === specialite);
  if (!city || !spec) notFound();

  const results = await db
    .select()
    .from(doctors)
    .where(and(eq(doctors.city, ville), eq(doctors.specialty, specialite), eq(doctors.isActive, true)));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{spec.label} à {city.label}</h1>
      <p className="text-gray-500 mb-6">
        {results.length} {spec.label.toLowerCase()}(s) disponible(s) — Réservez en ligne
      </p>

      {results.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-gray-400 mb-4">Aucun {spec.label.toLowerCase()} inscrit dans ce quartier pour le moment.</p>
          <p className="text-sm text-gray-400">
            Vous êtes {spec.label.toLowerCase()} à {city.label} ?{" "}
            <a href="/inscription" className="text-blue-600 hover:underline">
              Inscrivez-vous gratuitement
            </a>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((d) => (
            <DoctorCard key={d.id} doctor={d} />
          ))}
        </div>
      )}
    </div>
  );
}
