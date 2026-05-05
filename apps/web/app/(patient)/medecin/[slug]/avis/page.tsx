import { db, doctors } from "@doktori/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ReviewsList } from "@/components/reviews-list";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import Link from "next/link";
import type { Metadata } from "next";
import { Star, Quote, ArrowLeft, MapPin } from "lucide-react";

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
    alternates: { canonical: `https://doktori.tn/medecin/${slug}/avis` },
  };
}

export default async function DoctorReviewsPage({ params }: Props) {
  const { slug } = await params;
  const [doctor] = await db.select().from(doctors).where(eq(doctors.slug, slug)).limit(1);
  if (!doctor) notFound();

  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);

  return (
    <main className="min-h-screen bg-secondary">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href={`/medecin/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-doktori-teal-dark font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au profil
          </Link>
        </div>

        {/* Doctor summary card */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{doctor.name}</h1>
              <p className="text-primary font-medium">{spec?.label}</p>
              {city && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {city.label}
                </p>
              )}
            </div>
          </div>

          {/* Star bar summary header */}
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Avis des patients
              </h2>
            </div>
            {/* Star rating bars */}
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 w-20 shrink-0">
                    {Array.from({ length: stars }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-3 h-3 fill-yellow-400 text-yellow-400"
                        strokeWidth={1}
                      />
                    ))}
                  </div>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: stars === 5 ? "65%" : stars === 4 ? "20%" : stars === 3 ? "10%" : stars === 2 ? "3%" : "2%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews list */}
        <div className="space-y-4">
          <ReviewsList doctorId={doctor.id} />
        </div>
      </div>
    </main>
  );
}
