export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDoctorBySlug, getDoctorSchedule, getAllDoctorSlugs } from "@doktori/db";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Clock,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Star,
  Stethoscope,
  Sparkles,
  ChevronLeft,
  Zap,
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
  const doctor = await getDoctorBySlug(slug);
  if (!doctor) return { title: "Médecin introuvable | Doktori" };
  const specialtyLabel = getSpecialtyLabel(doctor.specialty);
  const cityLabel = getCityLabel(doctor.city);
  return {
    title: `${doctor.name} — ${specialtyLabel} à ${cityLabel} | Doktori`,
    description: `Prenez rendez-vous en ligne avec ${doctor.name}, ${specialtyLabel} à ${cityLabel}. Consultez les disponibilités et réservez en 2 clics sur Doktori.`,
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
  const specialtyLabel = getSpecialtyLabel(doctor.specialty);
  const cityLabel = getCityLabel(doctor.city);

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
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
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
                        <div className="mt-1 flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-[#0891B2]" strokeWidth={2.5} />
                          <span className="text-sm font-bold text-[#0891B2]">
                            {specialtyLabel}
                          </span>
                        </div>
                      </div>

                      {doctor.consultationFee !== null && (
                        <div className="rounded-2xl border border-[#E6F4F1] bg-[#F0FDFA] px-4 py-2 text-right">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-[#0E7490]">
                            À partir de
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-heading text-2xl font-black text-[#0891B2]">
                              {(doctor.consultationFee / 1000).toFixed(0)}
                            </span>
                            <span className="text-sm font-bold text-[#0E7490]">DT</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-3 py-1 text-xs font-bold text-[#16A34A]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"></span>
                        Disponible aujourd&apos;hui
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#92400E]">
                        <Star className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                        4.8 (24 avis)
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-3 py-1 text-xs font-bold text-[#0E7490]">
                        <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                        Vérifié par Doktori
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mt-4 flex items-start gap-2 text-sm text-[#5E7574]">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0891B2]" strokeWidth={2.5} />
                      <span>{doctor.address}</span>
                    </div>
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

              {/* Practical info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7490]">
                    <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Langues
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#134E4A]">
                    Français · العربية · English
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

            {/* ═════ RIGHT COLUMN — sticky CTA ═════ */}
            <div className="lg:sticky lg:top-24 lg:self-start">
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

                  <Link
                    href={`/rdv/${doctor.slug}`}
                    className="group mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0891B2] font-heading text-base font-bold text-white shadow-lg shadow-[#0891B2]/20 transition-all hover:bg-[#0E7490] active:scale-[0.98]"
                  >
                    <Calendar className="h-5 w-5" strokeWidth={2.5} />
                    <span>Prendre rendez-vous</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
                  </Link>

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
