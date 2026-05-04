"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { MapPin, ArrowRight, Star, Clock, BadgeCheck, Navigation, Video, Building2 } from "lucide-react";

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
    clinicName?: string | null; // from Meilisearch document (added in migration 0053)
    lastActiveAt?: string | Date | null; // D30 doctor presence
  };
  showSlots?: boolean; // pass true on /recherche to show 3-day slot pills
}

function formatPresence(lastActiveAt: string | Date | null | undefined): { online: boolean; label: string } | null {
  if (!lastActiveAt) return null;
  const ts = typeof lastActiveAt === "string" ? new Date(lastActiveAt) : lastActiveAt;
  if (Number.isNaN(ts.getTime())) return null;
  const diffMs = Date.now() - ts.getTime();
  if (diffMs < 5 * 60_000) return { online: true, label: "En ligne" };
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return { online: false, label: `Vu il y a ${minutes} min` };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { online: false, label: `Vu il y a ${hours} h` };
  const days = Math.floor(hours / 24);
  return { online: false, label: `Vu il y a ${days} j` };
}

type SlotDay = {
  date: string;
  slots: Array<{ startTime: string; endTime: string; practiceId: string }>;
};

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function DoctorSlots({ slug }: { slug: string }) {
  const [days, setDays] = useState<SlotDay[]>([]);

  useEffect(() => {
    const today = toISODate(new Date());
    fetch(`/api/doctors/by-slug/${slug}/availability?start=${today}&days=3`)
      .then((r) => r.json())
      .then((data: { days: SlotDay[] }) => setDays(data.days ?? []))
      .catch(() => {/* silently ignore */});
  }, [slug]);

  // Show only the first 3 days regardless of slot availability
  const displayDays = days.slice(0, 3);
  if (displayDays.length === 0) return null;

  const hasAnySlots = displayDays.some((d) => d.slots.length > 0);
  if (!hasAnySlots) return null;

  const DAY_SHORT: Record<number, string> = { 0: "Dim", 1: "Lun", 2: "Mar", 3: "Mer", 4: "Jeu", 5: "Ven", 6: "Sam" };

  return (
    <div className="relative mt-4 border-t border-border dark:border-gray-700 pt-3">
      <div className="grid grid-cols-3 gap-2">
        {displayDays.map((day) => {
          const date = new Date(day.date + "T00:00:00");
          const dayLabel = DAY_SHORT[date.getDay()] ?? "";
          const dateLabel = `${date.getDate()}/${date.getMonth() + 1}`;
          const shownSlots = day.slots.slice(0, 4);
          const extra = day.slots.length - 4;
          return (
            <div key={day.date} className="space-y-1">
              <div className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {dayLabel} {dateLabel}
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                {shownSlots.length === 0 ? (
                  <span className="text-[10px] text-gray-300 italic">—</span>
                ) : (
                  <>
                    {shownSlots.map((slot) => (
                      <Link
                        key={slot.startTime}
                        href={`/rdv/${slug}?date=${day.date}&time=${slot.startTime}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center rounded-lg bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      >
                        {slot.startTime.slice(0, 5)}
                      </Link>
                    ))}
                    {extra > 0 && (
                      <Link
                        href={`/medecin/${slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center rounded-lg bg-secondary border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors"
                      >
                        +{extra}
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function DoctorCard({ doctor, showSlots }: Props) {
  const t = useTranslations("doctorCard");
  const locale = useLocale();
  const specialty = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);
  const specLabel = specialty ? (locale === "ar" && specialty.labelAr ? specialty.labelAr : specialty.label) : doctor.specialty;
  const cityLabel = city ? (locale === "ar" && city.labelAr ? city.labelAr : city.label) : doctor.city;
  const mode = doctor.consultationMode ?? doctor.consultation_mode;
  const hasVideo = mode === "teleconsult" || mode === "both";
  const initials = doctor.name
    .replace(/^Dr\.?\s*/i, "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const presence = formatPresence(doctor.lastActiveAt);

  return (
    <Link
      href={`/medecin/${doctor.slug}`}
      className="group relative block overflow-hidden rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/8"
    >
      {/* Subtle teal wash on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="relative flex items-start gap-4">
        {/* Avatar — photo or initials fallback */}
        <div className="relative shrink-0">
          {doctor.photoUrl ? (
            <div className="h-20 w-20 overflow-hidden rounded-2xl ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doctor.photoUrl}
                alt={t("portraitAlt", { name: doctor.name })}
                width={80}
                height={80}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary font-heading text-xl font-black text-white ring-1 ring-primary/20">
              {initials}
            </div>
          )}
          {/* Verified badge */}
          <div className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-white">
            <BadgeCheck className="h-5 w-5 fill-accent text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg font-bold text-foreground dark:text-white">{doctor.name}</h3>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-primary">{specLabel}</p>
            {hasVideo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                <Video className="h-3 w-3" strokeWidth={2.5} />
                Vidéo
              </span>
            )}
            {doctor.clinicName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                <Building2 className="h-3 w-3" strokeWidth={2.5} />
                {doctor.clinicName}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span className="font-medium">{cityLabel}</span>
            </span>
            {typeof doctor._geoDistance === "number" && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-bold text-doktori-teal-dark">
                <Navigation className="h-3 w-3" strokeWidth={2.5} />
                {formatDistance(doctor._geoDistance)}
              </span>
            )}
            {typeof doctor.average_rating === "number" && doctor.average_rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                <span className="font-bold text-foreground">{doctor.average_rating.toFixed(1)}</span>
                {typeof doctor.review_count === "number" && doctor.review_count > 0 && (
                  <span className="text-muted-foreground">({doctor.review_count})</span>
                )}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent"></span>
              </span>
              <span className="font-bold text-doktori-green-dark">{t("available")}</span>
            </span>
            {presence && (
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${presence.online ? "bg-green-100 text-green-800" : "bg-gray-100 text-muted-foreground"}`}
                title={presence.label}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${presence.online ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="font-bold">{presence.label}</span>
              </span>
            )}
          </div>
        </div>

        {/* Price removed — like Doctolib, fees are not shown publicly */}
      </div>

      {/* 3-day slot pills */}
      {showSlots && <DoctorSlots slug={doctor.slug} />}

      {/* CTA row */}
      <div className="relative mt-5 flex items-center justify-between border-t border-border dark:border-gray-700 pt-4">
        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{doctor.address}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-all group-hover:bg-doktori-teal-dark group-hover:gap-1.5">
          {t("bookCta")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
        </span>
      </div>
    </Link>
  );
}
