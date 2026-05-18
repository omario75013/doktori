"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ar, fr } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical, Plus, Trash2, X, ChevronLeft, FileText, ExternalLink } from "lucide-react";

interface Analysis {
  id: string;
  title: string;
  labName: string | null;
  testDate: string | null;
  fileUrl: string | null;
  notes: string | null;
  createdAt: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
}

export default function AnalysesPage() {
  const router = useRouter();
  const t = useTranslations("patient.dossier.analyses");
  const tc = useTranslations("patient.dossier.common");
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : fr;
  void dateLocale;
  const dateFnsLocaleTag = locale === "ar" ? "ar-TN" : "fr-FR";
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [labName, setLabName] = useState("");
  const [testDate, setTestDate] = useState("");
  const [file, setFile] = useState<File | null>(null);

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
      const res = await fetch("/api/me/analyses", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setItems(data.analyses ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setTitle("");
    setLabName("");
    setTestDate("");
    setFile(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!title.trim()) {
      toast.error(t("toast.titleRequired"));
      return;
    }
    if (!file) {
      toast.error(t("toast.fileRequired"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("toast.fileTooBig"));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("title", title.trim());
      if (labName.trim()) fd.set("lab_name", labName.trim());
      if (testDate) fd.set("test_date", testDate);
      fd.set("file", file);

      const res = await fetch("/api/me/analyses", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        toast.success(t("toast.added"));
        setModalOpen(false);
        await load(token);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === "string" ? data.error : t("toast.sendError"));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm(t("confirm.delete"))) return;
    const res = await fetch(`/api/me/analyses/${id}`, {
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
            <FlaskConical className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute start-4 top-2 bottom-2 w-px bg-border" aria-hidden />
            <ul className="space-y-3">
              {items.map((a) => (
                <li key={a.id} className="relative ps-10">
                  <span aria-hidden className="absolute start-2 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary ring-2 ring-white">
                    <FileText className="h-3 w-3 text-white" />
                  </span>
                  <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground">{a.title}</p>
                          {a.approvalStatus === "pending" && (
                            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">
                              En attente de validation
                            </span>
                          )}
                          {a.approvalStatus === "rejected" && (
                            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-red-100 text-red-800">
                              Rejeté
                            </span>
                          )}
                        </div>
                        {a.approvalStatus === "rejected" && a.rejectionReason && (
                          <p className="text-xs text-red-700 mt-0.5 italic">Motif : {a.rejectionReason}</p>
                        )}
                        {a.labName && <p className="text-xs text-primary font-semibold mt-0.5">{a.labName}</p>}
                        {a.testDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(a.testDate).toLocaleDateString(dateFnsLocaleTag, { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        )}
                        {a.fileUrl && (
                          <a
                            href={a.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mt-2"
                          >
                            <ExternalLink className="h-3 w-3" /> {t("viewPdf")}
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 shrink-0"
                        aria-label={tc("delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">{t("modal.title")}</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ana-title" className="text-sm font-semibold">{t("form.title")} *</Label>
                <Input id="ana-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder={t("form.titlePlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ana-lab" className="text-sm font-semibold">{t("form.lab")}</Label>
                <Input id="ana-lab" value={labName} onChange={(e) => setLabName(e.target.value)} maxLength={160} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ana-date" className="text-sm font-semibold">{t("form.testDate")}</Label>
                <Input id="ana-date" type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ana-file" className="text-sm font-semibold">{t("form.file")} *</Label>
                <Input
                  id="ana-file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">{tc("cancel")}</Button>
                <Button type="submit" disabled={uploading} className="flex-1 bg-primary hover:bg-doktori-teal-dark text-white font-bold">
                  {uploading ? t("sending") : tc("add")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
