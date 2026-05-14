export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db, labs } from "@doktori/db";
import { and, eq } from "drizzle-orm";
import { CITIES } from "@doktori/shared";
import {
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  FlaskConical,
  ExternalLink,
  Clock,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [lab] = await db
    .select({ name: labs.name, city: labs.city })
    .from(labs)
    .where(and(eq(labs.slug, slug), eq(labs.verificationStatus, "verified")))
    .limit(1);

  if (!lab) return { title: "Laboratoire introuvable | Doktori" };
  const cityLabel = CITIES.find((c) => c.id === lab.city)?.label ?? lab.city;
  return {
    title: `${lab.name} — ${cityLabel} | Doktori`,
    description: `Découvrez ${lab.name} à ${cityLabel}. Services d'analyses médicales et de biologie disponibles sur Doktori.`,
  };
}

export default async function LabProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("patient.labos");

  const [lab] = await db
    .select({
      id: labs.id,
      name: labs.name,
      slug: labs.slug,
      address: labs.address,
      city: labs.city,
      phone: labs.phone,
      email: labs.email,
      logoUrl: labs.logoUrl,
      services: labs.services,
      accreditations: labs.accreditations,
      openingHours: labs.openingHours,
    })
    .from(labs)
    .where(and(eq(labs.slug, slug), eq(labs.verificationStatus, "verified")))
    .limit(1);

  if (!lab) notFound();

  const cityLabel = CITIES.find((c) => c.id === lab.city)?.label ?? lab.city;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lab.name} ${lab.address} ${cityLabel}`)}`;

  // Opening hours: stored as Record<string, { open: string; close: string } | null>
  type HoursMap = Record<string, { open: string; close: string } | null>;
  const hours = lab.openingHours as HoursMap | null;

  const DAY_LABELS: Record<string, string> = {
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche",
  };

  const SERVICE_COLORS = [
    { bg: "var(--primary-50)", color: "var(--primary-700)" },
    { bg: "var(--primary-100)", color: "var(--primary-800)" },
    { bg: "#F0FDF4", color: "#166534" },
    { bg: "#FFF7ED", color: "#9A3412" },
    { bg: "#EEF2FF", color: "#3730A3" },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/recherche"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5"
        style={{ color: "var(--ink-500)" }}
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        Retour à la recherche
      </Link>

      {/* Header card */}
      <div className="ds-card-patient mb-5" style={{ padding: "24px 28px" }}>
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl shrink-0 grid place-items-center"
            style={{ background: "var(--primary-50)" }}
          >
            {lab.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lab.logoUrl}
                alt={lab.name}
                className="w-14 h-14 rounded-xl object-contain"
              />
            ) : (
              <FlaskConical className="w-8 h-8" style={{ color: "var(--primary-600)" }} strokeWidth={1.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="font-bold text-[22px] leading-tight mb-1"
              style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}
            >
              {lab.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <span className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--ink-500)" }}>
                <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                {lab.address}, {cityLabel}
              </span>
              {lab.phone && (
                <a
                  href={`tel:${lab.phone}`}
                  className="flex items-center gap-1.5 text-[13px]"
                  style={{ color: "var(--ink-500)" }}
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                  {lab.phone}
                </a>
              )}
              {lab.email && (
                <a
                  href={`mailto:${lab.email}`}
                  className="flex items-center gap-1.5 text-[13px]"
                  style={{ color: "var(--ink-500)" }}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                  {lab.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* View on map CTA */}
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--line-cool)" }}>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-btn ds-btn-ghost ds-btn-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t("viewOnMap")}
          </a>
        </div>
      </div>

      {/* Services */}
      {lab.services.length > 0 && (
        <div className="ds-card-patient mb-5" style={{ padding: "20px 24px" }}>
          <h2
            className="font-bold text-[13px] uppercase tracking-wider mb-3"
            style={{ color: "var(--ink-400)" }}
          >
            {t("services")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {lab.services.map((svc, i) => {
              const palette = SERVICE_COLORS[i % SERVICE_COLORS.length];
              return (
                <span
                  key={svc}
                  className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold"
                  style={{ background: palette.bg, color: palette.color }}
                >
                  {svc.replace(/_/g, " ")}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Accreditations */}
      {lab.accreditations.length > 0 && (
        <div className="ds-card-patient mb-5" style={{ padding: "20px 24px" }}>
          <h2
            className="font-bold text-[13px] uppercase tracking-wider mb-3"
            style={{ color: "var(--ink-400)" }}
          >
            {t("accreditations")}
          </h2>
          <ul className="space-y-2">
            {lab.accreditations.map((acc) => (
              <li
                key={acc}
                className="flex items-center gap-2 text-[13.5px]"
                style={{ color: "var(--ink-700)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--primary-500)" }}
                />
                {acc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Opening hours */}
      {hours && Object.keys(hours).length > 0 && (
        <div className="ds-card-patient mb-5" style={{ padding: "20px 24px" }}>
          <h2
            className="font-bold text-[13px] uppercase tracking-wider mb-3"
            style={{ color: "var(--ink-400)" }}
          >
            <Clock className="inline w-3.5 h-3.5 me-1" strokeWidth={2.5} />
            {t("openingHours")}
          </h2>
          <table className="w-full text-[13.5px]">
            <tbody>
              {Object.entries(hours).map(([day, slot]) => (
                <tr key={day} className="border-b last:border-b-0" style={{ borderColor: "var(--line-cool)" }}>
                  <td
                    className="py-2 font-semibold capitalize w-32"
                    style={{ color: "var(--ink-700)" }}
                  >
                    {DAY_LABELS[day] ?? day}
                  </td>
                  <td className="py-2" style={{ color: slot ? "var(--ink-700)" : "var(--ink-400)" }}>
                    {slot ? `${slot.open} – ${slot.close}` : "Fermé"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
