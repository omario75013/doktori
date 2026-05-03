"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VariableHelperPanel } from "./variable-helper-panel";
import { TemplatePreview } from "./template-preview";
import { HighlightedTextarea } from "./highlighted-textarea";

interface InitialData {
  id: string;
  title: string;
  description: string | null;
  language: string;
  bodyMarkdown: string;
  slug?: string | null;
}

interface Props {
  /** "create" | "edit" — doctor flow. "admin" — admin creates/edits official templates. */
  mode: "create" | "edit" | "admin";
  initialData?: InitialData;
}

export function TemplateEditor({ mode, initialData }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [language, setLanguage] = useState<"fr" | "ar">(
    (initialData?.language as "fr" | "ar") ?? "fr"
  );
  const [body, setBody] = useState(initialData?.bodyMarkdown ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [isOfficialLocked] = useState(mode === "admin" && !!initialData?.id);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Track dirty state
  useEffect(() => {
    if (mode === "create" || mode === "admin") {
      setDirty(title.length > 0 || body.length > 0);
    } else {
      const changed =
        title !== (initialData?.title ?? "") ||
        description !== (initialData?.description ?? "") ||
        language !== ((initialData?.language as "fr" | "ar") ?? "fr") ||
        body !== (initialData?.bodyMarkdown ?? "") ||
        slug !== (initialData?.slug ?? "");
      setDirty(changed);
    }
  }, [title, description, language, body, slug, mode, initialData]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }

    if (mode === "admin" && (!slug.trim() || !/^[a-z0-9-]+$/.test(slug.trim()))) {
      toast.error("Le slug est obligatoire (lettres minuscules, chiffres, tirets)");
      return;
    }

    setSaving(true);
    try {
      let url: string;
      let method: string;
      if (mode === "admin") {
        url = initialData?.id
          ? `/api/admin/templates/${initialData.id}`
          : "/api/admin/templates";
        method = initialData?.id ? "PATCH" : "POST";
      } else {
        url = "/api/medecin/templates";
        method = "POST";
        if (mode === "edit" && initialData?.id) {
          url = `/api/medecin/templates/${initialData.id}`;
          method = "PATCH";
        }
      }

      const payload: Record<string, unknown> = { title, description, language, bodyMarkdown: body };
      if (mode === "admin") payload.slug = slug.trim();

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la sauvegarde");
      }

      setDirty(false);
      if (mode === "admin") {
        toast.success(initialData?.id ? "Modèle officiel mis à jour" : "Modèle officiel créé");
        router.push("/admin/templates");
      } else {
        toast.success(mode === "create" ? "Modèle créé avec succès" : "Modèle mis à jour");
        router.push("/medecin/modeles");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur serveur");
    } finally {
      setSaving(false);
    }
  }, [title, description, language, body, slug, mode, initialData, router]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === "create"
              ? "Nouveau modèle"
              : mode === "admin"
              ? initialData?.id
                ? "Modifier le modèle officiel"
                : "Nouveau modèle officiel"
              : "Modifier le modèle"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {mode === "admin"
              ? "Modèle officiel Doktori — visible par tous les médecins"
              : "Utilisez les variables pour personnaliser automatiquement le contenu"}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </Button>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left col — 2/3 width */}
        <div className="col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-white shadow-sm p-5 space-y-4">
            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-medium">
                Titre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Ex: Ordonnance standard cardiologie"
                className="rounded-lg"
              />
              <p className="text-xs text-gray-400 text-right">{title.length}/120</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description courte (optionnelle)"
                className="rounded-lg"
              />
            </div>

            {/* Slug — admin mode uniquement */}
            {mode === "admin" && (
              <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-sm font-medium">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  maxLength={60}
                  placeholder="ordonnance-cardiologie-standard"
                  className="rounded-lg font-mono text-sm"
                  disabled={isOfficialLocked}
                />
                <p className="text-xs text-gray-400">
                  Identifiant unique [a-z0-9-], max 60 caractères.
                  {isOfficialLocked && (
                    <span className="ml-1 text-amber-600 font-medium">
                      Slug immuable une fois publié (les clones existants le référencent).
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Template officiel badge — admin mode uniquement */}
            {mode === "admin" && (
              <div className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
                <span className="text-teal-700 text-sm font-medium">
                  Template officiel Doktori
                </span>
                <span className="text-xs text-teal-600 bg-teal-100 rounded-full px-2 py-0.5 ml-auto">
                  Toujours activé
                </span>
              </div>
            )}

            {/* Langue */}
            <div className="space-y-1.5">
              <Label htmlFor="language" className="text-sm font-medium">
                Langue
              </Label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "fr" | "ar")}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            {/* Contenu */}
            <div className="space-y-1.5">
              <Label htmlFor="body" className="text-sm font-medium">
                Contenu <span className="text-red-500">*</span>
              </Label>
              <HighlightedTextarea
                value={body}
                onChange={setBody}
                placeholder={`Contenu en Markdown. Utilisez {{first_name}}, {{doctor_name}}, etc.`}
                dir={language === "ar" ? "rtl" : "ltr"}
                minHeight="400px"
              />
              <p className="text-xs text-gray-400">
                Markdown supporté. Les variables{" "}
                <code className="bg-cyan-50 text-cyan-700 rounded px-0.5 text-[10px]">
                  {"{{variable}}"}
                </code>{" "}
                sont colorées en cyan.
              </p>
            </div>
          </div>
        </div>

        {/* Right col — 1/3 width */}
        <div className="col-span-1 space-y-4">
          <VariableHelperPanel />
          <TemplatePreview body={body} language={language} />
        </div>
      </div>
    </div>
  );
}
