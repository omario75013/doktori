"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ar, fr } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Plus, Pencil, Trash2, X, ChevronLeft } from "lucide-react";

interface Allergy {
  id: string;
  allergen: string;
  severity: "mild" | "moderate" | "severe" | null;
  reaction: string | null;
  diagnosedAt: string | null;
  createdAt: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  mild: "bg-green-50 border-green-200",
  moderate: "bg-amber-50 border-amber-200",
  severe: "bg-red-50 border-red-200",
};

const SEVERITY_BADGES: Record<string, string> = {
  mild: "bg-green-100 text-green-800",
  moderate: "bg-amber-100 text-amber-800",
  severe: "bg-red-100 text-red-800",
};

export default function AllergiesPage() {
  const router = useRouter();
  const t = useTranslations("patient.dossier.allergies");
  const tc = useTranslations("patient.dossier.common");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : fr;
  void dateLocale;
  const dateFnsLocaleTag = locale === "ar" ? "ar-TN" : "fr-FR";
  const SEVERITY_LABELS: Record<string, string> = {
    mild: t("severity.mild"),
    moderate: t("severity.moderate"),
    severe: t("severity.severe"),
  };
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Allergy | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [allergen, setAllergen] = useState("");
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [reaction, setReaction] = useState("");
  const [diagnosedAt, setDiagnosedAt] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("doktori_patient_session");
    if (!stored) {
      router.push("/connexion-patient");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    void load(token);
  }, [token]);

  async function load(t: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/me/allergies", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setItems(data.allergies ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setAllergen("");
    setSeverity("mild");
    setReaction("");
    setDiagnosedAt("");
    setModalOpen(true);
  }

  function openEdit(a: Allergy) {
    setEditing(a);
    setAllergen(a.allergen);
    setSeverity((a.severity as "mild" | "moderate" | "severe") ?? "mild");
    setReaction(a.reaction ?? "");
    setDiagnosedAt(a.diagnosedAt ?? "");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!allergen.trim()) {
      toast.error(t("toast.allergenRequired"));
      return;
    }
    setSaving(true);
    try {
      const body = {
        allergen: allergen.trim(),
        severity,
        reaction: reaction.trim() || null,
        diagnosedAt: diagnosedAt || null,
      };
      const url = editing ? `/api/me/allergies/${editing.id}` : "/api/me/allergies";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editing ? t("toast.updated") : t("toast.added"));
        setModalOpen(false);
        await load(token);
      } else {
        toast.error(t("toast.saveError"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm(t("confirm.delete"))) return;
    const res = await fetch(`/api/me/allergies/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 204) {
      toast.success(t("toast.deleted"));
      await load(token);
    } else {
      toast.error(t("toast.deleteError"));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <a
          href="/dossier-medical"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--ink-500)] hover:text-[color:var(--primary-600)] mb-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> {tc("backToDossier")}
        </a>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="ds-eyebrow">{tc("eyebrow")}</div>
            <h1 className="ds-page-title">{t("title")}</h1>
            <p className="ds-page-sub">{t("countLabel", { count: items.length })}</p>
          </div>
          <button onClick={openAdd} className="ds-btn ds-btn-primary">
            <Plus className="h-4 w-4" /> {t("addBtn")}
          </button>
        </div>
      </div>

      <div className="space-y-4">

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((a) => {
              const sev = a.severity ?? "mild";
              return (
                <li key={a.id} className={`rounded-2xl border-2 p-4 ${SEVERITY_STYLES[sev]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground">{a.allergen}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${SEVERITY_BADGES[sev]}`}>
                          {SEVERITY_LABELS[sev]}
                        </span>
                      </div>
                      {a.reaction && <p className="text-xs text-foreground/70 mt-2 whitespace-pre-line">{a.reaction}</p>}
                      {a.diagnosedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("diagnosedOn")} : {new Date(a.diagnosedAt).toLocaleDateString(dateFnsLocaleTag)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-white/60 text-foreground/70" aria-label={tc("edit")}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-white/60 text-foreground/70 hover:text-red-600" aria-label={tc("delete")}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">{editing ? t("modal.editTitle") : t("modal.addTitle")}</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-allergen" className="text-sm font-semibold">{t("form.allergen")} *</Label>
                <Input id="a-allergen" value={allergen} onChange={(e) => setAllergen(e.target.value)} maxLength={160} required placeholder={t("form.allergenPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-severity" className="text-sm font-semibold">{t("form.severity")} *</Label>
                <select
                  id="a-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as "mild" | "moderate" | "severe")}
                  className="w-full h-12 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="mild">{t("severity.mild")}</option>
                  <option value="moderate">{t("severity.moderate")}</option>
                  <option value="severe">{t("severity.severe")}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-reaction" className="text-sm font-semibold">{t("form.reaction")}</Label>
                <Textarea id="a-reaction" value={reaction} onChange={(e) => setReaction(e.target.value)} maxLength={2000} rows={2} placeholder={t("form.reactionPlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-diag" className="text-sm font-semibold">{t("form.diagnosedOn")}</Label>
                <Input id="a-diag" type="date" value={diagnosedAt} onChange={(e) => setDiagnosedAt(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">{tc("cancel")}</Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-doktori-teal-dark text-white font-bold">
                  {saving ? "..." : editing ? tc("save") : tc("add")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
