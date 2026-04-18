import type { Metadata } from "next";
import Link from "next/link";
import { db, blogPosts } from "@doktori/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { Calendar, Tag, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog Santé — Doktori",
  description:
    "Conseils santé, guides pratiques et actualités médicales de la plateforme Doktori en Tunisie.",
  openGraph: {
    title: "Blog Santé — Doktori",
    description:
      "Conseils santé, guides pratiques et actualités médicales de la plateforme Doktori en Tunisie.",
    url: "https://doktori.tn/blog",
    type: "website",
  },
};

const PAGE_SIZE = 10;

const CATEGORY_LABELS: Record<string, string> = {
  guide: "Guide",
  sante: "Santé",
  actualite: "Actualité",
  conseil: "Conseil",
  specialite: "Spécialité",
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

  return (
    <main className="min-h-screen bg-[#F0FDFA]">
      {/* Hero */}
      <div className="bg-[#134E4A] py-14 px-4 text-center text-white">
        <h1 className="text-4xl font-black tracking-tight mb-3">Blog Santé</h1>
        <p className="text-teal-200 text-lg max-w-xl mx-auto">
          Guides pratiques, conseils médicaux et actualités de la santé en Tunisie.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Category filter pills */}
        {uniqueCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href="/blog"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                !categorie || categorie === "all"
                  ? "bg-[#0891B2] text-white"
                  : "bg-white text-[#5E7574] border border-[#E6F4F1] hover:bg-[#F0FDFA]"
              }`}
            >
              Tous
            </Link>
            {uniqueCategories.map((cat) => (
              <Link
                key={cat}
                href={`/blog?categorie=${cat}`}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  categorie === cat
                    ? "bg-[#0891B2] text-white"
                    : "bg-white text-[#5E7574] border border-[#E6F4F1] hover:bg-[#F0FDFA]"
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </Link>
            ))}
          </div>
        )}

        {/* Articles grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20 text-[#5E7574]">
            <p className="text-xl font-semibold">Aucun article pour le moment.</p>
            <p className="mt-2 text-sm">Revenez bientôt pour nos conseils santé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl overflow-hidden border border-[#E6F4F1] shadow-sm hover:shadow-md transition-shadow"
              >
                {post.coverImageUrl ? (
                  <div className="aspect-video overflow-hidden bg-[#E6F4F1]">
                    <img
                      src={post.coverImageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-[#0891B2]/10 to-[#134E4A]/10 flex items-center justify-center">
                    <span className="text-4xl">🩺</span>
                  </div>
                )}
                <div className="p-5">
                  {post.category && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Tag className="w-3.5 h-3.5 text-[#0891B2]" />
                      <span className="text-xs font-semibold text-[#0891B2] uppercase tracking-wide">
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </span>
                    </div>
                  )}
                  <h2 className="text-base font-bold text-[#134E4A] group-hover:text-[#0891B2] transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h2>
                  {post.description && (
                    <p className="text-sm text-[#5E7574] line-clamp-2 mb-3">
                      {post.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-[#5E7574]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(post.publishedAt)}</span>
                    <span className="mx-1">·</span>
                    <span className="font-medium">{post.author}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            {page > 1 && (
              <Link
                href={`/blog?page=${page - 1}${categorie ? `&categorie=${categorie}` : ""}`}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#E6F4F1] bg-white text-sm font-semibold text-[#134E4A] hover:bg-[#F0FDFA] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </Link>
            )}
            <span className="text-sm text-[#5E7574]">
              Page {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/blog?page=${page + 1}${categorie ? `&categorie=${categorie}` : ""}`}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#E6F4F1] bg-white text-sm font-semibold text-[#134E4A] hover:bg-[#F0FDFA] transition-colors"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
