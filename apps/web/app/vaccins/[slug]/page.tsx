import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, vaccineInfoContent } from "@doktori/db";
import { asc, eq } from "drizzle-orm";
import { ChevronLeft, Syringe, ShieldCheck } from "lucide-react";

export async function generateStaticParams() {
  try {
    const all = await db.select({ slug: vaccineInfoContent.slug }).from(vaccineInfoContent);
    return all.map((v) => ({ slug: v.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [v] = await db.select().from(vaccineInfoContent).where(eq(vaccineInfoContent.slug, slug)).limit(1);
  if (!v) return { title: "Vaccin introuvable" };

  return {
    title: `${v.nameFr} — Calendrier vaccinal Tunisie | Doktori`,
    description: v.descriptionFr.slice(0, 160),
    alternates: { canonical: `https://doktori.tn/vaccins/${slug}` },
  };
}

export default async function VaccinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [vaccine] = await db
    .select()
    .from(vaccineInfoContent)
    .where(eq(vaccineInfoContent.slug, slug))
    .limit(1);
  if (!vaccine) notFound();

  const others = await db
    .select({ slug: vaccineInfoContent.slug, nameFr: vaccineInfoContent.nameFr })
    .from(vaccineInfoContent)
    .orderBy(asc(vaccineInfoContent.displayOrder))
    .limit(20);

  return (
    <main className="min-h-screen bg-secondary">
      <div className="bg-foreground py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/vaccins" className="text-teal-300 hover:text-white text-sm inline-flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Tous les vaccins
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-white mt-3 leading-tight">
            {vaccine.nameFr}
          </h1>
          {vaccine.isMandatoryTn && (
            <span className="inline-flex items-center gap-1 mt-3 bg-emerald-500/20 text-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Obligatoire en Tunisie
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <article className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
            <Syringe className="w-4 h-4" />
            <span>
              Âge :{" "}
              {vaccine.ageMinMonths === vaccine.ageMaxMonths
                ? `${vaccine.ageMinMonths} mois`
                : `${vaccine.ageMinMonths}-${vaccine.ageMaxMonths ?? "?"} mois`}
            </span>
            <span>·</span>
            <span>
              {vaccine.dosesCount} dose{vaccine.dosesCount > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-foreground leading-relaxed">{vaccine.descriptionFr}</p>
        </article>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-3">Autres vaccins du calendrier</h2>
          <div className="flex flex-wrap gap-2">
            {others
              .filter((o) => o.slug !== vaccine.slug)
              .map((o) => (
                <Link
                  key={o.slug}
                  href={`/vaccins/${o.slug}`}
                  className="text-xs font-semibold text-primary px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20"
                >
                  {o.nameFr}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
