export const dynamic = "force-dynamic";

import type { Metadata } from "next";
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
} from "@doktori/db";
import { desc, eq, sql } from "drizzle-orm";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
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

function StarRating({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= rounded
              ? "h-4 w-4 fill-[#F59E0B] text-[#F59E0B]"
              : "h-4 w-4 fill-gray-200 text-gray-200"
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

  // Reviews — aggregate + latest 10 (joined with patient name)
  const [aggregateRow] = await db
    .select({
      avg: sql<string | null>`AVG(${reviews.rating})::text`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.doctorId, doctor.id));

  const reviewCount = aggregateRow?.count ?? 0;
  const averageRating =
    aggregateRow?.avg != null ? Number.parseFloat(aggregateRow.avg) : 0;

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

      <div className="min-h-screen bg-[#F0FDFA]/30">
        {/* Back link */}
        <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
          <Link
            href="/recherche"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#5E7574] transition-colors hover:text-[#0891B2]"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            Retour à la recherche
          </Link>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {/* ═════ MOBILE STICKY CTA ═════ */}
          <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-[#E6F4F1] bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 max-w-lg mx-auto">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#5E7574] truncate">{doctor.name}</div>
                <div className="text-xs text-[#0891B2] font-semibold">{specialtyLabel}</div>
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
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0891B2] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#0891B2]/20 active:scale-[0.97]"
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
              <div className="overflow-hidden rounded-3xl border border-[#E6F4F1] bg-white shadow-sm">
                {/* Cover banner */}
                <div className="relative h-24 bg-gradient-to-r from-[#0891B2] via-[#22D3EE] to-[#22C55E]">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
                      backgroundSize: "20px 20px",
                    }}
                  />
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
                        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-[#0891B2] font-heading text-3xl font-black text-white ring-4 ring-white sm:h-32 sm:w-32">
                          {doctor.name
                            .split(" ")
                            .slice(-2)
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white ring-2 ring-white">
                        <BadgeCheck className="h-7 w-7 fill-[#22C55E] text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>

                  {/* Name + specialty */}
                  <div className="mt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h1 className="font-heading text-2xl font-black tracking-tight text-[#134E4A] sm:text-3xl">
                          {doctor.name}
                        </h1>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <Stethoscope className="h-4 w-4 text-[#0891B2]" strokeWidth={2.5} />
                          <span className="text-sm font-bold text-[#0891B2]">
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

                      {/* Fees not shown publicly — Doctolib-style */}
                    </div>

                    {/* Badges */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-3 py-1 text-xs font-bold text-[#16A34A]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"></span>
                        Disponible aujourd&apos;hui
                      </div>
                      {reviewCount > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#92400E]">
                          <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                          {averageRating.toFixed(1)} ({reviewCount}{" "}
                          {reviewCount > 1 ? "avis" : "avis"})
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-[#5E7574]">
                          <Star className="h-3 w-3" />
                          Aucun avis
                        </div>
                      )}
                      <div className="inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-3 py-1 text-xs font-bold text-[#0E7490]">
                        <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                        Vérifié par Doktori
                      </div>
                      {doctor.yearsOfExperience != null && doctor.yearsOfExperience > 0 && (
                        <div className="inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-3 py-1 text-xs font-bold text-[#0E7490]">
                          <Briefcase className="h-3 w-3" strokeWidth={2.5} />
                          {doctor.yearsOfExperience} ans d&apos;expérience
                        </div>
                      )}
                    </div>

                    {/* Address — hidden for teleconsult-only doctors */}
                    {doctor.consultationMode !== "teleconsult" && (
                      <div className="mt-4 flex items-start gap-2 text-sm text-[#5E7574]">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0891B2]" strokeWidth={2.5} />
                        <span>{doctor.address}</span>
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
              </div>

              {/* About section */}
              <div className="rounded-3xl border border-[#E6F4F1] bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDFA] text-[#0891B2]">
                    <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <h2 className="font-heading text-lg font-bold text-[#134E4A]">
                    À propos
                  </h2>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#5E7574]">
                  {doctor.bio ||
                    `${doctor.name} est ${specialtyLabel.toLowerCase()} à ${cityLabel}. Passionné(e) par la santé de ses patients, le Dr vous accueille dans un cabinet moderne et bienveillant. Réservez votre consultation en quelques clics via Doktori.`}
                </p>
              </div>

              {/* Expertises */}
              {expertise.length > 0 && (
                <div className="rounded-3xl border border-[#E6F4F1] bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDFA] text-[#0891B2]">
                      <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-[#134E4A]">
                      Expertises
                    </h2>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {expertise.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E6F4F1] bg-[#F0FDFA] px-3.5 py-1.5 text-xs font-bold text-[#0E7490]"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0891B2]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Formation */}
              {educations.length > 0 && (
                <div className="rounded-3xl border border-[#E6F4F1] bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDFA] text-[#0891B2]">
                      <GraduationCap className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-[#134E4A]">
                      Formation
                    </h2>
                  </div>
                  <ol className="mt-5 relative">
                    {[...educations]
                      .sort((a, b) => b.year - a.year)
                      .map((edu, i, arr) => (
                        <li key={`${edu.year}-${edu.degree}-${i}`} className="relative pl-8 pb-5 last:pb-0">
                          {i < arr.length - 1 && (
                            <span
                              aria-hidden
                              className="absolute left-[11px] top-5 h-full w-px bg-[#E6F4F1]"
                            />
                          )}
                          <span
                            aria-hidden
                            className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F0FDFA] ring-2 ring-white"
                          >
                            <span className="h-2 w-2 rounded-full bg-[#0891B2]" />
                          </span>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0E7490]">
                            {edu.year}
                          </div>
                          <div className="mt-0.5 text-sm font-bold text-[#134E4A]">
                            {edu.degree}
                          </div>
                          <div className="text-xs font-medium text-[#5E7574]">
                            {edu.institution}
                          </div>
                        </li>
                      ))}
                  </ol>
                </div>
              )}

              {/* Expérience */}
              {experiences.length > 0 && (
                <div className="rounded-3xl border border-[#E6F4F1] bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDFA] text-[#0891B2]">
                      <Briefcase className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-[#134E4A]">
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
                          className="relative pl-8 pb-5 last:pb-0"
                        >
                          {i < arr.length - 1 && (
                            <span
                              aria-hidden
                              className="absolute left-[11px] top-5 h-full w-px bg-[#E6F4F1]"
                            />
                          )}
                          <span
                            aria-hidden
                            className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F0FDFA] ring-2 ring-white"
                          >
                            <span className="h-2 w-2 rounded-full bg-[#0891B2]" />
                          </span>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0E7490]">
                            {exp.startYear} – {exp.endYear ?? "aujourd'hui"}
                          </div>
                          <div className="mt-0.5 text-sm font-bold text-[#134E4A]">
                            {exp.role}
                          </div>
                          <div className="text-xs font-medium text-[#5E7574]">
                            {exp.place}
                          </div>
                        </li>
                      ))}
                  </ol>
                </div>
              )}

              {/* Langues parlées */}
              {languages.length > 0 && (
                <div className="rounded-3xl border border-[#E6F4F1] bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDFA] text-[#0891B2]">
                      <Languages className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-[#134E4A]">
                      Langues parlées
                    </h2>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-2 rounded-full border border-[#E6F4F1] bg-white px-3.5 py-1.5 text-xs font-bold text-[#134E4A] shadow-sm"
                      >
                        <Languages className="h-3 w-3 text-[#0891B2]" strokeWidth={2.5} />
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Appointment types (motifs) */}
              {appointmentTypesList.length > 0 && (
                <div className="rounded-3xl border border-[#E6F4F1] bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDFA] text-[#0891B2]">
                      <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-[#134E4A]">
                      Motifs de consultation
                    </h2>
                  </div>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {appointmentTypesList.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#E6F4F1] bg-white px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: t.color }}
                            aria-hidden
                          />
                          <div>
                            <div className="text-sm font-bold text-[#134E4A]">{t.name}</div>
                            <div className="text-xs font-medium text-[#5E7574]">
                              {t.durationMinutes} min
                            </div>
                          </div>
                        </div>
                        {/* Fee hidden on public profile */}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weekly schedule */}
              <div className="rounded-3xl border border-[#E6F4F1] bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDFA] text-[#0891B2]">
                      <Calendar className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-heading text-lg font-bold text-[#134E4A]">
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
                          ? "border-[#E6F4F1] bg-white"
                          : "border-gray-100 bg-gray-50/50"
                      }`}
                    >
                      <span className="w-24 shrink-0 text-sm font-bold text-[#134E4A]">
                        {day.dayName}
                      </span>
                      {day.slots.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {day.slots.map((s, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#F0FDFA] px-2.5 py-1 text-xs font-bold text-[#0E7490]"
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
              </div>

              {/* Avis patients — on mobile, pushed below practical info via order */}
              {reviewCount > 0 && (
                <div className="order-last lg:order-none rounded-3xl border border-[#E6F4F1] bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDFA] text-[#0891B2]">
                        <Star className="h-4 w-4" strokeWidth={2.5} />
                      </div>
                      <h2 className="font-heading text-lg font-bold text-[#134E4A]">
                        Avis patients
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-heading text-2xl font-black leading-none text-[#134E4A]">
                          {averageRating.toFixed(1)}
                          <span className="text-base font-bold text-[#5E7574]">/5</span>
                        </div>
                        <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[#5E7574]">
                          {reviewCount} {reviewCount > 1 ? "avis vérifiés" : "avis vérifié"}
                        </div>
                      </div>
                      <StarRating value={averageRating} />
                    </div>
                  </div>

                  <ul className="mt-6 space-y-4">
                    {latestReviews.map((r) => {
                      const author = anonymizeName(r.patientName);
                      const when = timeAgo(new Date(r.createdAt));
                      return (
                        <li
                          key={r.id}
                          className="relative rounded-2xl border border-[#E6F4F1] bg-[#F0FDFA]/40 p-5"
                        >
                          <Quote
                            aria-hidden
                            className="absolute right-4 top-4 h-6 w-6 text-[#0891B2]/15"
                            strokeWidth={2.5}
                          />
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0891B2] text-sm font-black text-white">
                                {author[0]?.toUpperCase() ?? "?"}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-bold text-[#134E4A]">
                                    {author}
                                  </span>
                                  {r.verified && (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-2 py-0.5 text-[10px] font-bold text-[#16A34A]"
                                      title="Consultation vérifiée"
                                    >
                                      <BadgeCheck className="h-3 w-3" strokeWidth={2.5} />
                                      Vérifié
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2">
                                  <StarRating value={r.rating} />
                                  <span className="text-[11px] font-medium text-[#5E7574]">
                                    · {when}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {r.comment && (
                            <p className="mt-3 text-sm leading-relaxed text-[#134E4A]/90">
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
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E6F4F1] bg-white px-5 py-2.5 text-sm font-bold text-[#0891B2] transition-colors hover:border-[#0891B2] hover:bg-[#F0FDFA]"
                      >
                        Voir tous les {reviewCount} avis
                        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Practical info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7490]">
                    <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Langues
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#134E4A]">
                    {languages.length > 0
                      ? languages.join(" · ")
                      : "Français · العربية · English"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7490]">
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Moyens de paiement
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#134E4A]">
                    Espèces · Carte · CNAM
                  </p>
                </div>
              </div>
            </div>

            {/* ═════ RIGHT COLUMN — sticky CTA (hidden on mobile, shown on desktop) ═════ */}
            <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
              <div className="overflow-hidden rounded-3xl border-2 border-[#0891B2] bg-white shadow-xl shadow-[#0891B2]/10">
                <div className="bg-[#0891B2] px-6 py-4 text-white">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" strokeWidth={3} />
                    <span className="font-heading text-sm font-bold uppercase tracking-wider">
                      Prise de rendez-vous
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm text-[#5E7574]">
                    Réservez votre consultation en ligne en 2 clics.
                  </p>

                  <ul className="mt-4 space-y-2.5 text-sm">
                    <li className="flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={2.5} />
                      <span className="text-[#134E4A]">Créneaux en temps réel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={2.5} />
                      <span className="text-[#134E4A]">Rappel SMS gratuit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={2.5} />
                      <span className="text-[#134E4A]">Annulation en 1 clic</span>
                    </li>
                  </ul>

                  {doctor.consultationMode === "teleconsult" ? (
                    <Link
                      href={`/rdv/${doctor.slug}`}
                      className="group mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 font-heading text-base font-bold text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-700 active:scale-[0.98]"
                    >
                      <Video className="h-5 w-5" strokeWidth={2.5} />
                      <span>Prendre un RDV vidéo</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
                    </Link>
                  ) : (
                    <Link
                      href={`/rdv/${doctor.slug}`}
                      className="group mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0891B2] font-heading text-base font-bold text-white shadow-lg shadow-[#0891B2]/20 transition-all hover:bg-[#0E7490] active:scale-[0.98]"
                    >
                      <Calendar className="h-5 w-5" strokeWidth={2.5} />
                      <span>Prendre rendez-vous</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
                    </Link>
                  )}

                  <Link
                    href={`/domicile/${doctor.slug}`}
                    className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#E6F4F1] bg-white text-sm font-bold text-[#134E4A] transition-colors hover:border-[#22C55E] hover:bg-[#22C55E]/5 hover:text-[#16A34A]"
                  >
                    <Phone className="h-4 w-4" strokeWidth={2.5} />
                    Visite à domicile
                  </Link>

                  <div className="mt-5 border-t border-[#E6F4F1] pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E7574]">
                      Urgence non-vitale
                    </p>
                    <Link
                      href="/sos"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[#DC2626] hover:text-[#991B1B]"
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
