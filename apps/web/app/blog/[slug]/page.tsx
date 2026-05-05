import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db, blogPosts } from "@doktori/db";
import { eq, and, ne, desc } from "drizzle-orm";
import { Calendar, Tag, ChevronRight, Copy } from "lucide-react";
import { ShareButtons } from "./share-buttons";

export const dynamic = "force-dynamic";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post] = await db
    .select({
      title: blogPosts.title,
      description: blogPosts.description,
      coverImageUrl: blogPosts.coverImageUrl,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)))
    .limit(1);

  if (!post) return { title: "Article introuvable" };

  return {
    title: `${post.title} — Blog Doktori`,
    description: post.description ?? undefined,
    alternates: { canonical: `https://doktori.tn/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description ?? undefined,
      type: "article",
      url: `https://doktori.tn/blog/${slug}`,
      ...(post.coverImageUrl
        ? { images: [{ url: post.coverImageUrl, width: 1200, height: 630 }] }
        : {}),
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)))
    .limit(1);

  if (!post) notFound();

  const relatedPosts = post.category
    ? await db
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          description: blogPosts.description,
          coverImageUrl: blogPosts.coverImageUrl,
          publishedAt: blogPosts.publishedAt,
        })
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.isPublished, true),
            eq(blogPosts.category, post.category),
            ne(blogPosts.slug, slug)
          )
        )
        .orderBy(desc(blogPosts.publishedAt))
        .limit(3)
    : [];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Doktori",
      url: "https://doktori.tn",
    },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
    url: `https://doktori.tn/blog/${post.slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://doktori.tn/blog/${post.slug}`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://doktori.tn" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://doktori.tn/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://doktori.tn/blog/${post.slug}` },
    ],
  };

  const postUrl = `https://doktori.tn/blog/${post.slug}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="min-h-screen bg-secondary dark:bg-gray-900">
        {/* Cover hero */}
        {post.coverImageUrl ? (
          <div className="w-full aspect-[3/1] max-h-[400px] overflow-hidden bg-foreground">
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full h-full object-cover opacity-80"
            />
          </div>
        ) : (
          <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-foreground via-[#0e3d38] to-primary relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5">
              <div className="h-48 w-48 rounded-full border-[3px] border-white" />
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium line-clamp-1">{post.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <article className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8">
                  {post.category && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </span>
                    </div>
                  )}

                  <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight mb-4">
                    {post.title}
                  </h1>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                    <span>·</span>
                    <span className="font-medium">{post.author}</span>
                  </div>

                  {/* Rendered HTML content */}
                  <div
                    className="prose prose-lg max-w-none mt-8 text-foreground
                      prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
                      prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
                      prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-primary
                      prose-p:text-[#334E4C] prose-p:leading-relaxed prose-p:mb-4
                      prose-a:text-primary prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
                      prose-li:text-[#334E4C] prose-li:leading-relaxed
                      prose-ul:my-4 prose-ol:my-4
                      prose-strong:text-foreground prose-strong:font-bold
                      prose-em:text-primary
                      prose-blockquote:border-l-primary prose-blockquote:bg-secondary prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                      prose-img:rounded-xl prose-img:shadow-md prose-img:border prose-img:border-border"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />

                  {/* Share buttons */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <p className="text-sm font-semibold text-muted-foreground mb-3">Partager cet article :</p>
                    <ShareButtons url={postUrl} title={post.title} />
                  </div>
                </div>
              </div>
            </article>

            {/* Sidebar: related posts */}
            <aside className="space-y-4">
              {relatedPosts.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm p-5">
                  <h2 className="text-base font-bold text-foreground mb-4">Articles similaires</h2>
                  <div className="space-y-4">
                    {relatedPosts.map((related) => (
                      <Link
                        key={related.id}
                        href={`/blog/${related.slug}`}
                        className="group flex gap-3 items-start"
                      >
                        {related.coverImageUrl ? (
                          <img
                            src={related.coverImageUrl}
                            alt={related.title}
                            className="w-16 h-16 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-xl">
                            🩺
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {related.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(related.publishedAt)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/blog"
                    className="mt-4 block text-center text-sm font-semibold text-primary hover:underline"
                  >
                    Voir tous les articles →
                  </Link>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
                <h2 className="text-base font-bold text-foreground mb-2">Prendre rendez-vous</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Consultez un médecin en ligne ou en cabinet dès aujourd&apos;hui.
                </p>
                <Link
                  href="/recherche"
                  className="block w-full text-center py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-doktori-teal-dark transition-colors"
                >
                  Trouver un médecin
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
