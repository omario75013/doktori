import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ReviewsList } from "@/components/reviews-list";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [doctor] = await db.select().from(doctors).where(eq(doctors.slug, slug)).limit(1);
  if (!doctor) return {};
  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  return {
    title: `Avis sur ${doctor.name} — ${spec?.label} | Doktori`,
    description: `Consultez les avis vérifiés de patients sur ${doctor.name}, ${spec?.label} à ${doctor.city}.`,
  };
}

export default async function DoctorReviewsPage({ params }: Props) {
  const { slug } = await params;
  const [doctor] = await db.select().from(doctors).where(eq(doctors.slug, slug)).limit(1);
  if (!doctor) notFound();

  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/medecin/${slug}`} className="text-sm text-blue-600 hover:underline">← Retour au profil</Link>
      </div>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <h1 className="text-2xl font-bold">{doctor.name}</h1>
        <p className="text-blue-600">{spec?.label}</p>
        <p className="text-sm text-gray-500">{city?.label}</p>
      </div>

      <h2 className="text-xl font-bold mb-4">Avis des patients</h2>
      <ReviewsList doctorId={doctor.id} />
    </div>
  );
}
