"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "", label: "— Choisir une catégorie —" },
  { value: "guide", label: "Guide" },
  { value: "sante", label: "Santé" },
  { value: "actualite", label: "Actualité" },
  { value: "conseil", label: "Conseil" },
  { value: "specialite", label: "Spécialité" },
];

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  coverImageUrl: string;
  author: string;
  category: string;
  tags: string;
  isPublished: boolean;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 255);
}

export function BlogEditor({ post }: { post: BlogPost | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(post?.coverImageUrl ?? "");
  const [author, setAuthor] = useState(post?.author ?? "Doktori");
  const [category, setCategory] = useState(post?.category ?? "");
  const [tags, setTags] = useState(post?.tags ?? "");
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!post?.slug);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugManuallyEdited) {
      setSlug(slugify(val));
    }
  }

  function handleSlugChange(val: string) {
    setSlugManuallyEdited(true);
    setSlug(slugify(val));
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);

    if (!title.trim() || !slug.trim() || !content.trim()) {
      setError("Titre, slug et contenu sont obligatoires.");
      return;
    }

    startTransition(async () => {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        content: content.trim(),
        coverImageUrl: coverImageUrl.trim() || null,
        author: author.trim() || "Doktori",
        category: category || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isPublished,
      };

      const isNew = !post?.id;
      const url = isNew ? "/api/admin/blog" : `/api/admin/blog/${post!.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Erreur lors de la sauvegarde.");
        return;
      }

      const data = await res.json();
      setSuccess("Article sauvegardé avec succès.");

      if (isNew && (data as { post?: { id: string } }).post?.id) {
        router.push(`/admin/blog/${(data as { post: { id: string } }).post.id}`);
      } else {
        router.refresh();
      }
    });
  }

  function handlePreview() {
    if (slug) {
      window.open(`/blog/${slug}`, "_blank");
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/blog"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {post ? "Modifier l'article" : "Nouvel article"}
        </h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Comment prendre rendez-vous chez un médecin..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Slug (URL) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 shrink-0">/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="comment-prendre-rendez-vous"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Description (meta SEO)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Résumé de l'article pour les moteurs de recherche..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Cover image URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                URL de l&apos;image de couverture
              </label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Aperçu"
                  className="mt-2 h-24 w-auto rounded-lg object-cover border border-slate-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Contenu (HTML) <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Écrivez ou collez du HTML. Balises supportées : h2, h3, p, ul, li, strong, em, a.
            </p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              placeholder="<h2>Introduction</h2><p>...</p>"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
            />
          </div>
        </div>

        {/* Sidebar settings */}
        <div className="space-y-5">
          {/* Publish */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Publication</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${
                    isPublished ? "bg-teal-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      isPublished ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-slate-700">
                {isPublished ? "Publié" : "Brouillon"}
              </span>
            </label>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center justify-center gap-2 w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Sauvegarder
              </button>
              {post?.slug && (
                <button
                  onClick={handlePreview}
                  className="flex items-center justify-center gap-2 w-full border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Aperçu
                </button>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Métadonnées</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Auteur
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Doktori"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="guide, tunis, médecin"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
