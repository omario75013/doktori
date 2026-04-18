import type { Metadata } from "next";
import Link from "next/link";
import { db, blogPosts } from "@doktori/db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Search,
  Stethoscope,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog Santé — Conseils médicaux en Tunisie",
  description:
    "Guides pratiques, conseils médicaux et actualités santé pour les patients en Tunisie. Spécialités, traitements, prévention et bien-être.",
  alternates: {
    canonical: "https://doktori.tn/blog",
  },
  openGraph: {
    title: "Blog Santé — Conseils médicaux en Tunisie",
    description:
      "Guides pratiques, conseils médicaux et actualités santé pour les patients en Tunisie.",
    url: "https://doktori.tn/blog",
    siteName: "Doktori",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog Santé — Conseils médicaux en Tunisie",
    description:
      "Guides pratiques, conseils médicaux et actualités santé pour les patients en Tunisie.",
  },
};

const PAGE_SIZE = 9;

const CATEGORY_LABELS: Record<string, string> = {
  guide: "Guide",
  sante: "Santé",
  actualite: "Actualité",
  conseil: "Conseil",
  specialite: "Spécialité",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  guide: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  sante: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  actualite: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  conseil: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  specialite: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const CATEGORY_EMOJIS: Record<string, string> = {
  guide: "📖",
  sante: "💚",
  actualite: "📰",
  conseil: "💡",
  specialite: "🩺",
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function readTime(content: string | null): string {
  if (!content) return "3 min";
  const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  return `${Math.max(2, Math.ceil(words / 200))} min de lecture`;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; categorie?: string }>;
}) {
  const { page: pageParam, categorie } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  const where =
    categorie && categorie !== "all"
      ? and(eq(blogPosts.isPublished, true), eq(blogPosts.category, categorie))
      : eq(blogPosts.isPublished, true);

  const [posts, [{ total }], categories] = await Promise.all([
    db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        description: blogPosts.description,
        content: blogPosts.content,
        coverImageUrl: blogPosts.coverImageUrl,
        author: blogPosts.author,
        category: blogPosts.category,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .where(where)
      .orderBy(desc(blogPosts.publishedAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(blogPosts)
      .where(where),
    db
      .selectDistinct({ category: blogPosts.category })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true)),
  ]);

  const totalPages = Math.ceil((total ?? 0) / PAGE_SIZE);
  const uniqueCategories = categories
    .map((c) => c.category)
    .filter((c): c is string => c !== null);

  // Separate featured post (first one) from the rest
  const featuredPost = posts.length > 0 && page === 1 && !categorie ? posts[0] : null;
  const gridPosts = featuredPost ? posts.slice(1) : posts;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F0FDFA] via-white to-[#F0FDFA]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#134E4A]">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#0891B2]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-white/5 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-teal-200 backdrop-blur-sm">
            <BookOpen className="h-4 w-4" />
            Blog Santé
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl mb-4">
            Votre santé,{" "}
            <span className="bg-gradient-to-r from-teal-200 to-cyan-200 bg-clip-text text-transparent">
              nos conseils
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-teal-200/80">
            Guides pratiques, conseils de médecins et actualités santé pour mieux prendre soin de vous et de vos proches en Tunisie.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* ── Category filter ── */}
        {uniqueCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <Link
              href="/blog"
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                !categorie || categorie === "all"
                  ? "bg-[#134E4A] text-white shadow-sm"
                  : "bg-white text-[#5E7574] border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              Tous les articles
            </Link>
            {uniqueCategories.map((cat) => {
              const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.guide;
              const emoji = CATEGORY_EMOJIS[cat] ?? "📄";
              return (
                <Link
                  key={cat}
                  href={`/blog?categorie=${cat}`}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    categorie === cat
                      ? "bg-[#134E4A] text-white shadow-sm"
                      : `bg-white ${colors.text} border ${colors.border} hover:${colors.bg}`
                  }`}
                >
                  <span>{emoji}</span>
                  {CATEGORY_LABELS[cat] ?? cat}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Empty state ── */}
        {posts.length === 0 && (
          <div className="text-center py-24">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#F0FDFA]">
              <Stethoscope className="h-10 w-10 text-[#0891B2]" />
            </div>
            <h2 className="text-2xl font-bold text-[#134E4A] mb-2">
              Aucun article pour le moment
            </h2>
            <p className="text-gray-500 mb-6">
              Nos médecins préparent de nouveaux contenus. Revenez bientôt !
            </p>
            <Link
              href="/recherche"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0891B2] px-6 py-3 text-sm font-bold text-white hover:bg-[#0e7490] transition-colors"
            >
              <Search className="h-4 w-4" />
              Trouver un médecin
            </Link>
          </div>
        )}

        {/* ── Featured article (only on first page, no category filter) ── */}
        {featuredPost && (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="group mb-10 block overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all"
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Image */}
              <div className="aspect-video md:aspect-auto overflow-hidden bg-gradient-to-br from-[#0891B2]/10 via-[#134E4A]/10 to-[#0891B2]/5">
                {featuredPost.coverImageUrl ? (
                  <img
                    src={featuredPost.coverImageUrl}
                    alt={featuredPost.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full min-h-[240px] items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                        <BookOpen className="h-8 w-8 text-[#0891B2]" />
                      </div>
                      <p className="text-sm font-medium text-[#0891B2]/60">Article vedette</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col justify-center p-8 sm:p-10">
                <div className="mb-3 flex items-center gap-3">
                  {featuredPost.category && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                        CATEGORY_COLORS[featuredPost.category]?.bg ?? "bg-gray-50"
                      } ${CATEGORY_COLORS[featuredPost.category]?.text ?? "text-gray-600"}`}
                    >
                      {CATEGORY_EMOJIS[featuredPost.category] ?? "📄"}{" "}
                      {CATEGORY_LABELS[featuredPost.category] ?? featuredPost.category}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {readTime(featuredPost.content)}
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-[#134E4A] group-hover:text-[#0891B2] transition-colors mb-3 sm:text-3xl">
                  {featuredPost.title}
                </h2>

                {featuredPost.description && (
                  <p className="text-gray-500 leading-relaxed mb-4 line-clamp-3">
                    {featuredPost.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(featuredPost.publishedAt)}</span>
                    <span className="mx-1">·</span>
                    <span className="font-medium text-gray-500">{featuredPost.author}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0891B2] opacity-0 translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                    Lire
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ── Articles grid ── */}
        {gridPosts.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gridPosts.map((post, index) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Image / Placeholder */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  {post.coverImageUrl ? (
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0891B2]/5 via-[#134E4A]/5 to-[#0891B2]/10">
                      <span className="text-5xl opacity-40">
                        {CATEGORY_EMOJIS[post.category ?? "guide"] ?? "📄"}
                      </span>
                    </div>
                  )}

                  {/* Category badge overlay */}
                  {post.category && (
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${
                          CATEGORY_COLORS[post.category]?.bg ?? "bg-white/90"
                        } ${CATEGORY_COLORS[post.category]?.text ?? "text-gray-600"} shadow-sm`}
                      >
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="mb-2 text-base font-bold text-[#134E4A] leading-snug group-hover:text-[#0891B2] transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  {post.description && (
                    <p className="mb-4 flex-1 text-sm text-gray-500 leading-relaxed line-clamp-2">
                      {post.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {readTime(post.content)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-3">
            {page > 1 && (
              <Link
                href={`/blog?page=${page - 1}${categorie ? `&categorie=${categorie}` : ""}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#134E4A] shadow-sm hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Link>
            )}
            <span className="rounded-xl bg-[#134E4A] px-4 py-2.5 text-sm font-bold text-white">
              {page}
            </span>
            {totalPages > 1 && (
              <span className="text-sm text-gray-400">/ {totalPages}</span>
            )}
            {page < totalPages && (
              <Link
                href={`/blog?page=${page + 1}${categorie ? `&categorie=${categorie}` : ""}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#134E4A] shadow-sm hover:bg-gray-50 transition-colors"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        {/* ── Newsletter CTA ── */}
        <section className="mt-16 mb-8 rounded-2xl bg-gradient-to-br from-[#134E4A] to-[#0e3d38] p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-[#0891B2]/10 blur-3xl" />
          <div className="relative">
            <h3 className="text-2xl font-bold text-white mb-2 sm:text-3xl">
              Restez informé
            </h3>
            <p className="text-teal-200/80 mb-6 max-w-lg mx-auto">
              Recevez nos derniers articles, conseils santé et guides pratiques directement dans votre boîte mail.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="votre@email.com"
                className="flex-1 rounded-xl border-0 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]"
              />
              <button className="rounded-xl bg-[#0891B2] px-6 py-3 text-sm font-bold text-white hover:bg-[#0e7490] transition-colors shadow-lg shadow-[#0891B2]/20">
                S&apos;abonner
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
