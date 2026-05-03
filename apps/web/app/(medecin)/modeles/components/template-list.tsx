"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Plus, Copy, Pencil, Trash2, Eye, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Template {
  id: string;
  title: string;
  description: string | null;
  language: string;
  isOfficial: boolean;
  doctorId: string | null;
  applyCount: number;
  cloneCount: number;
  updatedAt: string;
}

interface Props {
  templates: Template[];
  doctorId: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function TemplateList({ templates, doctorId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState<"all" | "fr" | "ar">("all");
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = templates.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchLang = lang === "all" || t.language === lang;
    return matchSearch && matchLang;
  });

  const official = filtered.filter((t) => t.isOfficial);
  const mine = filtered.filter((t) => !t.isOfficial && t.doctorId === doctorId);

  async function handleClone(id: string) {
    setCloningId(id);
    try {
      const res = await fetch(`/api/medecin/templates/${id}/clone`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la duplication");
      }
      const cloned = await res.json();
      toast.success("Modèle dupliqué");
      router.push(`/medecin/modeles/${cloned.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur serveur");
    } finally {
      setCloningId(null);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer le modèle "${title}" ? Cette action est irréversible.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/medecin/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la suppression");
      }
      toast.success("Modèle supprimé");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur serveur");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Modèles de documents</h1>
            <p className="text-sm text-gray-500">
              {templates.length} modèle{templates.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Link
          href="/medecin/modeles/nouveau"
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground h-7 gap-1 px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all hover:opacity-90"
        >
          <Plus className="size-3.5" />
          Nouveau modèle
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un modèle…"
            className="pl-9 rounded-xl"
          />
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as "all" | "fr" | "ar")}
          className="h-9 rounded-lg border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Toutes les langues</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </select>
      </div>

      {/* Official templates */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
          <span>📌 Officiels Doktori</span>
          <span className="text-xs font-normal text-gray-400">({official.length})</span>
        </h2>
        {official.length === 0 ? (
          <p className="text-sm text-gray-400 italic px-2">
            Aucun modèle officiel {search || lang !== "all" ? "pour cette recherche" : "disponible"}.
          </p>
        ) : (
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            {official.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-4 py-3 gap-4 ${
                  i < official.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{t.title}</span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                        t.language === "ar"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {t.language.toUpperCase()}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/medecin/modeles/${t.id}/edit`}
                    className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <Eye className="size-3" />
                    Voir
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    disabled={cloningId === t.id}
                    onClick={() => handleClone(t.id)}
                  >
                    {cloningId === t.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    Dupliquer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Personal templates */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
          <span>📋 Mes modèles</span>
          <span className="text-xs font-normal text-gray-400">({mine.length})</span>
        </h2>
        {mine.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-gray-50/50 px-6 py-10 text-center">
            <FileText className="size-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Aucun modèle personnel</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Créez votre premier modèle ou dupliquez un modèle officiel.
            </p>
            <Link
              href="/medecin/modeles/nouveau"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <Plus className="size-4" />
              Créer un modèle
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            {mine.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-4 py-3 gap-4 ${
                  i < mine.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{t.title}</span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                        t.language === "ar"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {t.language.toUpperCase()}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    Modifié le {formatDate(t.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/medecin/modeles/${t.id}/edit`}
                    className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <Pencil className="size-3" />
                    Éditer
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                    disabled={deletingId === t.id}
                    onClick={() => handleDelete(t.id, t.title)}
                  >
                    {deletingId === t.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
