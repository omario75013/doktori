"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  ChevronDown,
  MessageCircle,
  Stethoscope,
  HelpCircle,
  X,
} from "lucide-react";
import type { FaqCategoryId } from "./faq-data";

interface Category {
  id: FaqCategoryId;
  label: string;
  color: string;
  count: number;
}

interface Item {
  id: string;
  category: FaqCategoryId;
  question: string;
  answer: string;
}

interface Props {
  locale: "fr" | "ar";
  heading: string;
  subheading: string;
  searchPlaceholder: string;
  allLabel: string;
  resultsCountTemplate: string;
  emptyTitle: string;
  emptyDesc: string;
  stillHaveTitle: string;
  stillHaveDesc: string;
  whatsappCta: string;
  searchDoctorCta: string;
  categories: Category[];
  items: Item[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function FaqClient({
  locale,
  heading,
  subheading,
  searchPlaceholder,
  allLabel,
  resultsCountTemplate,
  emptyTitle,
  emptyDesc,
  stillHaveTitle,
  stillHaveDesc,
  whatsappCta,
  searchDoctorCta,
  categories,
  items,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FaqCategoryId | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) return false;
      if (!q) return true;
      return normalize(item.question).includes(q) || normalize(item.answer).includes(q);
    });
  }, [items, query, activeCategory]);

  const resultsCount = resultsCountTemplate.replace("%count%", String(filtered.length));
  const isRtl = locale === "ar";

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.id] = c.color;
    return map;
  }, [categories]);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#F0FDFA]/30">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden border-b border-[#E6F4F1] bg-white">
        {/* Subtle grid pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(#0891B2 1px, transparent 1px), linear-gradient(90deg, #0891B2 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse at center top, black 30%, transparent 75%)",
          }}
        />
        {/* Soft teal glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-[#22D3EE]/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#E6F4F1] bg-white px-4 py-1.5 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#0891B2]" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0E7490]">
              {isRtl ? "مركز المساعدة" : "Centre d'aide"}
            </span>
          </div>

          <h1 className="mt-6 font-heading text-4xl font-black tracking-tight text-[#134E4A] sm:text-5xl md:text-6xl">
            {heading}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#5E7574] sm:text-lg">
            {subheading}
          </p>

          {/* Search */}
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="group flex h-14 items-center gap-3 rounded-2xl border-2 border-[#E6F4F1] bg-white px-5 shadow-sm transition-all focus-within:border-[#0891B2] focus-within:shadow-lg focus-within:shadow-[#0891B2]/10">
              <Search className="h-5 w-5 shrink-0 text-[#5E7574]" strokeWidth={2.5} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="flex-1 bg-transparent text-[15px] font-medium text-[#134E4A] placeholder:text-[#5E7574]/70 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Effacer"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F0FDFA] text-[#0E7490] transition-colors hover:bg-[#E6F4F1]"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ BODY ═══════════════ */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Category pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-bold transition-all ${
              activeCategory === "all"
                ? "border-[#0891B2] bg-[#0891B2] text-white shadow-md shadow-[#0891B2]/20"
                : "border-[#E6F4F1] bg-white text-[#134E4A] hover:border-[#0891B2]/40"
            }`}
          >
            <span>{allLabel}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                activeCategory === "all" ? "bg-white/20 text-white" : "bg-[#F0FDFA] text-[#0E7490]"
              }`}
            >
              {items.length}
            </span>
          </button>
          {categories.map((c) => {
            const active = activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-bold transition-all ${
                  active
                    ? "border-transparent text-white shadow-md"
                    : "border-[#E6F4F1] bg-white text-[#134E4A] hover:border-[#0891B2]/40"
                }`}
                style={
                  active
                    ? { backgroundColor: c.color, boxShadow: `0 4px 12px ${c.color}33` }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? "rgba(255,255,255,0.9)" : c.color }}
                  aria-hidden
                />
                <span>{c.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    active ? "bg-white/25 text-white" : "bg-[#F0FDFA] text-[#0E7490]"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results counter */}
        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-[#5E7574]">
          {resultsCount}
        </p>

        {/* Accordion list */}
        <div className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-[#E6F4F1] bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDFA] text-[#0891B2]">
                <HelpCircle className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h3 className="mt-4 font-heading text-lg font-black text-[#134E4A]">
                {emptyTitle}
              </h3>
              <p className="mt-2 text-sm text-[#5E7574]">{emptyDesc}</p>
            </div>
          ) : (
            filtered.map((item) => {
              const isOpen = openId === item.id;
              const color = categoryColorMap[item.category] ?? "#0891B2";
              return (
                <article
                  key={item.id}
                  className={`group overflow-hidden rounded-2xl border bg-white transition-all ${
                    isOpen
                      ? "border-[#0891B2]/40 shadow-lg shadow-[#0891B2]/5"
                      : "border-[#E6F4F1] hover:border-[#0891B2]/20"
                  }`}
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="flex w-full items-center gap-4 px-5 py-5 text-start sm:px-6"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${item.id}`}
                  >
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <h3 className="flex-1 font-heading text-[15px] font-bold leading-snug text-[#134E4A] sm:text-base">
                      {item.question}
                    </h3>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[#0891B2] transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      strokeWidth={2.5}
                    />
                  </button>
                  <div
                    id={`faq-${item.id}`}
                    role="region"
                    className={`grid overflow-hidden transition-all duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0">
                      <div className="border-t border-[#E6F4F1] px-5 py-5 sm:px-6 sm:py-6">
                        <p className="whitespace-pre-line text-[14px] leading-relaxed text-[#5E7574] sm:text-[15px]">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* ═══════════════ STILL HAVE A QUESTION ═══════════════ */}
        <section className="mt-16 overflow-hidden rounded-3xl border-2 border-[#0891B2]/20 bg-gradient-to-br from-[#F0FDFA] via-white to-[#F0FDFA] p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0891B2] text-white shadow-lg shadow-[#0891B2]/30">
            <MessageCircle className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h2 className="mt-6 font-heading text-2xl font-black text-[#134E4A] sm:text-3xl">
            {stillHaveTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#5E7574] sm:text-base">
            {stillHaveDesc}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://wa.me/21620000000"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-6 text-sm font-bold text-white shadow-md shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] hover:shadow-lg"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
              {whatsappCta}
            </a>
            <Link
              href="/recherche"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#0891B2] bg-white px-6 text-sm font-bold text-[#0891B2] transition-all hover:bg-[#F0FDFA]"
            >
              <Stethoscope className="h-4 w-4" strokeWidth={2.5} />
              {searchDoctorCta}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
