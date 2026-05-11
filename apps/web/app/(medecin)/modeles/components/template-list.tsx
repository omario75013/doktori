"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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

export function TemplateList({ templates, doctorId }: Props) {
  const router = useRouter();
  const t = useTranslations("medecin.modeles");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? "ar-TN" : "fr-TN";
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState<"all" | "fr" | "ar">("all");
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const filtered = templates.filter((tpl) => {
    const matchSearch = tpl.title.toLowerCase().includes(search.toLowerCase());
    const matchLang = lang === "all" || tpl.language === lang;
    return matchSearch && matchLang;
  });

  const official = filtered.filter((tpl) => tpl.isOfficial);
  const mine = filtered.filter((tpl) => !tpl.isOfficial && tpl.doctorId === doctorId);

  async function handleClone(id: string) {
    setCloningId(id);
    try {
      const res = await fetch(`/api/medecin/templates/${id}/clone`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? t("errorDuplicate"));
      }
      const cloned = await res.json();
      toast.success(t("duplicated"));
      toast.warning(t("duplicateWarning"), { duration: 2000 });
      router.push(`/modeles/${cloned.id}/edit`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("errorServer"));
    } finally {
      setCloningId(null);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(t("confirmDelete", { title }))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/medecin/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? t("errorDelete"));
      }
      toast.success(t("deleted"));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("errorServer"));
    } finally {
      setDeletingId(null);
    }
  }

  const totalCount = templates.length;
  const countLabel = totalCount > 1 ? t("countOther", { count: totalCount }) : t("countOne", { count: totalCount });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("title")}</h1>
            <p className="text-sm text-gray-500">{countLabel}</p>
          </div>
        </div>
        <Link
          href="/modeles/nouveau"
          className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground h-7 gap-1 px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all hover:opacity-90"
        >
          <Plus className="size-3.5" />
          {t("newTemplate")}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 rounded-xl"
          />
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as "all" | "fr" | "ar")}
          className="h-9 rounded-lg border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">{t("filterAll")}</option>
          <option value="fr">{t("filterFr")}</option>
          <option value="ar">{t("filterAr")}</option>
        </select>
      </div>

      {/* Official templates */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
          <span>{t("officialSection")}</span>
          <span className="text-xs font-normal text-gray-400">({official.length})</span>
        </h2>
        {official.length === 0 ? (
          <p className="text-sm text-gray-400 italic px-2">
            {search || lang !== "all" ? t("noOfficialFiltered") : t("noOfficial")}
          </p>
        ) : (
          <div className="ds-card overflow-hidden">
            {official.map((tpl, i) => (
              <div
                key={tpl.id}
                className={`flex items-center justify-between px-4 py-3 gap-4 ${
                  i < official.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{tpl.title}</span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                        tpl.language === "ar"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {tpl.language.toUpperCase()}
                    </span>
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{tpl.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/modeles/${tpl.id}/edit`}
                    className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <Eye className="size-3" />
                    {t("view")}
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    disabled={cloningId === tpl.id}
                    onClick={() => handleClone(tpl.id)}
                  >
                    {cloningId === tpl.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {t("duplicate")}
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
          <span>{t("mySection")}</span>
          <span className="text-xs font-normal text-gray-400">({mine.length})</span>
        </h2>
        {mine.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-gray-50/50 px-6 py-10 text-center">
            <FileText className="size-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">{t("noPersonal")}</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">{t("noPersonalDesc")}</p>
            <Link
              href="/modeles/nouveau"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <Plus className="size-4" />
              {t("createTemplate")}
            </Link>
          </div>
        ) : (
          <div className="ds-card overflow-hidden">
            {mine.map((tpl, i) => (
              <div
                key={tpl.id}
                className={`flex items-center justify-between px-4 py-3 gap-4 ${
                  i < mine.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{tpl.title}</span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                        tpl.language === "ar"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {tpl.language.toUpperCase()}
                    </span>
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{tpl.description}</p>
                  )}
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {t("modifiedOn", { date: formatDate(tpl.updatedAt) })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/modeles/${tpl.id}/edit`}
                    className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
                  >
                    <Pencil className="size-3" />
                    {t("edit")}
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                    disabled={deletingId === tpl.id}
                    onClick={() => handleDelete(tpl.id, tpl.title)}
                  >
                    {deletingId === tpl.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                    {t("delete")}
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
