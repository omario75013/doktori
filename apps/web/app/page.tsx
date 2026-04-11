"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { SPECIALTIES } from "@doktori/shared";

const SPECIALTY_ICONS: Record<string, string> = {
  generaliste: "🩺",
  dermatologue: "🔬",
  ophtalmologue: "👁️",
  gynecologue: "🌸",
  pediatre: "👶",
  dentiste: "🦷",
  orl: "👂",
  cardiologue: "❤️",
  orthopediste: "🦴",
  gastrologue: "🫀",
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
    t("benefit1"),
    t("benefit2"),
    t("benefit3"),
    t("benefit4"),
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-500">
            {t("heroSubtitle")}
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-0"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-14 w-full flex-1 rounded-xl border border-gray-200 bg-white px-5 text-base text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:rounded-r-none sm:rounded-l-xl"
            />
            <button
              type="submit"
              className="h-14 shrink-0 rounded-xl bg-blue-600 px-8 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 sm:rounded-l-none sm:rounded-r-xl"
            >
              {t("searchButton")}
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-400">
            Disponible à Tunis, Ariana, Manouba et bientôt toute la Tunisie
          </p>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            {t("howItWorks")}
          </h2>
          <p className="mt-3 text-center text-gray-500">
            Prendre rendez-vous n&apos;a jamais été aussi simple
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-7 shadow-sm">
              <div className="mb-4 text-3xl">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900">{t("step1Title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {t("step1Desc")}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-7 shadow-sm">
              <div className="mb-4 text-3xl">📅</div>
              <h3 className="text-lg font-semibold text-gray-900">{t("step2Title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {t("step2Desc")}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-7 shadow-sm">
              <div className="mb-4 text-3xl">✅</div>
              <h3 className="text-lg font-semibold text-gray-900">{t("step3Title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {t("step3Desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Par spécialité */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            {t("bySpecialty")}
          </h2>
          <p className="mt-3 text-center text-gray-500">
            Des centaines de médecins disponibles dans toutes les spécialités
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {SPECIALTIES.map((specialty) => (
              <Link
                key={specialty.id}
                href={`/recherche?specialty=${specialty.id}`}
                className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <span className="text-2xl" aria-hidden="true">
                  {SPECIALTY_ICONS[specialty.id] ?? "🏥"}
                </span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                  {specialty.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pour les médecins */}
      <section className="bg-slate-900 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {t("forDoctors")}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-300">
            {t("forDoctorsDesc")}
          </p>

          <ul className="mx-auto mt-8 max-w-xs space-y-3 text-left">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-slate-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                  ✓
                </span>
                <span className="text-sm">{benefit}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/inscription"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-base font-semibold text-white shadow-md transition hover:bg-blue-500 active:bg-blue-700"
          >
            {t("forDoctorsCta")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-gray-400">
            Doktori &copy; 2026 — La prise de rendez-vous médicale en Tunisie
          </p>
          <nav className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <a href="/legal/mentions" className="hover:text-gray-600 transition-colors">
              Mentions légales
            </a>
            <a href="/legal/cgu" className="hover:text-gray-600 transition-colors">
              CGU
            </a>
            <a href="/legal/confidentialite" className="hover:text-gray-600 transition-colors">
              Confidentialité
            </a>
            <a href="#" className="hover:text-gray-600 transition-colors">
              FAQ
            </a>
            <a href="#" className="hover:text-gray-600 transition-colors">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
