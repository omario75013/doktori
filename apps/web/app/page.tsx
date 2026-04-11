"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
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
  Activity,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  MessageSquareText,
  MapPin,
  Star,
  Zap,
  Siren,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  generaliste: Stethoscope,
  dermatologue: Sparkles,
  ophtalmologue: Eye,
  gynecologue: Heart,
  pediatre: Baby,
  dentiste: Activity,
  orl: Ear,
  cardiologue: Heart,
  orthopediste: Bone,
  gastrologue: Activity,
};

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const t = useTranslations("landing");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/recherche?${params.toString()}`);
  }

  const benefits = [
    { icon: Clock, text: t("benefit1") },
    { icon: MessageSquareText, text: t("benefit2") },
    { icon: Search, text: t("benefit3") },
    { icon: ShieldCheck, text: t("benefit4") },
  ];

  return (
    <div className="flex flex-col">
      {/* ─────────────────────────────── HERO ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-white px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28">
        {/* Dotted background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_theme(colors.gray.200)_1px,_transparent_1px)] opacity-40 [background-size:24px_24px]"
        />
        {/* Blue glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nouvelle plateforme — 100 premiers médecins gratuits 6 mois</span>
          </div>

          <h1 className="text-balance text-5xl font-extrabold leading-[1.05] tracking-tighter text-gray-900 sm:text-6xl lg:text-7xl">
            Réservez votre médecin{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-br from-blue-600 to-blue-800 bg-clip-text text-transparent">
                en 2 clics
              </span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 -z-0 h-3 bg-yellow-200/70 sm:h-4"
              />
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-balance text-lg leading-relaxed text-gray-600 sm:text-xl">
            {t("heroSubtitle")}
          </p>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-10 max-w-2xl"
          >
            <div className="group flex h-16 items-center rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_4px_32px_-4px_rgba(0,0,0,0.08)] ring-1 ring-gray-100 transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20">
              <div className="flex h-full w-12 shrink-0 items-center justify-center text-gray-400">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Dermatologue, La Marsa..."
                className="h-full flex-1 border-0 bg-transparent px-2 text-base text-gray-900 placeholder:text-gray-400 outline-none"
              />
              <button
                type="submit"
                className="group/btn inline-flex h-full items-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:from-blue-500 hover:to-blue-700 hover:shadow-md active:scale-[0.98]"
              >
                <span>{t("searchButton")}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          </form>

          {/* Trust signals */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span>Tunis • Ariana • Manouba</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>100% sécurisé • Conforme RGPD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>Avis patients vérifiés</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── SOS BANNER ─────────────────────────── */}
      <section className="border-y border-red-100 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
              <Siren className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
              </span>
            </span>
            <div>
              <p className="text-sm font-semibold text-red-900">Besoin d'un médecin maintenant ?</p>
              <p className="text-xs text-red-700">
                Consultation urgente non-vitale. Réponse en moins de 2 minutes.
              </p>
            </div>
          </div>
          <Link
            href="/sos"
            className="group inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md"
          >
            <Zap className="h-4 w-4" />
            <span>Activer SOS Docteur</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ─────────────────────── COMMENT ÇA MARCHE ─────────────────────── */}
      <section className="bg-gray-50/50 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              En 3 étapes
            </p>
            <h2 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              {t("howItWorks")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
              De la recherche à la réservation, en moins de 60 secondes.
            </p>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: Search,
                title: t("step1Title"),
                desc: t("step1Desc"),
                color: "blue",
              },
              {
                icon: CalendarCheck2,
                title: t("step2Title"),
                desc: t("step2Desc"),
                color: "purple",
              },
              {
                icon: CheckCircle2,
                title: t("step3Title"),
                desc: t("step3Desc"),
                color: "green",
              },
            ].map((step, i) => {
              const Icon = step.icon;
              const colorMap: Record<string, string> = {
                blue: "bg-blue-100 text-blue-600 ring-blue-200",
                purple: "bg-purple-100 text-purple-600 ring-purple-200",
                green: "bg-green-100 text-green-600 ring-green-200",
              };
              return (
                <div
                  key={step.title}
                  className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="absolute -right-6 -top-6 text-[120px] font-black leading-none text-gray-50 transition-all group-hover:text-gray-100">
                    0{i + 1}
                  </div>
                  <div
                    className={`relative mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl ring-1 ${colorMap[step.color]}`}
                  >
                    <Icon className="h-7 w-7" strokeWidth={2} />
                  </div>
                  <h3 className="relative text-xl font-bold text-gray-900">{step.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-gray-600">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────── PAR SPÉCIALITÉ ─────────────────────── */}
      <section className="bg-white px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Spécialités
            </p>
            <h2 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              {t("bySpecialty")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
              10 spécialités disponibles dans le Grand Tunis.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {SPECIALTIES.map((specialty) => {
              const Icon = SPECIALTY_ICONS[specialty.id] ?? Stethoscope;
              return (
                <Link
                  key={specialty.id}
                  href={`/recherche?specialty=${specialty.id}`}
                  className="group relative flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 ring-1 ring-blue-100 transition-all group-hover:scale-105 group-hover:from-blue-100 group-hover:to-blue-200">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-blue-700 sm:text-sm">
                    {specialty.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────── POUR LES MÉDECINS ─────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 px-4 py-24 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_theme(colors.white/0.08)_1px,_transparent_1px)] [background-size:32px_32px]"
        />
        <div className="relative mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300">
              <Sparkles className="h-3.5 w-3.5" />
              Programme Fondateur
            </div>
            <h2 className="mt-6 text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {t("forDoctors")}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-300">
              Rejoignez les <span className="font-bold text-white">100 premiers médecins</span>{" "}
              et bénéficiez de <span className="font-bold text-white">6 mois gratuits</span>.
              Après, à partir de 49 DT/mois.
            </p>

            <ul className="mt-8 space-y-3">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <li key={benefit.text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30">
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm leading-6 text-slate-200">{benefit.text}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/inscription"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-bold text-slate-900 shadow-lg transition-all hover:bg-blue-50 active:scale-[0.98]"
              >
                <span>{t("forDoctorsCta")}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/connexion"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                J'ai déjà un compte
              </Link>
            </div>
          </div>

          <div className="relative hidden md:block">
            {/* Floating mockup card */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative rotate-2 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md transition-transform hover:rotate-0">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Dr. Sonia Trabelsi</p>
                    <p className="text-xs text-slate-400">Dermatologue · Tunis</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { time: "09:00", status: "Confirmé" },
                    { time: "10:30", status: "Confirmé" },
                    { time: "11:00", status: "En attente" },
                    { time: "14:00", status: "Confirmé" },
                  ].map((slot) => (
                    <div
                      key={slot.time}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs"
                    >
                      <span className="font-mono font-bold text-white">{slot.time}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          slot.status === "Confirmé"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-yellow-500/20 text-yellow-300"
                        }`}
                      >
                        {slot.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-xs text-slate-400">Aujourd'hui</span>
                  <span className="text-xs font-bold text-white">12 RDV</span>
                </div>
              </div>
            </div>
            <div className="h-[380px]" />
          </div>
        </div>
      </section>

      {/* ──────────────────────────── FOOTER ──────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span className="text-lg font-extrabold text-gray-900">
                Doktori<span className="text-blue-600">.tn</span>
              </span>
            </div>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <Link href="/legal/mentions" className="text-gray-500 transition-colors hover:text-gray-900">
                Mentions légales
              </Link>
              <Link href="/legal/cgu" className="text-gray-500 transition-colors hover:text-gray-900">
                CGU
              </Link>
              <Link href="/legal/confidentialite" className="text-gray-500 transition-colors hover:text-gray-900">
                Confidentialité
              </Link>
              <a href="#" className="text-gray-500 transition-colors hover:text-gray-900">
                FAQ
              </a>
              <a href="#" className="text-gray-500 transition-colors hover:text-gray-900">
                Contact
              </a>
            </nav>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-6 text-center">
            <p className="text-xs text-gray-400">
              Doktori &copy; 2026 — La prise de rendez-vous médicale en Tunisie.
              Conçu avec ❤️ pour les patients et les médecins tunisiens.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
