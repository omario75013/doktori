import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { db, doctors } from "@doktori/db";
import { and, desc, eq, isNotNull } from "drizzle-orm";
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
  Smartphone,
  Users,
  TrendingUp,
  BadgeCheck,
  Wind,
  Brain,
  Dna,
  Droplets,
  Activity,
  ScanLine,
  Scissors,
  Flower2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppStoreBadge, GooglePlayBadge } from "@/components/store-badges";
import { HeroSearchForm } from "@/components/hero-search-form";

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
  pneumologue: Wind,
  neurologue: Brain,
  rhumatologue: Bone,
  urologue: Droplets,
  endocrinologue: Dna,
  nephrologue: Activity,
  psychiatre: Brain,
  radiologue: ScanLine,
  chirurgien: Scissors,
  allergologue: Flower2,
};

export const revalidate = 600; // 10 min — featured doctors refresh

export default async function HomePage() {
  const t = await getTranslations("landing");
  const locale = await getLocale();

  // Featured doctors — only render the trust strip if we have at least 4 real
  // verified doctors with profile photos. Avoids fake placeholder names on a
  // pre-launch landing page.
  let featuredDoctors: Array<{
    slug: string;
    name: string;
    specialty: string;
    city: string;
    photoUrl: string;
  }> = [];
  try {
    const rows = await db
      .select({
        slug: doctors.slug,
        name: doctors.name,
        specialty: doctors.specialty,
        city: doctors.city,
        photoUrl: doctors.photoUrl,
      })
      .from(doctors)
      .where(
        and(
          eq(doctors.isActive, true),
          eq(doctors.isVisible, true),
          eq(doctors.verificationStatus, "approved"),
          isNotNull(doctors.photoUrl)
        )
      )
      .orderBy(desc(doctors.createdAt))
      .limit(6);
    featuredDoctors = rows
      .filter((r): r is typeof r & { photoUrl: string } => r.photoUrl !== null);
  } catch {
    // DB unreachable at build / request time — render without the strip.
  }

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary dark:from-gray-800 via-white dark:via-gray-900 to-white dark:to-gray-900 px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
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
          <div className="text-center lg:text-start">
            {/* Accreditation badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary px-4 py-1.5 text-xs font-semibold text-doktori-teal-dark shadow-sm">
              <BadgeCheck className="h-4 w-4 text-primary" strokeWidth={2.5} />
              <span>{t("heroBadge")}</span>
            </div>

            <h1 className="text-balance font-heading text-4xl font-black leading-[1.02] tracking-tight text-foreground dark:text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              {t("heroTitleLine1")}{" "}
              <span className="block">
                {t("heroTitleLine2Prefix")}{" "}
                <span className="relative inline-block text-primary">
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
              className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground dark:text-gray-400 lg:mx-0 lg:text-xl [&_strong]:font-bold [&_strong]:text-foreground dark:[&_strong]:text-white"
              dangerouslySetInnerHTML={{ __html: t.raw("heroDescription") as string }}
            />

            {/* Search bar */}
            <HeroSearchForm />

            {/* Trust chips */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={2.5} />
                <span className="font-medium">{t("trustSecure")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" strokeWidth={2.5} />
                <span className="font-medium">{t("trustAvailable")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" strokeWidth={2.5} />
                <span className="font-medium">{t("trustPatients")}</span>
              </div>
            </div>

            {/* Active doctors avatar strip — only render if we have real verified doctors with photos */}
            {featuredDoctors.length >= 4 && (
              <div className="mt-7 flex items-center justify-center gap-3 lg:justify-start">
                <div className="flex -space-x-2">
                  {featuredDoctors.slice(0, 5).map((d) => (
                    <div
                      key={d.slug}
                      className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white dark:ring-gray-900"
                    >
                      <Image
                        src={d.photoUrl}
                        alt={d.name}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-bold text-foreground dark:text-white">
                    {locale === "ar"
                      ? `${featuredDoctors.length}+ طبيب`
                      : `${featuredDoctors.length}+ médecins`}
                  </p>
                  <p>
                    {locale === "ar"
                      ? "بانتظار مرضاهم"
                      : "prêts à vous recevoir"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: phone mockup */}
          <div className="relative hidden lg:block">
            <PhoneMockup locale={locale} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PRE-LAUNCH STRIP ═══════════════════════ */}
      <section className="border-y border-border dark:border-gray-700 bg-secondary/50 dark:bg-gray-800 py-10">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary mb-4">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            {locale === "ar" ? "إطلاق 2026" : "Lancement 2026"}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
            {locale === "ar"
              ? "نحن نبني شبكة أطبائنا عبر تونس. سجّل لتكون أول من يُبلَّغ عندما ينضم طبيب في مدينتك."
              : "Nous constituons notre réseau de médecins à travers la Tunisie. Inscrivez-vous pour être prévenu(e) dès qu'un médecin de votre ville rejoint la plateforme."
            }
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4 mt-8">
          {[
            { value: "20", label: t("statsSpecialtiesLabel"), icon: Stethoscope },
            { value: "23", label: locale === "ar" ? "مدن مغطاة" : "Villes couvertes", icon: MapPin },
            { value: "24/7", label: locale === "ar" ? "متاح" : "Disponible", icon: CalendarCheck2 },
            { value: "🇹🇳", label: locale === "ar" ? "صنع في تونس" : "Made in Tunisia", icon: ShieldCheck },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-primary ring-1 ring-border">
                <Icon className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-heading text-2xl font-black text-foreground">
                  {value}
                </div>
                <div className="text-xs font-medium text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════ SOS BANNER ═══════════════════════ */}
      <section className="bg-white dark:bg-gray-900 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-destructive to-[#991B1B] shadow-xl">
          <div className="grid gap-8 p-8 md:grid-cols-[auto_1fr_auto] md:items-center md:p-10">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <Siren className="h-8 w-8 text-white" strokeWidth={2.5} />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40"></span>
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-white ring-2 ring-destructive"></span>
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
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-destructive shadow-sm transition-all hover:bg-red-50 active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" strokeWidth={3} />
              <span>{t("sosCta")}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section className="bg-white dark:bg-gray-900 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary dark:bg-gray-800 px-4 py-1 text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("howItWorksBadge")}
            </div>
            <h2 className="mt-4 text-balance font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {t("howItWorksTitle")}
            </h2>
            <p className="mt-4 text-base text-muted-foreground">{t("howItWorksSubtitle")}</p>
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
                  className="group relative overflow-hidden rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-8 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="absolute -right-4 -top-4 font-heading text-8xl font-black leading-none text-secondary transition-colors group-hover:text-border">
                    {s.step}
                  </div>
                  <div className="relative">
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                      <Icon className="h-7 w-7" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-heading text-xl font-bold text-foreground">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ DOCTORS TRUST STRIP (real data only) ═══════════════════════ */}
      {featuredDoctors.length >= 4 && (
        <section className="relative overflow-hidden bg-white dark:bg-gray-900 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary dark:bg-gray-800 px-4 py-1 text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
                <Users className="h-3.5 w-3.5" />
                {locale === "ar" ? "أطباؤنا" : "Notre réseau"}
              </div>
              <h2 className="mt-4 text-balance font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {locale === "ar"
                  ? "أطباء حقيقيون، رعاية حقيقية"
                  : "De vrais médecins, une vraie prise en charge"}
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                {locale === "ar"
                  ? "أطباء مرخصون ومعتمدون عبر تونس، متاحون لاستقبالك"
                  : "Médecins agréés et vérifiés à travers la Tunisie, disponibles pour vous recevoir"}
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {featuredDoctors.map((d, i) => {
                const spec = SPECIALTIES.find((s) => s.id === d.specialty);
                const specLabel = spec
                  ? locale === "ar"
                    ? spec.labelAr
                    : spec.label
                  : d.specialty;
                return (
                  <Link
                    key={d.slug}
                    href={`/medecin/${d.slug}`}
                    className="group flex flex-col items-center gap-3 rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                  >
                    <div className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-secondary group-hover:ring-primary/30 transition-all">
                      <Image
                        src={d.photoUrl}
                        alt={d.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-heading text-sm font-bold text-foreground line-clamp-1">
                        {d.name}
                      </p>
                      <p className="text-xs font-medium text-primary">{specLabel}</p>
                      <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" strokeWidth={2.5} />
                        {d.city}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-10 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-accent" strokeWidth={2.5} />
                <span className="font-medium">
                  {locale === "ar" ? "أطباء معتمدون" : "Médecins agréés CNOM"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={2.5} />
                <span className="font-medium">
                  {locale === "ar" ? "بيانات مؤمّنة" : "Données sécurisées"}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════ SPECIALTIES ═══════════════════════ */}
      <section className="bg-secondary/50 dark:bg-gray-800 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 text-xs font-bold uppercase tracking-wider text-doktori-teal-dark ring-1 ring-border">
              <Stethoscope className="h-3.5 w-3.5" />
              {t("specialtiesBadge")}
            </div>
            <h2 className="mt-4 text-balance font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {t("bySpecialty")}
            </h2>
            <p className="mt-4 text-base text-muted-foreground">{t("specialtiesSubtitle")}</p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SPECIALTIES.map((specialty) => {
              const Icon = SPECIALTY_ICONS[specialty.id] ?? Stethoscope;
              return (
                <Link
                  key={specialty.id}
                  href={`/recherche?specialty=${specialty.id}`}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary transition-all group-hover:scale-105 group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-primary sm:text-sm">
                    {locale === "ar" ? specialty.labelAr : specialty.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/recherche"
              className="group inline-flex items-center gap-2 rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-3 text-sm font-bold text-foreground dark:text-white shadow-sm transition-all hover:border-primary hover:text-primary hover:shadow-md"
            >
              {locale === "ar" ? "عرض كل التخصصات" : "Voir toutes les spécialités"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ WHY DOKTORI (platform promises, not user testimonials) ═══════════════════════ */}
      <section className="relative overflow-hidden bg-white dark:bg-gray-900 px-4 py-24 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-accent/5 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary dark:bg-gray-800 px-4 py-1 text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
              <Heart className="h-3.5 w-3.5" />
              {locale === "ar" ? "لماذا Doktori" : "Pourquoi Doktori"}
            </div>
            <h2 className="mt-4 text-balance font-heading text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {locale === "ar"
                ? "ما نلتزم به تجاهك"
                : "Nos engagements pour vous"}
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              {locale === "ar"
                ? "ثلاث ضمانات تجعل Doktori تجربة موثوقة وسلسة"
                : "Trois engagements qui font de Doktori une expérience fiable et fluide"}
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                key: "fast",
                icon: Zap,
                title:
                  locale === "ar"
                    ? "حجز في أقل من دقيقتين"
                    : "Réservation en moins de 2 min",
                desc:
                  locale === "ar"
                    ? "بحث ذكي، فلاتر دقيقة، وتقويم متاح في الوقت الحقيقي. لا اتصال هاتفي ولا انتظار."
                    : "Recherche intelligente, filtres précis, agenda en temps réel. Plus d'appels, plus d'attente.",
              },
              {
                key: "verified",
                icon: ShieldCheck,
                title:
                  locale === "ar" ? "أطباء معتمدون" : "Médecins agréés CNOM",
                desc:
                  locale === "ar"
                    ? "كل طبيب يتم التحقق من رخصته يدوياً قبل ظهوره على المنصة. صحتك تستحق الجدية."
                    : "Chaque médecin est vérifié manuellement (numéro CNOM, diplômes) avant d'apparaître sur la plateforme.",
              },
              {
                key: "free",
                icon: Heart,
                title:
                  locale === "ar"
                    ? "مجاني للمرضى دائماً"
                    : "100% gratuit côté patient",
                desc:
                  locale === "ar"
                    ? "لا رسوم تسجيل، لا عمولات، لا اشتراكات. الأطباء يدفعون اشتراكاً، ليس أنت."
                    : "Pas de frais d'inscription, pas de commission, pas d'abonnement. Ce sont les médecins qui paient l'outil, jamais vous.",
              },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <article
                  key={p.key}
                  className="group relative flex h-full flex-col rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:duration-700"
                  style={{ animationDelay: `${i * 120}ms`, animationFillMode: "backwards" }}
                >
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                    <Icon className="h-7 w-7" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </article>
              );
            })}
          </div>

          {/* Pre-launch CTA — replaces fake metric counters */}
          <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-primary/20 bg-secondary/50 dark:bg-gray-800 p-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
              {locale === "ar" ? "إطلاق 2026" : "Lancement 2026"}
            </div>
            <p className="max-w-xl text-base text-foreground dark:text-gray-200">
              {locale === "ar"
                ? "نحن في طور بناء شبكتنا. كن من أوائل المرضى الذين سيكتشفون Doktori عند الإطلاق."
                : "Nous construisons le réseau. Soyez parmi les premiers patients à découvrir Doktori dès l'ouverture."}
            </p>
            <Link
              href="/inscription"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-doktori-teal-dark active:scale-[0.98]"
            >
              {locale === "ar" ? "أنا طبيب — أنضم" : "Je suis médecin — m'inscrire"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOR DOCTORS ═══════════════════════ */}
      <section className="relative overflow-hidden bg-foreground px-4 py-24 sm:px-6">
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
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-accent/10 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("forDoctorsBadge")}
            </div>
            <h2 className="mt-6 font-heading text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              {t("forDoctors")}{" "}
              <span className="text-doktori-teal-light">{t("forDoctorsHighlight")}</span>
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
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground">
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
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-accent px-8 font-heading text-base font-bold text-foreground shadow-lg shadow-accent/20 transition-all hover:bg-[#4ADE80] active:scale-[0.98]"
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

      {/* ═══════════════════════ APP DOWNLOAD ═══════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-white to-secondary px-4 py-20 sm:px-6 sm:py-28">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        </div>
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-12 md:flex-row md:gap-16">
          {/* Phone mockup */}
          <div className="flex shrink-0 items-center justify-center">
            <div className="relative">
              <div className="h-[420px] w-[210px] rounded-[2.5rem] border-[6px] border-foreground bg-white p-3 shadow-2xl sm:h-[480px] sm:w-[240px]">
                <div className="h-full w-full overflow-hidden rounded-[2rem] bg-secondary">
                  <div className="flex h-10 items-center justify-center bg-primary">
                    <span className="text-xs font-bold text-white">Doktori</span>
                  </div>
                  <div className="space-y-3 p-3">
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <Search className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-[10px] text-[#64748B]">Rechercher un médecin...</span>
                      </div>
                    </div>
                    {[
                      { name: "Dr. Karim B.", spec: "Généraliste", color: "#0891B2" },
                      { name: "Dr. Sonia T.", spec: "Dermatologue", color: "#22C55E" },
                      { name: "Dr. Mohamed G.", spec: "Pédiatre", color: "#6366F1" },
                    ].map((d) => (
                      <div key={d.name} className="flex items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: d.color }}>
                          {d.name.charAt(4)}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-foreground">{d.name}</p>
                          <p className="text-[8px] text-[#64748B]">{d.spec}</p>
                        </div>
                        <div className="ms-auto rounded-md bg-primary px-2 py-0.5">
                          <span className="text-[7px] font-bold text-white">RDV</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-around rounded-xl bg-white py-2 shadow-sm">
                      <Search className="h-4 w-4 text-primary" />
                      <Siren className="h-4 w-4 text-red-500" />
                      <CalendarCheck2 className="h-4 w-4 text-[#64748B]" />
                      <Users className="h-4 w-4 text-[#64748B]" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -right-4 top-8 rounded-xl bg-white px-3 py-2 shadow-lg ring-1 ring-black/5 sm:-right-8">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground">RDV confirmé !</span>
                </div>
              </div>
            </div>
          </div>

          {/* Text + CTA */}
          <div className="text-center md:text-start">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <Smartphone className="h-3.5 w-3.5" />
              Nouveau
            </div>
            <h2 className="mt-4 font-heading text-3xl font-black leading-tight text-foreground sm:text-4xl">
              Doktori dans<br />
              <span className="text-primary">votre poche</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Prenez rendez-vous en 2 clics, recevez des rappels automatiques et accédez à SOS Docteur — le tout depuis votre téléphone.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-foreground">
              {[
                "Réservation instantanée 24/7",
                "Rappels SMS avant chaque RDV",
                "SOS Docteur — médecin en 2 min",
                "100% gratuit pour les patients",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 justify-center md:justify-start">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:items-start">
              <AppStoreBadge />
              <GooglePlayBadge />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="bg-white dark:bg-gray-900 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                  <Stethoscope className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <span className="font-heading text-xl font-black text-foreground">
                  Doktori<span className="text-primary">.tn</span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t("footerTagline")}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <AppStoreBadge />
                <GooglePlayBadge />
              </div>
            </div>

            <div>
              <h4 className="font-heading text-sm font-bold text-foreground">{t("footerProduct")}</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="/recherche" className="text-muted-foreground hover:text-primary">{t("footerProductSearch")}</Link></li>
                <li><Link href="/sos" className="text-muted-foreground hover:text-primary">{t("footerProductSos")}</Link></li>
                <li><Link href="/inscription" className="text-muted-foreground hover:text-primary">{t("footerProductDoctors")}</Link></li>
                <li><Link href="/faq" className="text-muted-foreground hover:text-primary">{t("footerProductFaq")}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-heading text-sm font-bold text-foreground">{t("footerLegal")}</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="/legal/cgu" className="text-muted-foreground hover:text-primary">{t("footerLegalCgu")}</Link></li>
                <li><Link href="/legal/confidentialite" className="text-muted-foreground hover:text-primary">{t("footerLegalPrivacy")}</Link></li>
                <li><Link href="/legal/mentions" className="text-muted-foreground hover:text-primary">{t("footerLegalMentions")}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-heading text-sm font-bold text-foreground">{t("footerContact")}</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li><a href="mailto:contact@doktori.tn" className="text-muted-foreground hover:text-primary">{t("footerContactEmail")}</a></li>
                <li><span className="text-muted-foreground">{t("footerContactSupport")}</span></li>
                <li><span className="text-muted-foreground">{t("footerContactLocation")}</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border dark:border-gray-700 pt-8 text-center">
            <p className="text-xs text-muted-foreground">{t("footerCopyright")}</p>
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
    reviews: ar ? "تقييمات المرضى" : "Avis patients",
  };
  return (
    <div className="relative mx-auto aspect-[9/19] w-full max-w-[340px]">
      {/* Phone frame */}
      <div className="absolute inset-0 rounded-[3rem] bg-foreground p-3 shadow-2xl shadow-primary/20">
        <div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-white">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-3 text-[10px] font-bold text-foreground">
            <span>9:41</span>
            <span>●●● ●●</span>
          </div>

          {/* Mock app header */}
          <div className="px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-black text-foreground">Doktori</span>
            </div>

            {/* Search input mock */}
            <div className="mt-4 flex h-11 items-center rounded-xl border border-border bg-secondary px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="ms-2 text-xs text-muted-foreground">{tr.searchPh}</span>
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
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-3"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: d.color }}
                  >
                    {d.name.split(" ")[1][0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-foreground">
                      {d.name}
                    </p>
                    <p className="truncate text-[9px] text-muted-foreground">{d.spec}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-[11px] font-black text-primary">{d.price}</p>
                    <p className="text-[8px] text-muted-foreground">DT</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom nav */}
            <div className="mt-4 flex items-center justify-around border-t border-border pt-3">
              <div className="flex flex-col items-center gap-0.5">
                <Search className="h-4 w-4 text-primary" />
                <span className="text-[8px] font-bold text-primary">{tr.navSearch}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Siren className="h-4 w-4 text-destructive" />
                <span className="text-[8px] font-bold text-destructive">{tr.navSos}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-[8px] font-bold text-muted-foreground">{tr.navRdv}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Floating badge */}
      <div className="absolute -left-8 top-1/3 rotate-[-8deg] rounded-xl bg-white p-4 shadow-xl ring-1 ring-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">{tr.rdvConfirmed}</p>
            <p className="text-[10px] text-muted-foreground">{tr.dateLabel}</p>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 bottom-1/4 rotate-[6deg] rounded-xl bg-white p-3 shadow-xl ring-1 ring-border">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-[#FBBF24] text-[#FBBF24]" />
          <span className="text-xs font-black text-foreground">Doktori</span>
        </div>
        <p className="mt-0.5 text-[9px] text-muted-foreground">{tr.reviews}</p>
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
          <div className="ms-auto">
            <div className="flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-bold text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
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
                    ? "bg-accent/20 text-accent"
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
