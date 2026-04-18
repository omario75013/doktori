"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  ChevronDown,
  MessageCircle,
  Stethoscope,
  HelpCircle,
  X,
  Link2,
  Check,
  ThumbsUp,
  ThumbsDown,
  Flame,
  Home,
  ArrowRight,
  Command,
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
  featured: boolean;
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
  // v2
  breadcrumbHome: string;
  breadcrumbCurrent: string;
  featuredLabel: string;
  popularSearchesLabel: string;
  popularSearches: string[];
  shortcutHint: string;
  copyLink: string;
  linkCopied: string;
  helpful: string;
  helpfulYes: string;
  helpfulNo: string;
  feedbackThanks: string;
  browseCategory: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Wraps matches in <mark>. Escapes regex chars. */
function highlight(text: string, q: string): React.ReactNode {
  if (!q.trim()) return text;
  const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${safe})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark
        key={i}
        className="rounded-sm bg-[#FBBF24]/40 px-0.5 text-[#134E4A]"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
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
  breadcrumbHome,
  breadcrumbCurrent,
  featuredLabel,
  popularSearchesLabel,
  popularSearches,
  shortcutHint,
  copyLink,
  linkCopied,
  helpful,
  helpfulYes,
  helpfulNo,
  feedbackThanks,
  browseCategory,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FaqCategoryId | "all">("all");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [visibleCategory, setVisibleCategory] = useState<FaqCategoryId | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});

  const searchRef = useRef<HTMLInputElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const isRtl = locale === "ar";

  // ─── Deep linking via hash ────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setOpenIds((prev) => new Set(prev).add(id));
    // Scroll after paint
    requestAnimationFrame(() => {
      const el = document.getElementById(`faq-card-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [items]);

  // ─── Keyboard shortcut: "/" focuses search ────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Scroll-spy on category sections ──────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          const id = visible.target.getAttribute("data-category") as FaqCategoryId | null;
          if (id) setVisibleCategory(id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory]);

  // ─── Filter + group ────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) return false;
      if (!q) return true;
      return normalize(item.question).includes(q) || normalize(item.answer).includes(q);
    });
  }, [items, query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<FaqCategoryId, Item[]>();
    for (const cat of categories) map.set(cat.id, []);
    for (const item of filtered) map.get(item.category)?.push(item);
    return categories
      .map((c) => ({ ...c, items: map.get(c.id) ?? [] }))
      .filter((c) => c.items.length > 0);
  }, [filtered, categories]);

  const featured = useMemo(() => items.filter((i) => i.featured), [items]);

  const categoryColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categories) m[c.id] = c.color;
    return m;
  }, [categories]);

  const resultsCount = resultsCountTemplate.replace("%count%", String(filtered.length));

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCopy = useCallback(async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      history.replaceState(null, "", `#${id}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }, []);

  const handleVote = useCallback((id: string, value: "up" | "down") => {
    setFeedback((prev) => ({ ...prev, [id]: value }));
    // Fire-and-forget analytics (not implemented yet — no backend endpoint)
    // fetch("/api/faq/feedback", { method: "POST", body: JSON.stringify({ id, value }) });
  }, []);

  const scrollToCategory = useCallback((id: FaqCategoryId) => {
    setActiveCategory("all"); // clear any filter so the section exists
    requestAnimationFrame(() => {
      const el = sectionRefs.current[id];
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#F0FDFA]/30">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden border-b border-[#E6F4F1] bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(#0891B2 1px, transparent 1px), linear-gradient(90deg, #0891B2 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center top, black 30%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-[#22D3EE]/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-[#5E7574]">
            <Link href="/" className="inline-flex items-center gap-1 hover:text-[#0891B2]">
              <Home className="h-3.5 w-3.5" strokeWidth={2.5} />
              {breadcrumbHome}
            </Link>
            <span className="opacity-50">/</span>
            <span className="text-[#0891B2]">{breadcrumbCurrent}</span>
          </nav>

          <div className="py-12 text-center sm:py-16">
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
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="flex-1 bg-transparent text-[15px] font-medium text-[#134E4A] placeholder:text-[#5E7574]/70 focus:outline-none"
                />
                {query ? (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Effacer"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F0FDFA] text-[#0E7490] transition-colors hover:bg-[#E6F4F1]"
                  >
                    <X className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                ) : (
                  <kbd className="hidden items-center gap-1 rounded-md border border-[#E6F4F1] bg-[#F0FDFA] px-2 py-0.5 text-[10px] font-bold text-[#0E7490] sm:inline-flex">
                    <Command className="h-3 w-3" strokeWidth={3} />
                    {shortcutHint}
                  </kbd>
                )}
              </div>

              {/* Popular searches */}
              {!query && popularSearches.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs font-semibold text-[#5E7574]">
                    {popularSearchesLabel}
                  </span>
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setQuery(term);
                        searchRef.current?.focus();
                      }}
                      className="rounded-full border border-[#E6F4F1] bg-white px-3 py-1 text-xs font-semibold text-[#0E7490] transition-all hover:border-[#0891B2] hover:bg-[#F0FDFA]"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURED STRIP ═══════════════ */}
      {!query && activeCategory === "all" && (
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex items-center gap-2">
            <Flame className="h-5 w-5 text-[#F59E0B]" strokeWidth={2.5} />
            <h2 className="font-heading text-lg font-black uppercase tracking-wider text-[#134E4A]">
              {featuredLabel}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item) => {
              const color = categoryColorMap[item.category];
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenIds((prev) => new Set(prev).add(item.id));
                    history.replaceState(null, "", `#${item.id}`);
                    requestAnimationFrame(() => {
                      document
                        .getElementById(`faq-card-${item.id}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    });
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-[#E6F4F1] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#0891B2]/40 hover:shadow-xl hover:shadow-[#0891B2]/5"
                >
                  <div
                    aria-hidden
                    className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.06] blur-2xl transition-opacity group-hover:opacity-[0.12]"
                    style={{ backgroundColor: color }}
                  />
                  <div className="relative">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {categories.find((c) => c.id === item.category)?.label}
                    </span>
                    <h3 className="mt-3 font-heading text-[15px] font-bold leading-snug text-[#134E4A]">
                      {item.question}
                    </h3>
                    <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0891B2]">
                      {isRtl ? "اقرأ" : "Lire la réponse"}
                      <ArrowRight className={`h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 ${isRtl ? "rotate-180" : ""}`} strokeWidth={3} />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════ MAIN GRID ═══════════════ */}
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
        {/* ─── Sticky sidebar ─── */}
        <aside className="mb-8 lg:sticky lg:top-24 lg:mb-0 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#5E7574]">
            {browseCategory}
          </p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
            <button
              onClick={() => {
                setActiveCategory("all");
                setQuery("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`inline-flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all lg:w-full ${
                activeCategory === "all" && !visibleCategory
                  ? "border-[#0891B2] bg-[#0891B2] text-white shadow-sm"
                  : "border-[#E6F4F1] bg-white text-[#134E4A] hover:border-[#0891B2]/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" strokeWidth={2.5} />
                {allLabel}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  activeCategory === "all" && !visibleCategory
                    ? "bg-white/25 text-white"
                    : "bg-[#F0FDFA] text-[#0E7490]"
                }`}
              >
                {items.length}
              </span>
            </button>
            {categories.map((c) => {
              const isActive =
                activeCategory === c.id ||
                (activeCategory === "all" && visibleCategory === c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => scrollToCategory(c.id)}
                  className={`inline-flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all lg:w-full ${
                    isActive
                      ? "border-transparent text-white shadow-sm"
                      : "border-[#E6F4F1] bg-white text-[#134E4A] hover:border-[#0891B2]/40"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: c.color, boxShadow: `0 4px 12px ${c.color}33` }
                      : undefined
                  }
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: isActive ? "rgba(255,255,255,0.95)" : c.color }}
                      aria-hidden
                    />
                    <span className="text-left">{c.label}</span>
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                      isActive ? "bg-white/25 text-white" : "bg-[#F0FDFA] text-[#0E7490]"
                    }`}
                  >
                    {c.count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Mini contact card */}
          <div className="mt-6 hidden rounded-2xl border border-[#22C55E]/30 bg-gradient-to-br from-[#22C55E]/5 via-white to-[#F0FDFA] p-5 lg:block">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#22C55E] text-white shadow-sm">
              <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <p className="font-heading text-sm font-black text-[#134E4A]">
              {stillHaveTitle}
            </p>
            <a
              href="mailto:contact@doktori.tn"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#22C55E] text-xs font-bold text-white transition-all hover:bg-[#16A34A]"
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
              {whatsappCta}
            </a>
          </div>
        </aside>

        {/* ─── Content ─── */}
        <main className="min-w-0">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#5E7574]">
            {resultsCount}
          </p>

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
            <div className="space-y-12">
              {grouped.map((group) => (
                <section
                  key={group.id}
                  ref={(el) => {
                    sectionRefs.current[group.id] = el;
                  }}
                  data-category={group.id}
                  id={`section-${group.id}`}
                  className="scroll-mt-24"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                      style={{ backgroundColor: group.color }}
                      aria-hidden
                    >
                      <HelpCircle className="h-5 w-5" strokeWidth={2.5} />
                    </span>
                    <div>
                      <h2 className="font-heading text-xl font-black text-[#134E4A]">
                        {group.label}
                      </h2>
                      <p className="text-xs font-semibold text-[#5E7574]">
                        {group.items.length} {isRtl ? "سؤال" : "question(s)"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item) => {
                      const isOpen = openIds.has(item.id);
                      const color = categoryColorMap[item.category];
                      const voted = feedback[item.id];
                      const copied = copiedId === item.id;
                      return (
                        <article
                          key={item.id}
                          id={`faq-card-${item.id}`}
                          className={`scroll-mt-24 overflow-hidden rounded-2xl border bg-white transition-all ${
                            isOpen
                              ? "border-[#0891B2]/40 shadow-lg shadow-[#0891B2]/5"
                              : "border-[#E6F4F1] hover:border-[#0891B2]/20"
                          }`}
                        >
                          <button
                            onClick={() => toggle(item.id)}
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
                              {highlight(item.question, query)}
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
                                  {highlight(item.answer, query)}
                                </p>

                                {/* Action row */}
                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#E6F4F1] pt-4">
                                  {/* Helpful vote */}
                                  <div className="flex items-center gap-2">
                                    {voted ? (
                                      <span className="text-xs font-bold text-[#16A34A]">
                                        {feedbackThanks}
                                      </span>
                                    ) : (
                                      <>
                                        <span className="text-xs font-semibold text-[#5E7574]">
                                          {helpful}
                                        </span>
                                        <button
                                          onClick={() => handleVote(item.id, "up")}
                                          aria-label={helpfulYes}
                                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E6F4F1] bg-white px-2.5 text-xs font-bold text-[#5E7574] transition-all hover:border-[#22C55E] hover:bg-[#22C55E]/5 hover:text-[#16A34A]"
                                        >
                                          <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                                          {helpfulYes}
                                        </button>
                                        <button
                                          onClick={() => handleVote(item.id, "down")}
                                          aria-label={helpfulNo}
                                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#E6F4F1] bg-white px-2.5 text-xs font-bold text-[#5E7574] transition-all hover:border-[#DC2626] hover:bg-[#DC2626]/5 hover:text-[#DC2626]"
                                        >
                                          <ThumbsDown className="h-3.5 w-3.5" strokeWidth={2.5} />
                                          {helpfulNo}
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {/* Copy link */}
                                  <button
                                    onClick={() => handleCopy(item.id)}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E6F4F1] bg-white px-2.5 text-xs font-bold text-[#5E7574] transition-all hover:border-[#0891B2] hover:bg-[#F0FDFA] hover:text-[#0891B2]"
                                  >
                                    {copied ? (
                                      <>
                                        <Check className="h-3.5 w-3.5 text-[#16A34A]" strokeWidth={3} />
                                        <span className="text-[#16A34A]">{linkCopied}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Link2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                                        {copyLink}
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

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
                href="mailto:contact@doktori.tn"
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
        </main>
      </div>
    </div>
  );
}
