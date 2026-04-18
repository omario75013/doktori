import { db, blogPosts } from "@doktori/db";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, Pencil, Eye, EyeOff, Calendar, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  guide: "Guide",
  sante: "Santé",
  actualite: "Actualité",
  conseil: "Conseil",
  specialite: "Spécialité",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminBlogPage() {
  const posts = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      category: blogPosts.category,
      isPublished: blogPosts.isPublished,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
      author: blogPosts.author,
    })
    .from(blogPosts)
    .orderBy(desc(blogPosts.createdAt));

  const publishedCount = posts.filter((p) => p.isPublished).length;
  const draftCount = posts.filter((p) => !p.isPublished).length;

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blog</h1>
          <p className="text-slate-500 mt-1">
            {posts.length} article{posts.length !== 1 ? "s" : ""} ·{" "}
            <span className="text-green-600 font-medium">{publishedCount} publié{publishedCount !== 1 ? "s" : ""}</span>
            {" · "}
            <span className="text-amber-600 font-medium">{draftCount} brouillon{draftCount !== 1 ? "s" : ""}</span>
          </p>
        </div>
        <Link
          href="/admin/blog/nouveau"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel article
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-lg">Aucun article pour le moment.</p>
          <Link
            href="/admin/blog/nouveau"
            className="mt-4 inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Créer le premier article
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Titre
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Catégorie
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 line-clamp-1">{post.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">/blog/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {post.category ? (
                      <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-2 py-0.5 rounded text-xs font-medium">
                        <Tag className="w-3 h-3" />
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {post.isPublished ? (
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <Eye className="w-3 h-3" />
                        Publié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <EyeOff className="w-3 h-3" />
                        Brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-teal-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier
                      </Link>
                      {post.isPublished && (
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Voir →
                        </Link>
                      )}
                    </div>
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
