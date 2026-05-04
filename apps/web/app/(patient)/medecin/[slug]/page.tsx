export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { QRCode } from "@/components/qr-code";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  getDoctorBySlug,
  getDoctorSchedule,
  getAllDoctorSlugs,
  getDoctorAppointmentTypes,
  db,
  reviews,
  patients,
  doctorPractices,
  doctors,
  clinics,
} from "@doktori/db";
import { desc, eq, sql, and, asc } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  GraduationCap,
  Languages,
  MapPin,
  MessageSquareText,
  Phone,
  Quote,
  ShieldCheck,
  Star,
  Stethoscope,
  Sparkles,
  ChevronLeft,
  Zap,
  Video,
  Info,
} from "lucide-react";
import {
  AnimatedSection,
  AnimatedCTAButton,
  TrustSignals,
} from "@/components/doctor-profile-animated";
import { FavoriteButton } from "@/components/favorite-button";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;
const DAY_FULL_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function getSpecialtyLabel(specialtyId: string): string {
  return SPECIALTIES.find((s) => s.id === specialtyId)?.label || specialtyId;
}

function getCityLabel(cityId: string): string {
  return CITIES.find((c) => c.id === cityId)?.label || cityId;
}

function anonymizeName(full: string): string {
  const parts = full.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const lastInitial = parts[parts.length - 1]?.[0] ?? "";
  return `${first} ${lastInitial}.`;
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const then = date.getTime();
  const diffMs = Math.max(0, now - then);
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.floor(diffMs / dayMs);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "il y a 1 semaine" : `il y a ${weeks} semaines`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "il y a 1 mois" : `il y a ${months} mois`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "il y a 1 an" : `il y a ${years} ans`;
}

function StarRating({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const rounded = Math.round(value);
  const dim = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= rounded
              ? `${dim} fill-doktori-amber text-doktori-amber`
              : `${dim} fill-gray-200 text-gray-200`
          }
        />
      ))}
    </div>
  );
}

