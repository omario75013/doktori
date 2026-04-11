"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { SPECIALTIES } from "@doktori/shared";
import {
  Search,
  CalendarCheck2,
  CheckCircle2,
  Stethoscope,
  Eye,
  Baby,
  Heart,
  Bone,
  Ear,
  Smile,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  MessageSquareText,
  MapPin,
  Star,
  Zap,
  Siren,
  Apple,
  Smartphone,
  Users,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  generaliste: Stethoscope,
  dermatologue: Sparkles,
  ophtalmologue: Eye,
  gynecologue: Heart,
  pediatre: Baby,
  dentiste: Smile,
  orl: Ear,
  cardiologue: Heart,
  orthopediste: Bone,
  gastrologue: Stethoscope,
};

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const t = useTranslations("landing");
  const locale = useLocale();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/recherche?${params.toString()}`);
  }

  return (
    <div className="flex flex-col bg-white">
      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F0FDFA] via-white to-white px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
        {/* Subtle grid background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_75%)]"
          style={{
            backgroundImage: `linear-gradient(rgba(8, 145, 178, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(8, 145, 178, 0.08) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          {/* Left: copy + CTA */}
          <div className="text-center lg:text-left">
            {/* Accreditation badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0891B2]/20 bg-[#F0FDFA] px-4 py-1.5 text-xs font-semibold text-[#0E7490] shadow-sm">
              <BadgeCheck className="h-4 w-4 text-[#0891B2]" strokeWidth={2.5} />
              <span>{t("heroBadge")}</span>
            </div>

            <h1 className="text-balance font-heading text-4xl font-black leading-[1.02] tracking-tight text-[#134E4A] sm:text-5xl lg:text-6xl xl:text-7xl">
              {t("heroTitleLine1")}{" "}
              <span className="block">
                {t("heroTitleLine2Prefix")}{" "}
                <span className="relative inline-block text-[#0891B2]">
                  {t("heroTitleHighlight")}
                  <svg
                    aria-hidden
                    viewBox="0 0 300 12"
                    className="absolute -bottom-1 left-0 h-2 w-full"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 8 Q 75 2, 150 6 T 298 5"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </span>
            </h1>

            <p
              className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-[#5E7574] lg:mx-0 lg:text-xl [&_strong]:font-bold [&_strong]:text-[#134E4A]"
              dangerouslySetInnerHTML={{ __html: t.raw("heroDescription") as string }}
            />

            {/* Search bar */}
            <form onSubmit={handleSearch} className="mx-auto mt-8 max-w-xl lg:mx-0">
              <div className="group flex h-16 items-center rounded-2xl border-2 border-[#E6F4F1] bg-white p-1.5 shadow-lg shadow-[#0891B2]/5 transition-all focus-within:border-[#0891B2] focus-within:shadow-xl focus-within:shadow-[#0891B2]/10">
                <div className="flex h-full w-12 shrink-0 items-center justify-center text-[#5E7574]">
                  <Search className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("heroSearchPlaceholder")}
                  className="h-full flex-1 border-0 bg-transparent px-2 text-base text-[#134E4A] placeholder:text-[#5E7574]/60 outline-none"
                />
                <button
                  type="submit"
                  className="group/btn inline-flex h-full items-center gap-2 rounded-xl bg-[#0891B2] px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#0E7490] active:scale-[0.98]"
                >
                  <span>{t("searchButton")}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" strokeWidth={3} />
                </button>
              </div>
            </form>

            {/* Trust chips */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#5E7574] lg:justify-start">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#22C55E]" strokeWidth={2.5} />
                <span className="font-medium">{t("trustSecure")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#0891B2]" strokeWidth={2.5} />
                <span className="font-medium">{t("trustAvailable")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#0891B2]" strokeWidth={2.5} />
                <span className="font-medium">{t("trustPatients")}</span>
              </div>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="relative hidden lg:block">
            <PhoneMockup locale={locale} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════ STATS STRIP ═══════════════════════ */}
      <section className="border-y border-[#E6F4F1] bg-[#F0FDFA]/50 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {[
            { value: "65+", label: t("statsDoctorsLabel"), icon: Stethoscope },
            { value: "10", label: t("statsSpecialtiesLabel"), icon: Sparkles },
            { value: "4", label: t("statsZonesLabel"), icon: MapPin },
            { value: "4.8/5", label: t("statsRatingLabel"), icon: Star },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#0891B2] ring-1 ring-[#E6F4F1]">
                <Icon className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-heading text-2xl font-black text-[#134E4A]">
                  {value}
                </div>
                <div className="text-xs font-medium text-[#5E7574]">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════ SOS BANNER ═══════════════════════ */}
      <section className="bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#DC2626] to-[#991B1B] shadow-xl">
          <div className="grid gap-8 p-8 md:grid-cols-[auto_1fr_auto] md:items-center md:p-10">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <Siren className="h-8 w-8 text-white" strokeWidth={2.5} />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40"></span>
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-white ring-2 ring-[#DC2626]"></span>
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-2xl font-bold text-white">
                {t("sosTitle")}
              </h3>
              <p className="mt-1 text-sm text-red-100">{t("sosSubtitle")}</p>
            </div>
            <Link
              href="/sos"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-[#DC2626] shadow-sm transition-all hover:bg-red-50 active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" strokeWidth={3} />
              <span>{t("sosCta")}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section className="bg-white px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F0FDFA] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#0E7490]">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("howItWorksBadge")}
            </div>
            <h2 className="mt-4 text-balance font-heading text-3xl font-black tracking-tight text-[#134E4A] sm:text-4xl">
              {t("howItWorksTitle")}
            </h2>
            <p className="mt-4 text-base text-[#5E7574]">{t("howItWorksSubtitle")}</p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Search,
                title: t("step1Title"),
                desc: t("step1Desc"),
              },
              {
                step: "02",
                icon: CalendarCheck2,
                title: t("step2Title"),
                desc: t("step2Desc"),
              },
              {
                step: "03",
                icon: CheckCircle2,
                title: t("step3Title"),
                desc: t("step3Desc"),
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="group relative overflow-hidden rounded-3xl border border-[#E6F4F1] bg-white p-8 transition-all hover:-translate-y-1 hover:border-[#0891B2]/30 hover:shadow-xl hover:shadow-[#0891B2]/5"
                >
                  <div className="absolute -right-4 -top-4 font-heading text-8xl font-black leading-none text-[#F0FDFA] transition-colors group-hover:text-[#E6F4F1]">
                    {s.step}
                  </div>
                  <div className="relative">
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0891B2] text-white shadow-lg shadow-[#0891B2]/20">
                      <Icon className="h-7 w-7" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-heading text-xl font-bold text-[#134E4A]">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#5E7574]">
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ SPECIALTIES ═══════════════════════ */}
      <section className="bg-[#F0FDFA]/50 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#0E7490] ring-1 ring-[#E6F4F1]">
              <Stethoscope className="h-3.5 w-3.5" />
              {t("specialtiesBadge")}
            </div>
            <h2 className="mt-4 text-balance font-heading text-3xl font-black tracking-tight text-[#134E4A] sm:text-4xl">
              {t("bySpecialty")}
            </h2>
            <p className="mt-4 text-base text-[#5E7574]">{t("specialtiesSubtitle")}</p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SPECIALTIES.map((specialty) => {
              const Icon = SPECIALTY_ICONS[specialty.id] ?? Stethoscope;
              return (
                <Link
                  key={specialty.id}
                  href={`/recherche?specialty=${specialty.id}`}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border border-[#E6F4F1] bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-[#0891B2] hover:shadow-lg hover:shadow-[#0891B2]/10"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0891B2] transition-all group-hover:scale-105 group-hover:bg-[#0891B2] group-hover:text-white">
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-bold text-[#134E4A] group-hover:text-[#0891B2] sm:text-sm">
                    {locale === "ar" ? specialty.labelAr : specialty.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOR DOCTORS ═══════════════════════ */}
      <section className="relative overflow-hidden bg-[#134E4A] px-4 py-24 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-[#22C55E]/10 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-1.5 text-xs font-bold text-[#22C55E]">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("forDoctorsBadge")}
            </div>
            <h2 className="mt-6 font-heading text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              {t("forDoctors")}{" "}
              <span className="text-[#22D3EE]">{t("forDoctorsHighlight")}</span>
            </h2>
            <p
              className="mt-6 text-lg leading-relaxed text-[#A7F3D0] [&_strong]:font-bold [&_strong]:text-white"
              dangerouslySetInnerHTML={{ __html: t.raw("forDoctorsDesc") as string }}
            />

            <ul className="mt-10 space-y-4">
              {[
                { icon: Clock, text: t("benefit1") },
                { icon: MessageSquareText, text: t("benefit2") },
                { icon: Search, text: t("benefit3") },
                { icon: ShieldCheck, text: t("benefit4") },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <li key={b.text} className="flex items-start gap-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#22C55E] text-[#134E4A]">
                      <Icon className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <span className="text-base leading-7 text-white">{b.text}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/inscription"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-8 font-heading text-base font-bold text-[#134E4A] shadow-lg shadow-[#22C55E]/20 transition-all hover:bg-[#4ADE80] active:scale-[0.98]"
              >
                <span>{t("forDoctorsCta")}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
              </Link>
              <Link
                href="/connexion"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-white/20 bg-white/5 px-8 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                {t("forDoctorsHaveAccount")}
              </Link>
            </div>
          </div>

          <div className="relative hidden md:block">
            <DoctorDashboardMockup locale={locale} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0891B2] text-white">
                  <Stethoscope className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <span className="font-heading text-xl font-black text-[#134E4A]">
                  Doktori<span className="text-[#0891B2]">.tn</span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#5E7574]">
                {t("footerTagline")}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E6F4F1] text-[#134E4A] transition-colors hover:border-[#0891B2] hover:text-[#0891B2]"
                  aria-label={t("iosApp")}
                >
                  <Apple className="h-4 w-4" strokeWidth={2} />
                </a>
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E6F4F1] text-[#134E4A] transition-colors hover:border-[#0891B2] hover:text-[#0891B2]"
                  aria-label={t("androidApp")}
                >
                  <Smartphone className="h-4 w-4" strokeWidth={2} />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-heading text-sm font-bold text-[#134E4A]">{t("footerProduct")}</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="/recherche" className="text-[#5E7574] hover:text-[#0891B2]">{t("footerProductSearch")}</Link></li>
                <li><Link href="/sos" className="text-[#5E7574] hover:text-[#0891B2]">{t("footerProductSos")}</Link></li>
                <li><Link href="/inscription" className="text-[#5E7574] hover:text-[#0891B2]">{t("footerProductDoctors")}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-heading text-sm font-bold text-[#134E4A]">{t("footerLegal")}</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="/legal/cgu" className="text-[#5E7574] hover:text-[#0891B2]">{t("footerLegalCgu")}</Link></li>
                <li><Link href="/legal/confidentialite" className="text-[#5E7574] hover:text-[#0891B2]">{t("footerLegalPrivacy")}</Link></li>
                <li><Link href="/legal/mentions" className="text-[#5E7574] hover:text-[#0891B2]">{t("footerLegalMentions")}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-heading text-sm font-bold text-[#134E4A]">{t("footerContact")}</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li><a href="mailto:contact@doktori.tn" className="text-[#5E7574] hover:text-[#0891B2]">{t("footerContactEmail")}</a></li>
                <li><span className="text-[#5E7574]">{t("footerContactSupport")}</span></li>
                <li><span className="text-[#5E7574]">{t("footerContactLocation")}</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-[#E6F4F1] pt-8 text-center">
            <p className="text-xs text-[#5E7574]">{t("footerCopyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═════════════════ Phone Mockup Component ═════════════════ */
function PhoneMockup({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const tr = {
    searchPh: ar ? "طبيب أمراض جلدية..." : "Dermatologue...",
    generaliste: ar ? "طبيب عام" : "Généraliste",
    dermatologue: ar ? "طبيب جلد" : "Dermatologue",
    navSearch: ar ? "بحث" : "Chercher",
    navSos: ar ? "استغاثة" : "SOS",
    navRdv: ar ? "مواعيدي" : "Mes RDV",
    rdvConfirmed: ar ? "موعد مؤكد" : "RDV confirmé",
    dateLabel: ar ? "15 أفريل · 14:30" : "15 avril · 14:30",
    reviews: ar ? "1 247 تقييم" : "1 247 avis",
  };
  return (
    <div className="relative mx-auto aspect-[9/19] w-full max-w-[340px]">
      {/* Phone frame */}
      <div className="absolute inset-0 rounded-[3rem] bg-[#134E4A] p-3 shadow-2xl shadow-[#0891B2]/20">
        <div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-white">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-3 text-[10px] font-bold text-[#134E4A]">
            <span>9:41</span>
            <span>●●● ●●</span>
          </div>

          {/* Mock app header */}
          <div className="px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0891B2] text-white">
                <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-black text-[#134E4A]">Doktori</span>
            </div>

            {/* Search input mock */}
            <div className="mt-4 flex h-11 items-center rounded-xl border border-[#E6F4F1] bg-[#F0FDFA] px-3">
              <Search className="h-4 w-4 text-[#5E7574]" />
              <span className="ml-2 text-xs text-[#5E7574]">{tr.searchPh}</span>
            </div>

            {/* Doctor cards mock */}
            <div className="mt-4 space-y-2">
              {[
                { name: "Dr. Sonia Trabelsi", spec: tr.dermatologue, price: "80", color: "#0891B2" },
                { name: "Dr. Karim Ben Ali", spec: tr.generaliste, price: "40", color: "#22C55E" },
                { name: "Dr. Leila Ben Othman", spec: tr.dermatologue, price: "80", color: "#0891B2" },
              ].map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[#E6F4F1] bg-white p-3"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: d.color }}
                  >
                    {d.name.split(" ")[1][0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-[#134E4A]">
                      {d.name}
                    </p>
                    <p className="truncate text-[9px] text-[#5E7574]">{d.spec}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-[#0891B2]">{d.price}</p>
                    <p className="text-[8px] text-[#5E7574]">DT</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom nav */}
            <div className="mt-4 flex items-center justify-around border-t border-[#E6F4F1] pt-3">
              <div className="flex flex-col items-center gap-0.5">
                <Search className="h-4 w-4 text-[#0891B2]" />
                <span className="text-[8px] font-bold text-[#0891B2]">{tr.navSearch}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Siren className="h-4 w-4 text-[#DC2626]" />
                <span className="text-[8px] font-bold text-[#DC2626]">{tr.navSos}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <CalendarCheck2 className="h-4 w-4 text-[#5E7574]" />
                <span className="text-[8px] font-bold text-[#5E7574]">{tr.navRdv}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Floating badge */}
      <div className="absolute -left-8 top-1/3 rotate-[-8deg] rounded-xl bg-white p-4 shadow-xl ring-1 ring-[#E6F4F1]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22C55E]">
            <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#134E4A]">{tr.rdvConfirmed}</p>
            <p className="text-[10px] text-[#5E7574]">{tr.dateLabel}</p>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 bottom-1/4 rotate-[6deg] rounded-xl bg-white p-3 shadow-xl ring-1 ring-[#E6F4F1]">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-[#FBBF24] text-[#FBBF24]" />
          <span className="text-xs font-black text-[#134E4A]">4.8/5</span>
        </div>
        <p className="mt-0.5 text-[9px] text-[#5E7574]">{tr.reviews}</p>
      </div>
    </div>
  );
}

/* ═════════════════ Doctor Dashboard Mockup ═════════════════ */
function DoctorDashboardMockup({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const tr = {
    specCity: ar ? "طبيبة جلد · تونس" : "Dermatologue · Tunis",
    active: ar ? "نشط" : "Actif",
    today: ar ? "اليوم" : "Aujourd'hui",
    rdvLabel: ar ? "مواعيد" : "rendez-vous",
    thisMonth: ar ? "هذا الشهر" : "Ce mois",
    estimated: ar ? "دت متوقعة" : "DT estimés",
    confirmed: ar ? "مؤكد" : "Confirmé",
    pending: ar ? "قيد الانتظار" : "En attente",
  };
  return (
    <div className="relative mx-auto max-w-sm">
      <div className="rotate-1 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20">
            <Stethoscope className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-white">Dr. Sonia Trabelsi</p>
            <p className="text-xs text-[#A7F3D0]">{tr.specCity}</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-1 rounded-full bg-[#22C55E]/20 px-2.5 py-1 text-[10px] font-bold text-[#22C55E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"></span>
              {tr.active}
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#A7F3D0]">{tr.today}</p>
            <p className="mt-1 font-heading text-2xl font-black text-white">12</p>
            <p className="text-[10px] text-[#A7F3D0]">{tr.rdvLabel}</p>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#A7F3D0]">{tr.thisMonth}</p>
            <p className="mt-1 font-heading text-2xl font-black text-white">6 200</p>
            <p className="text-[10px] text-[#A7F3D0]">{tr.estimated}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {[
            { time: "09:00", patient: "Amina B.", status: "confirmed" },
            { time: "10:30", patient: "Youssef K.", status: "confirmed" },
            { time: "11:00", patient: "Leila M.", status: "pending" },
            { time: "14:00", patient: "Mohamed T.", status: "confirmed" },
          ].map((slot, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-white">
                  {slot.time}
                </span>
                <span className="text-xs text-[#A7F3D0]">{slot.patient}</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  slot.status === "confirmed"
                    ? "bg-[#22C55E]/20 text-[#22C55E]"
                    : "bg-yellow-400/20 text-yellow-300"
                }`}
              >
                {slot.status === "confirmed" ? tr.confirmed : tr.pending}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
