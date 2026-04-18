import Link from "next/link";
import { useTranslations } from "next-intl";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { MapPin, ArrowRight, Star, Clock, BadgeCheck, Navigation, Video } from "lucide-react";

interface Props {
  doctor: {
    slug: string;
    name: string;
    specialty: string;
    city: string;
    address: string;
    consultationFee: number | null;
    photoUrl: string | null;
    _geoDistance?: number; // meters from user (Meili geo sort)
    consultation_mode?: string; // 'cabinet' | 'teleconsult' | 'both'
    consultationMode?: string; // camelCase variant
    average_rating?: number | null; // from Meilisearch document
    review_count?: number | null; // from Meilisearch document
  };
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function DoctorCard({ doctor }: Props) {
  const t = useTranslations("doctorCard");
  const specialty = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);
  const mode = doctor.consultationMode ?? doctor.consultation_mode;
  const hasVideo = mode === "teleconsult" || mode === "both";
  const initials = doctor.name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/medecin/${doctor.slug}`}
      className="group relative block overflow-hidden rounded-3xl border border-[#E6F4F1] dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-all hover:-translate-y-0.5 hover:border-[#0891B2]/40 hover:shadow-xl hover:shadow-[#0891B2]/8"
    >
      {/* Subtle teal wash on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F0FDFA] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="relative flex items-start gap-4">
        {/* Avatar — photo or initials fallback */}
        <div className="relative shrink-0">
          {doctor.photoUrl ? (
            <div className="h-20 w-20 overflow-hidden rounded-2xl ring-1 ring-[#E6F4F1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doctor.photoUrl}
                alt={t("portraitAlt", { name: doctor.name })}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0891B2] font-heading text-xl font-black text-white ring-1 ring-[#0891B2]/20">
              {initials}
            </div>
          )}
          {/* Verified badge */}
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-white">
            <BadgeCheck className="h-5 w-5 fill-[#22C55E] text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg font-bold text-[#134E4A] dark:text-white">{doctor.name}</h3>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#0891B2]">{specialty?.label}</p>
            {hasVideo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                <Video className="h-3 w-3" strokeWidth={2.5} />
                Vidéo
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="flex items-center gap-1 text-[#5E7574]">
              <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span className="font-medium">{city?.label}</span>
            </span>
            {typeof doctor._geoDistance === "number" && (
              <span className="flex items-center gap-1 rounded-full bg-[#0891B2]/10 px-2 py-0.5 font-bold text-[#0E7490]">
                <Navigation className="h-3 w-3" strokeWidth={2.5} />
                {formatDistance(doctor._geoDistance)}
              </span>
            )}
            {typeof doctor.average_rating === "number" && doctor.average_rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                <span className="font-bold text-[#134E4A]">{doctor.average_rating.toFixed(1)}</span>
                {typeof doctor.review_count === "number" && doctor.review_count > 0 && (
                  <span className="text-[#5E7574]">({doctor.review_count})</span>
                )}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-[#22C55E]/10 px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22C55E]"></span>
              </span>
              <span className="font-bold text-[#16A34A]">{t("available")}</span>
            </span>
          </div>
        </div>

        {/* Price removed — like Doctolib, fees are not shown publicly */}
      </div>

      {/* CTA row */}
      <div className="relative mt-5 flex items-center justify-between border-t border-[#E6F4F1] dark:border-gray-700 pt-4">
        <span className="flex items-center gap-1.5 truncate text-xs text-[#5E7574]">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{doctor.address}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#0891B2] px-3 py-1.5 text-xs font-bold text-white transition-all group-hover:bg-[#0E7490] group-hover:gap-1.5">
          {t("bookCta")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
        </span>
      </div>
    </Link>
  );
}
