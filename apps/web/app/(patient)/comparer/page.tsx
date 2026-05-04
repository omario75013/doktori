import Link from "next/link";
import Image from "next/image";
import { db, doctors, reviews } from "@doktori/db";
import { inArray, eq, sql } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { StarRating } from "@/components/star-rating";
import { ArrowRight, MapPin, Stethoscope, GraduationCap, Languages, Coins } from "lucide-react";

export const dynamic = "force-dynamic";

type DoctorComparison = {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  city: string;
  address: string;
  photoUrl: string | null;
  consultationFee: number | null;
  yearsOfExperience: number | null;
  languages: string[];
  averageRating: number;
  reviewCount: number;
  subRatings: {
    punctuality: number;
    communication: number;
    cleanliness: number;
    staff: number;
  };
};

function fmtTND(millimes: number | null): string {
  if (millimes == null) return "—";
  return `${(millimes / 1000).toFixed(0)} TND`;
}

function specialtyLabel(id: string): string {
  return SPECIALTIES.find((s) => s.id === id)?.label ?? id;
}

function cityLabel(id: string): string {
  return CITIES.find((c) => c.id === id)?.label ?? id;
}

export default async function ComparerPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const idList = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (idList.length < 1) {
    return (
      <div className="min-h-screen bg-secondary px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-bold text-foreground">Comparateur de médecins</h1>
          <p className="mt-3 text-muted-foreground">
            Sélectionnez 2 ou 3 médecins depuis la recherche pour les comparer côte à côte.
          </p>
          <Link
            href="/recherche"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-doktori-teal-dark"
          >
            Aller à la recherche
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    );
  }

  const docRows = await db
    .select()
    .from(doctors)
    .where(inArray(doctors.id, idList));

  const docs: DoctorComparison[] = await Promise.all(
    docRows.map(async (d) => {
      const [agg] = await db
        .select({
          avg: sql<string | null>`AVG(${reviews.rating})::text`,
          count: sql<number>`COUNT(*)::int`,
          avgPunctuality: sql<string | null>`AVG(${reviews.punctualityRating})::text`,
          avgCommunication: sql<string | null>`AVG(${reviews.communicationRating})::text`,
          avgCleanliness: sql<string | null>`AVG(${reviews.cleanlinessRating})::text`,
          avgStaff: sql<string | null>`AVG(${reviews.staffRating})::text`,
        })
        .from(reviews)
        .where(eq(reviews.doctorId, d.id));

      return {
        id: d.id,
        slug: d.slug,
        name: d.name,
        specialty: d.specialty,
        city: d.city,
        address: d.address,
        photoUrl: d.photoUrl,
        consultationFee: d.consultationFee,
        yearsOfExperience: d.yearsOfExperience,
        languages: d.languages ?? [],
        averageRating: agg?.avg != null ? Number.parseFloat(agg.avg) : 0,
        reviewCount: agg?.count ?? 0,
        subRatings: {
          punctuality: agg?.avgPunctuality != null ? Number.parseFloat(agg.avgPunctuality) : 0,
          communication: agg?.avgCommunication != null ? Number.parseFloat(agg.avgCommunication) : 0,
          cleanliness: agg?.avgCleanliness != null ? Number.parseFloat(agg.avgCleanliness) : 0,
          staff: agg?.avgStaff != null ? Number.parseFloat(agg.avgStaff) : 0,
        },
      };
    })
  );

  // Preserve order from query string
  const ordered = idList
    .map((id) => docs.find((d) => d.id === id))
    .filter((d): d is DoctorComparison => Boolean(d));

  return (
    <div className="min-h-screen bg-secondary px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Comparer {ordered.length} médecin{ordered.length > 1 ? "s" : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparaison côte à côte pour vous aider à choisir.
          </p>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky start-0 bg-secondary/40 px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Critère
                </th>
                {ordered.map((d) => (
                  <th key={d.id} className="min-w-[220px] px-4 py-4 text-start">
                    <div className="flex flex-col items-start gap-2">
                      {d.photoUrl ? (
                        <Image
                          src={d.photoUrl}
                          alt={d.name}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                          {d.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <Link
                        href={`/medecin/${d.slug}`}
                        className="font-heading text-base font-bold text-foreground hover:text-primary"
                      >
                        Dr. {d.name}
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              <tr>
                <td className="px-4 py-3 font-semibold text-muted-foreground">
                  <Stethoscope className="me-1.5 inline h-4 w-4" /> Spécialité
                </td>
                {ordered.map((d) => (
                  <td key={d.id} className="px-4 py-3 text-foreground">
                    {specialtyLabel(d.specialty)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-muted-foreground">
                  <MapPin className="me-1.5 inline h-4 w-4" /> Ville
                </td>
                {ordered.map((d) => (
                  <td key={d.id} className="px-4 py-3 text-foreground">
                    {cityLabel(d.city)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-muted-foreground">
                  <Coins className="me-1.5 inline h-4 w-4" /> Tarif consultation
                </td>
                {ordered.map((d) => (
                  <td key={d.id} className="px-4 py-3 font-bold text-foreground">
                    {fmtTND(d.consultationFee)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-muted-foreground">
                  <GraduationCap className="me-1.5 inline h-4 w-4" /> Expérience
                </td>
                {ordered.map((d) => (
                  <td key={d.id} className="px-4 py-3 text-foreground">
                    {d.yearsOfExperience ? `${d.yearsOfExperience} ans` : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-muted-foreground">Note globale</td>
                {ordered.map((d) => (
                  <td key={d.id} className="px-4 py-3">
                    {d.reviewCount > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{d.averageRating.toFixed(1)}</span>
                        <StarRating value={d.averageRating} size="sm" readOnly />
                        <span className="text-xs text-muted-foreground">({d.reviewCount})</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Pas d'avis</span>
                    )}
                  </td>
                ))}
              </tr>
              {(["punctuality", "communication", "cleanliness", "staff"] as const).map((key) => {
                const labels = {
                  punctuality: "Ponctualité",
                  communication: "Communication",
                  cleanliness: "Propreté",
                  staff: "Personnel",
                };
                return (
                  <tr key={key}>
                    <td className="px-4 py-3 font-semibold text-muted-foreground">{labels[key]}</td>
                    {ordered.map((d) => (
                      <td key={d.id} className="px-4 py-3">
                        {d.subRatings[key] > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{d.subRatings[key].toFixed(1)}</span>
                            <StarRating value={d.subRatings[key]} size="sm" readOnly />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <td className="px-4 py-3 font-semibold text-muted-foreground">
                  <Languages className="me-1.5 inline h-4 w-4" /> Langues
                </td>
                {ordered.map((d) => (
                  <td key={d.id} className="px-4 py-3 text-foreground">
                    {d.languages.length > 0 ? d.languages.join(", ") : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-muted-foreground">Adresse</td>
                {ordered.map((d) => (
                  <td key={d.id} className="px-4 py-3 text-xs text-muted-foreground">
                    {d.address}
                  </td>
                ))}
              </tr>
              <tr className="bg-secondary/40">
                <td className="px-4 py-4"></td>
                {ordered.map((d) => (
                  <td key={d.id} className="px-4 py-4">
                    <Link
                      href={`/rdv/${d.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-doktori-teal-dark"
                    >
                      Réserver
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/recherche"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Retour à la recherche
          </Link>
        </div>
      </div>
    </div>
  );
}