export async function generateStaticParams() {
  try {
    const slugs = await getAllDoctorSlugs();
    return slugs.map((row) => ({ slug: row.slug }));
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
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "meta" });
  const doctor = await getDoctorBySlug(slug);
  if (!doctor) return { title: t("doctorNotFound") };
  const specialtyLabel = getSpecialtyLabel(doctor.specialty);
  const cityLabel = getCityLabel(doctor.city);
  return {
    title: t("doctorTitle", { name: doctor.name, specialty: specialtyLabel, city: cityLabel }),
    description: t("doctorDescription", { name: doctor.name, specialty: specialtyLabel, city: cityLabel }),
    alternates: {
      canonical: `https://doktori.tn/medecin/${slug}`,
    },
    openGraph: {
      title: `Dr. ${doctor.name} — ${specialtyLabel} à ${cityLabel}`,
      description: `Prenez rendez-vous avec Dr. ${doctor.name}, ${specialtyLabel} à ${cityLabel}. Consultation en ligne sur Doktori.`,
      url: `https://doktori.tn/medecin/${doctor.slug}`,
      siteName: "Doktori",
      type: "profile",
      locale: locale === "ar" ? "ar_TN" : "fr_TN",
      images: doctor.photoUrl
        ? [{ url: doctor.photoUrl, width: 400, height: 400, alt: `Dr. ${doctor.name}` }]
        : [],
    },
    twitter: {
      card: "summary",
      title: `Dr. ${doctor.name} — ${specialtyLabel}`,
      description: `${specialtyLabel} à ${cityLabel} — Doktori`,
    },
  };
}

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doctor = await getDoctorBySlug(slug);
  if (!doctor) notFound();

  const schedule = await getDoctorSchedule(doctor.id);
  const appointmentTypesList = await getDoctorAppointmentTypes(doctor.id);
  const specialtyLabel = getSpecialtyLabel(doctor.specialty);
  const cityLabel = getCityLabel(doctor.city);

  // Similar doctors — same specialty + same city, top 3 by rating
  const similarDoctors = await db
    .select({
      id: doctors.id,
      slug: doctors.slug,
      fullName: doctors.name,
      photoUrl: doctors.photoUrl,
      specialty: doctors.specialty,
      city: doctors.city,
      rating: doctors.averageRating,
      totalReviews: doctors.reviewCount,
    })
    .from(doctors)
    .where(
      and(
        eq(doctors.specialty, doctor.specialty),
        eq(doctors.city, doctor.city),
        eq(doctors.isActive, true),
        eq(doctors.isVisible, true),
        sql`${doctors.id} <> ${doctor.id}`,
      )
    )
    .orderBy(desc(sql`COALESCE(${doctors.averageRating}, 0)`))
    .limit(3);

  // Fetch active practices with optional clinic info
  const practiceRows = await db
    .select({
      id: doctorPractices.id,
      name: doctorPractices.name,
      address: doctorPractices.address,
      city: doctorPractices.city,
      phone: doctorPractices.phone,
      isPrimary: doctorPractices.isPrimary,
      clinicId: doctorPractices.clinicId,
      clinicName: clinics.name,
      photos: doctorPractices.photos,
    })
    .from(doctorPractices)
    .leftJoin(clinics, eq(doctorPractices.clinicId, clinics.id))
    .where(and(eq(doctorPractices.doctorId, doctor.id), eq(doctorPractices.isActive, true)))
    .orderBy(desc(doctorPractices.isPrimary), asc(doctorPractices.createdAt));

  // Collect all cabinet photos across practices (max 6 shown)
  const cabinetPhotos = practiceRows.flatMap((p) => p.photos ?? []).slice(0, 6);

  // Reviews — aggregate + latest 10 (joined with patient name)
  const [aggregateRow] = await db
    .select({
      avg: sql<string | null>`AVG(${reviews.rating})::text`,
      count: sql<number>`COUNT(*)::int`,
      avgPunctuality: sql<string | null>`AVG(${reviews.punctualityRating})::text`,
      avgCommunication: sql<string | null>`AVG(${reviews.communicationRating})::text`,
      avgCleanliness: sql<string | null>`AVG(${reviews.cleanlinessRating})::text`,
      avgStaff: sql<string | null>`AVG(${reviews.staffRating})::text`,
    })
    .from(reviews)
    .where(eq(reviews.doctorId, doctor.id));

  const reviewCount = aggregateRow?.count ?? 0;
  const averageRating =
    aggregateRow?.avg != null ? Number.parseFloat(aggregateRow.avg) : 0;
  const subRatings = {
    punctuality: aggregateRow?.avgPunctuality != null ? Number.parseFloat(aggregateRow.avgPunctuality) : 0,
    communication: aggregateRow?.avgCommunication != null ? Number.parseFloat(aggregateRow.avgCommunication) : 0,
    cleanliness: aggregateRow?.avgCleanliness != null ? Number.parseFloat(aggregateRow.avgCleanliness) : 0,
    staff: aggregateRow?.avgStaff != null ? Number.parseFloat(aggregateRow.avgStaff) : 0,
  };

  const latestReviews = reviewCount
    ? await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          verified: reviews.verified,
          createdAt: reviews.createdAt,
          patientName: patients.name,
        })
        .from(reviews)
        .innerJoin(patients, eq(reviews.patientId, patients.id))
        .where(eq(reviews.doctorId, doctor.id))
        .orderBy(desc(reviews.createdAt))
        .limit(10)
    : [];

  // Group schedule rows by day
  const scheduleByDay = schedule.reduce<
    Record<number, Array<{ startTime: string; endTime: string }>>
  >((acc, row) => {
    if (!row.isActive) return acc;
    const entries = acc[row.dayOfWeek] ?? [];
    entries.push({ startTime: row.startTime, endTime: row.endTime });
    acc[row.dayOfWeek] = entries;
    return acc;
  }, {});

  // Build full 7-day schedule (with closed days)
  const fullSchedule = [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => ({
    dayIdx,
    dayName: DAY_FULL_NAMES[dayIdx],
    dayShort: DAY_NAMES[dayIdx],
    slots: scheduleByDay[dayIdx] || [],
  }));

  const educations = doctor.educations ?? [];
  const experiences = doctor.experiences ?? [];
  const languages = doctor.languages ?? [];
  const expertise = doctor.expertise ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: doctor.name,
    medicalSpecialty: specialtyLabel,
    // phone not exposed publicly
    ...(doctor.photoUrl && { image: doctor.photoUrl }),
    address: {
      "@type": "PostalAddress",
      streetAddress: doctor.address,
      addressLocality: cityLabel,
      addressCountry: "TN",
    },
    url: `https://doktori.tn/medecin/${doctor.slug}`,
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: averageRating.toFixed(1),
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(appointmentTypesList.length > 0 && {
      availableService: appointmentTypesList.map((t) => ({
        "@type": "MedicalProcedure",
        name: t.name,
        procedureType: "https://schema.org/NoninvasiveProcedure",
        ...(t.fee != null && {
          offers: {
            "@type": "Offer",
            price: (t.fee / 1000).toFixed(0),
            priceCurrency: "TND",
          },
        }),
      })),
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-secondary/30 dark:bg-gray-900">
        {/* Back link */}
        <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
          <Link
            href="/recherche"
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            Retour à la recherche
          </Link>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {/* ═════ MOBILE STICKY CTA ═════ */}
          <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-border bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 max-w-lg mx-auto">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-muted-foreground truncate">{doctor.name}</div>
                <div className="text-xs text-primary font-semibold">{specialtyLabel}</div>
              </div>
              {doctor.consultationMode === "teleconsult" ? (
                <Link
                  href={`/rdv/${doctor.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-600/20 active:scale-[0.97]"
                >
                  <Video className="h-4 w-4" strokeWidth={2.5} />
                  RDV vidéo
                </Link>
              ) : (
                <Link
                  href={`/rdv/${doctor.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 active:scale-[0.97]"
                >
                  <Calendar className="h-4 w-4" strokeWidth={2.5} />
                  Prendre RDV
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px] pb-20 lg:pb-0">
            {/* ═════ LEFT COLUMN ═════ */}
            <div className="space-y-6">
              {/* Header card */}
              <AnimatedSection index={0} className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
                {/* Cover banner — Doktori teal gradient */}
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-foreground via-primary to-doktori-teal-light">
                  {/* Grid overlay */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)`,
                      backgroundSize: "28px 28px",
                    }}
                  />
                  {/* Decorative circles */}
                  <div aria-hidden className="absolute -top-8 -end-8 h-40 w-40 rounded-full bg-white/10" />
                  <div aria-hidden className="absolute -bottom-10 end-24 h-28 w-28 rounded-full bg-foreground/30" />
                  <div aria-hidden className="absolute top-4 start-1/3 h-16 w-16 rounded-full bg-white/8" />
                  <div aria-hidden className="absolute -top-4 start-8 h-20 w-20 rounded-full bg-primary/40" />
                </div>

                <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
                  {/* Avatar floating above banner */}
                  <div className="-mt-16 flex items-end justify-between gap-4">
                    <div className="relative">
                      {doctor.photoUrl ? (
                        <div className="h-28 w-28 overflow-hidden rounded-3xl ring-4 ring-white shadow-lg sm:h-32 sm:w-32">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doctor.photoUrl}
                            alt={doctor.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-primary font-heading text-3xl font-black text-white ring-4 ring-white sm:h-32 sm:w-32">
                          {doctor.name
                            .split(" ")
                            .slice(-2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -end-1 flex h-8 w-8 items-center justify-center rounded-full bg-white ring-2 ring-white">
                        <BadgeCheck className="h-7 w-7 fill-accent text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  {/* Name + specialty */}
                  <div className="mt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h1 className="font-heading text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                            {doctor.name}
                          </h1>
                          <FavoriteButton doctorId={doctor.id} size="sm" />
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <Stethoscope className="h-4 w-4 text-primary" strokeWidth={2.5} />
                          <span className="text-sm font-bold text-primary">
                            {specialtyLabel}
                          </span>
                          {(doctor.consultationMode === "teleconsult" || doctor.consultationMode === "both") && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800">
                              <Video className="h-3 w-3" strokeWidth={2.5} />
                              Téléconsultation disponible
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Only teleconsult fee shown (prepaid platform service) */}
                      {(doctor.consultationMode === "teleconsult" || doctor.consultationMode === "both") && doctor.teleconsultFee != null && (
                        <div className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-2 text-end">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-purple-600">
                            Téléconsultation
                          </div>
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="font-heading text-2xl font-black text-purple-700">
                              {(doctor.teleconsultFee / 1000).toFixed(0)}
                            </span>
                            <span className="text-sm font-bold text-purple-500">DT</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-doktori-green-dark">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
                        Disponible aujourd&apos;hui
                      </div>
                      {(() => {
                        const last = doctor.lastActiveAt as string | Date | null | undefined;
                        if (!last) return null;
                        const ts = typeof last === "string" ? new Date(last) : last;
                        if (Number.isNaN(ts.getTime())) return null;
                        const diffMs = Date.now() - ts.getTime();
                        const online = diffMs < 5 * 60_000;
                        let label: string;
                        if (online) label = "En ligne";
                        else if (diffMs < 60 * 60_000) label = `Vu il y a ${Math.floor(diffMs / 60_000)} min`;
                        else if (diffMs < 24 * 3600_000) label = `Vu il y a ${Math.floor(diffMs / 3600_000)} h`;
                        else label = `Vu il y a ${Math.floor(diffMs / (24 * 3600_000))} j`;
                        return (
                          <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${online ? "bg-green-100 text-green-800" : "bg-gray-100 text-muted-foreground"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-green-500" : "bg-gray-400"}`} />
                            {label}
                          </div>
                        );
                      })()}
                      {reviewCount > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#92400E]">
                          <Star className="h-3 w-3 fill-doktori-amber text-doktori-amber" />
                          {averageRating.toFixed(1)} ({reviewCount}{" "}
                          {reviewCount > 1 ? "avis" : "avis"})
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-muted-foreground">
                          <Star className="h-3 w-3" />
                          Aucun avis
                        </div>
                      )}
                      <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-doktori-teal-dark">
                        <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                        Vérifié par Doktori
                      </div>
                      {doctor.yearsOfExperience != null && doctor.yearsOfExperience > 0 && (
                        <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-doktori-teal-dark">
                          <Briefcase className="h-3 w-3" strokeWidth={2.5} />
                          {doctor.yearsOfExperience} ans d&apos;expérience
                        </div>
                      )}
                    </div>

                    {/* Address — hidden for teleconsult-only doctors */}
                    {doctor.consultationMode !== "teleconsult" && (
                      <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                        <span>{doctor.address}</span>
                      </div>
                    )}

                    {/* CNAM price estimator link */}
                    {doctor.consultationFee != null && (
                      <div className="mt-3">
                        <Link
                          href={`/devis/${doctor.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:border-primary"
                        >
                          <span aria-hidden>💰</span>
                          Estimer le prix CNAM / mutuelle
                        </Link>
                      </div>
                    )}

                    {/* Teleconsult-only info box */}
                    {doctor.consultationMode === "teleconsult" && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl bg-purple-50 px-4 py-3 text-sm text-purple-900 ring-1 ring-purple-200">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" strokeWidth={2.5} />
                        <p className="font-medium">Ce médecin consulte uniquement en vidéo. Aucun déplacement nécessaire.</p>
                      </div>
                    )}
                  </div>
                </div>
              </AnimatedSection>

              {/* Trust signals */}
              <TrustSignals
                averageRating={averageRating}
                reviewCount={reviewCount}
                acceptsNewPatients
              />

              {/* About section */}
              <AnimatedSection index={1} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <h2 className="font-heading text-lg font-bold text-foreground">
                    À propos
                  </h2>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {doctor.bio ||
                    `${doctor.name} est ${specialtyLabel.toLowerCase()} à ${cityLabel}. Passionné(e) par la santé de ses patients, le Dr vous accueille dans un cabinet moderne et bienveillant. Réservez votre consultation en quelques clics via Doktori.`}
                </p>
              </AnimatedSection>

              {/* Cabinet photo gallery — only shown when at least one photo exists */}
              {cabinetPhotos.length > 0 && (
                <AnimatedSection index={2} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Building2 className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      Photos du cabinet
                    </h2>
                  </div>
                  <div className={`grid gap-2 ${cabinetPhotos.length === 1 ? "grid-cols-1" : cabinetPhotos.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {cabinetPhotos.slice(0, 3).map((photo, i) => (
                      <a
                        key={i}
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-2xl aspect-video bg-secondary hover:opacity-90 transition-opacity"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.alt ?? `Photo du cabinet ${i + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </a>
                    ))}
                  </div>
                  {cabinetPhotos.length > 3 && (
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      +{cabinetPhotos.length - 3} photo{cabinetPhotos.length - 3 > 1 ? "s" : ""} supplémentaire{cabinetPhotos.length - 3 > 1 ? "s" : ""}
                    </p>
                  )}
                </AnimatedSection>
              )}

              {/* Lieux de consultation */}
              {practiceRows.length > 0 && doctor.consultationMode !== "teleconsult" && (
                <AnimatedSection index={2} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <MapPin className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      Lieux de consultation
                    </h2>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {practiceRows.map((practice) => (
                      <div
                        key={practice.id}
                        className={`relative rounded-xl border-2 p-4 ${
                          practice.clinicId
                            ? "border-primary/30 bg-secondary/40"
                            : "border-border bg-white"
                        }`}
                      >
                        {practice.isPrimary && (
                          <span className="mb-2 inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-doktori-green-dark">
                            Cabinet principal
                          </span>
                        )}
                        <div className="flex items-start gap-2">
                          {practice.clinicId ? (
                            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                          ) : (
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2.5} />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground leading-snug">
                              {practice.name}
                            </div>
                            {practice.clinicName && practice.clinicName !== practice.name && (
                              <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                <Building2 className="h-3 w-3" strokeWidth={2.5} />
                                {practice.clinicName}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-muted-foreground">
                              {practice.address}
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">
                              {getCityLabel(practice.city)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AnimatedSection>
              )}

              {/* Expertises */}
              {expertise.length > 0 && (
                <AnimatedSection index={3} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      Expertises
                    </h2>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {expertise.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-bold text-doktori-teal-dark"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {item}
                      </span>
                    ))}
                  </div>
                </AnimatedSection>
              )}

              {/* Formation */}
              {educations.length > 0 && (
                <AnimatedSection index={3} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      Formation
                    </h2>
                  </div>
                  <ol className="mt-5 relative">
                    {[...educations]
                      .sort((a, b) => b.year - a.year)
                      .map((edu, i, arr) => (
                        <li key={`${edu.year}-${edu.degree}-${i}`} className="relative ps-8 pb-5 last:pb-0">
                          {i < arr.length - 1 && (
                            <span
                              aria-hidden
                              className="absolute start-[11px] top-5 h-full w-px bg-border"
                            />
                          )}
                          <span
                            aria-hidden
                            className="absolute start-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary ring-2 ring-white"
                          >
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          </span>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-doktori-teal-dark">
                            {edu.year}
                          </div>
                          <div className="mt-0.5 text-sm font-bold text-foreground">
                            {edu.degree}
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">
                            {edu.institution}
                          </div>
                        </li>
                      ))}
                  </ol>
                </AnimatedSection>
              )}

              {/* Expérience */}
              {experiences.length > 0 && (
                <AnimatedSection index={4} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Briefcase className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      Expérience
                    </h2>
                  </div>
                  <ol className="mt-5 relative">
                    {[...experiences]
                      .sort((a, b) => {
                        const ae = a.endYear ?? 9999;
                        const be = b.endYear ?? 9999;
                        if (be !== ae) return be - ae;
                        return b.startYear - a.startYear;
                      })
                      .map((exp, i, arr) => (
                        <li
                          key={`${exp.startYear}-${exp.role}-${i}`}
                          className="relative ps-8 pb-5 last:pb-0"
                        >
                          {i < arr.length - 1 && (
                            <span
                              aria-hidden
                              className="absolute start-[11px] top-5 h-full w-px bg-border"
                            />
                          )}
                          <span
                            aria-hidden
                            className="absolute start-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary ring-2 ring-white"
                          >
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          </span>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-doktori-teal-dark">
                            {exp.startYear} – {exp.endYear ?? "aujourd'hui"}
                          </div>
                          <div className="mt-0.5 text-sm font-bold text-foreground">
                            {exp.role}
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">
                            {exp.place}
                          </div>
                        </li>
                      ))}
                  </ol>
                </AnimatedSection>
              )}

              {/* Langues parlées */}
              {languages.length > 0 && (
                <AnimatedSection index={5} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Languages className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      Langues parlées
                    </h2>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-foreground shadow-sm"
                      >
                        <Languages className="h-3 w-3 text-primary" strokeWidth={2.5} />
                        {lang}
                      </span>
                    ))}
                  </div>
                </AnimatedSection>
              )}

              {/* Appointment types (motifs) */}
              {appointmentTypesList.length > 0 && (
                <AnimatedSection index={6} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      Motifs de consultation
                    </h2>
                  </div>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {appointmentTypesList.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: t.color }}
                            aria-hidden
                          />
                          <div>
                            <div className="text-sm font-bold text-foreground">{t.name}</div>
                            <div className="text-xs font-medium text-muted-foreground">
                              {t.durationMinutes} min
                            </div>
                          </div>
                        </div>
                        {/* Fee hidden on public profile */}
                      </li>
                    ))}
                  </ul>
                </AnimatedSection>
              )}

              {/* Weekly schedule */}
              <AnimatedSection index={7} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Calendar className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      Horaires
                    </h2>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {fullSchedule.map((day) => (
                    <div
                      key={day.dayIdx}
                      className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
                        day.slots.length > 0
                          ? "border-border bg-white"
                          : "border-gray-100 bg-gray-50/50"
                      }`}
                    >
                      <span className="w-24 shrink-0 text-sm font-bold text-foreground">
                        {day.dayName}
                      </span>
                      {day.slots.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {day.slots.map((s, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-doktori-teal-dark"
                            >
                              <Clock className="h-3 w-3" strokeWidth={2.5} />
                              {formatTime(s.startTime)} — {formatTime(s.endTime)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">Fermé</span>
                      )}
                    </div>
                  ))}
                </div>
              </AnimatedSection>

              {/* Avis patients — on mobile, pushed below practical info via order */}
              {reviewCount > 0 && (
                <AnimatedSection index={8} className="order-last lg:order-none rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                        <Star className="h-4 w-4" strokeWidth={2.5} />
                      </div>
                      <h2 className="font-heading text-lg font-bold text-foreground">
                        Avis patients
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <div className="font-heading text-2xl font-black leading-none text-foreground">
                          {averageRating.toFixed(1)}
                          <span className="text-base font-bold text-muted-foreground">/5</span>
                        </div>
                        <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {reviewCount} {reviewCount > 1 ? "avis vérifiés" : "avis vérifié"}
                        </div>
                      </div>
                      <StarRating value={averageRating} />
                    </div>
                  </div>

                  {(subRatings.punctuality > 0 || subRatings.communication > 0 || subRatings.cleanliness > 0 || subRatings.staff > 0) && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {subRatings.punctuality > 0 && (
                        <div className="rounded-xl bg-secondary/40 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ponctualité</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">{subRatings.punctuality.toFixed(1)}</span>
                            <StarRating value={subRatings.punctuality} size="sm" />
                          </div>
                        </div>
                      )}
                      {subRatings.communication > 0 && (
                        <div className="rounded-xl bg-secondary/40 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Communication</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">{subRatings.communication.toFixed(1)}</span>
                            <StarRating value={subRatings.communication} size="sm" />
                          </div>
                        </div>
                      )}
                      {subRatings.cleanliness > 0 && (
                        <div className="rounded-xl bg-secondary/40 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Propreté</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">{subRatings.cleanliness.toFixed(1)}</span>
                            <StarRating value={subRatings.cleanliness} size="sm" />
                          </div>
                        </div>
                      )}
                      {subRatings.staff > 0 && (
                        <div className="rounded-xl bg-secondary/40 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Personnel</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">{subRatings.staff.toFixed(1)}</span>
                            <StarRating value={subRatings.staff} size="sm" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <ul className="mt-6 space-y-4">
                    {latestReviews.map((r) => {
                      const author = anonymizeName(r.patientName);
                      const when = timeAgo(new Date(r.createdAt));
                      return (
                        <li
                          key={r.id}
                          className="relative rounded-2xl border border-border bg-secondary/40 p-5"
                        >
                          <Quote
                            aria-hidden
                            className="absolute end-4 top-4 h-6 w-6 text-primary/15"
                            strokeWidth={2.5}
                          />
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                                {author[0]?.toUpperCase() ?? "?"}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-bold text-foreground">
                                    {author}
                                  </span>
                                  {r.verified && (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-doktori-green-dark"
                                      title="Consultation vérifiée"
                                    >
                                      <BadgeCheck className="h-3 w-3" strokeWidth={2.5} />
                                      Vérifié
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <StarRating value={r.rating} />
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    · {when}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {r.comment && (
                            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                              {r.comment}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {reviewCount > latestReviews.length && (
                    <div className="mt-5 flex justify-center">
                      <Link
                        href={`/medecin/${doctor.slug}/avis`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:border-primary hover:bg-secondary"
                      >
                        Voir tous les {reviewCount} avis
                        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                      </Link>
                    </div>
                  )}
                </AnimatedSection>
              )}

              {/* Similar doctors */}
              {similarDoctors.length > 0 && (
                <AnimatedSection index={9} className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-foreground">
                      Médecins similaires
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mêmes spécialité et ville
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {similarDoctors.map((sd) => (
                      <Link
                        key={sd.id}
                        href={`/medecin/${sd.slug}`}
                        className="group rounded-2xl border border-border bg-white p-4 transition-shadow hover:shadow-md"
                      >
                        <div className="flex flex-col items-center text-center">
                          {sd.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sd.photoUrl}
                              alt={sd.fullName}
                              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-secondary"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white ring-2 ring-secondary">
                              {sd.fullName.split(" ").slice(-2).map((n) => n[0]).join("").toUpperCase()}
                            </div>
                          )}
                          <p className="mt-2 text-sm font-bold text-foreground line-clamp-2">{sd.fullName}</p>
                          <p className="text-xs text-primary font-semibold mt-0.5">{getSpecialtyLabel(sd.specialty)}</p>
                          <p className="text-xs text-muted-foreground">{getCityLabel(sd.city)}</p>
                          {sd.rating != null && sd.rating > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-doktori-amber">
                              <Star className="h-3 w-3 fill-doktori-amber text-doktori-amber" />
                              {sd.rating.toFixed(1)}
                              <span className="text-muted-foreground font-normal">({sd.totalReviews ?? 0})</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </AnimatedSection>
              )}

              {/* Practical info */}
              <AnimatedSection index={9} className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-white p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
                    <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Langues
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {languages.length > 0
                      ? languages.join(" · ")
                      : "Français · العربية · English"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Moyens de paiement
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    Espèces · Carte · CNAM
                  </p>
                </div>
              </AnimatedSection>
            </div>

            {/* ═════ RIGHT COLUMN — sticky CTA (hidden on mobile, shown on desktop) ═════ */}
            <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
              <div className="overflow-hidden rounded-3xl border-2 border-primary bg-white shadow-xl shadow-primary/10">
                <div className="bg-primary px-6 py-4 text-white">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" strokeWidth={3} />
                    <span className="font-heading text-sm font-bold uppercase tracking-wider">
                      Prise de rendez-vous
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Réservez votre consultation en ligne en 2 clics.
                  </p>

                  <ul className="mt-4 space-y-2.5 text-sm">
                    <li className="flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                      <span className="text-foreground">Créneaux en temps réel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                      <span className="text-foreground">Rappel SMS gratuit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                      <span className="text-foreground">Annulation en 1 clic</span>
                    </li>
                  </ul>

                  {doctor.consultationMode === "teleconsult" ? (
                    <AnimatedCTAButton className="mt-6">
                      <Link
                        href={`/rdv/${doctor.slug}`}
                        className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 font-heading text-base font-bold text-white shadow-lg shadow-purple-600/20 transition-colors hover:bg-purple-700"
                      >
                        <Video className="h-5 w-5" strokeWidth={2.5} />
                        <span>Prendre un RDV vidéo</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
                      </Link>
                    </AnimatedCTAButton>
                  ) : (
                    <AnimatedCTAButton className="mt-6">
                      <Link
                        href={`/rdv/${doctor.slug}`}
                        className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-heading text-base font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-doktori-teal-dark"
                      >
                        <Calendar className="h-5 w-5" strokeWidth={2.5} />
                        <span>Prendre rendez-vous</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
                      </Link>
                    </AnimatedCTAButton>
                  )}

                  <Link
                    href={`/domicile/${doctor.slug}`}
                    className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border bg-white text-sm font-bold text-foreground transition-colors hover:border-accent hover:bg-accent/5 hover:text-doktori-green-dark"
                  >
                    <Phone className="h-4 w-4" strokeWidth={2.5} />
                    Visite à domicile
                  </Link>

                  <div className="mt-4 pt-4 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground mb-2">Scanner pour réserver</p>
                    <QRCode url={`https://doktori.tn/rdv/${doctor.slug}`} size={120} />
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Urgence non-vitale
                    </p>
                    <Link
                      href="/sos"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-destructive hover:text-[#991B1B]"
                    >
                      🚨 Activer SOS Docteur
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
