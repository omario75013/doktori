export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { db, clinics, clinicDoctors } from "@doktori/db";
import { eq, sql } from "drizzle-orm";
import { CITIES } from "@doktori/shared";
import { Building2, MapPin, Phone, ChevronLeft } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cliniques en Tunisie | Doktori",
    description:
      "Trouvez une clinique près de chez vous en Tunisie. Consultez les médecins disponibles et prenez rendez-vous en ligne.",
  };
}

const PAGE_SIZE = 24;

export default async function CliniquesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; page?: string }>;
}) {
  const t = await getTranslations("cliniques");
  const { city: cityFilter, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build query — optionally filter by city
  const baseQuery = db
    .select({
      id: clinics.id,
      name: clinics.name,
      slug: clinics.slug,
      address: clinics.address,
      city: clinics.city,
      phone: clinics.phone,
      logoUrl: clinics.logoUrl,
      doctorCount: sql<number>`COUNT(DISTINCT ${clinicDoctors.doctorId})::int`,
    })
    .from(clinics)
    .leftJoin(clinicDoctors, eq(clinicDoctors.clinicId, clinics.id))
    .groupBy(
      clinics.id,
      clinics.name,
      clinics.slug,
      clinics.address,
      clinics.city,
      clinics.phone,
      clinics.logoUrl
    )
    .orderBy(clinics.name);

  const rows = cityFilter
    ? await baseQuery.where(eq(clinics.city, cityFilter)).limit(PAGE_SIZE).offset(offset)
    : await baseQuery.limit(PAGE_SIZE).offset(offset);

  const getCityLabel = (cityId: string) =>
    CITIES.find((c) => c.id === cityId)?.label ?? cityId;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        Accueil
      </Link>

      {/* Header */}
      <div className="mt-6">
        <h1 className="font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* City filter */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-foreground">{t("cityFilter")} :</span>
        <Link
          href="/cliniques"
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors ${
            !cityFilter
              ? "bg-primary text-white"
              : "border border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {t("allCities")}
        </Link>
        {CITIES.slice(0, 10).map((c) => (
          <Link
            key={c.id}
            href={`/cliniques?city=${c.id}`}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              cityFilter === c.id
                ? "bg-primary text-white"
                : "border border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {/* Grid */}
      {rows.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="font-semibold">{t("noClinics")}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((clinic) => (
            <Link
              key={clinic.id}
              href={`/centre-medical/${clinic.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Logo / placeholder */}
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
                  {clinic.logoUrl ? (
                    <Image
                      src={clinic.logoUrl}
                      alt={clinic.name}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-7 w-7 text-primary" strokeWidth={2} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-heading text-base font-bold text-foreground group-hover:text-primary">
                    {clinic.name}
                  </h2>
                  <div className="mt-1 inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-doktori-teal-dark">
                    {getCityLabel(clinic.city)}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                  <span className="line-clamp-2">{clinic.address}</span>
                </div>
                {clinic.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                    <span dir="ltr">{clinic.phone}</span>
                  </div>
                )}
              </div>

              {/* Doctor count + CTA */}
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-doktori-green-dark">
                  {t("doctorsCount", { count: clinic.doctorCount ?? 0 })}
                </span>
                <span className="text-xs font-bold text-primary group-hover:underline">
                  {t("viewClinic")} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {rows.length === PAGE_SIZE && (
        <div className="mt-10 flex justify-center gap-3">
          {page > 1 && (
            <Link
              href={`/cliniques?${cityFilter ? `city=${cityFilter}&` : ""}page=${page - 1}`}
              className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-foreground hover:border-primary hover:text-primary"
            >
              ← Précédent
            </Link>
          )}
          <Link
            href={`/cliniques?${cityFilter ? `city=${cityFilter}&` : ""}page=${page + 1}`}
            className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-foreground hover:border-primary hover:text-primary"
          >
            Suivant →
          </Link>
        </div>
      )}
    </div>
  );
}
