"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
}

export default function AnalysesPage() {
  const router = useRouter();
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
    const stored = localStorage.getItem("doktori_patient_token");
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
      toast.error("Titre requis");
      return;
    }
    if (!file) {
      toast.error("Fichier requis");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10 Mo)");
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
        toast.success("Analyse ajoutée");
        setModalOpen(false);
        await load(token);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(typeof data.error === "string" ? data.error : "Erreur lors de l'envoi");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Supprimer cette analyse ?")) return;
    const res = await fetch(`/api/me/analyses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 204) {
      toast.success("Analyse supprimée");
      await load(token);
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="bg-gradient-to-br from-primary to-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <a href="/dossier-medical" className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3">
            <ChevronLeft className="h-4 w-4" /> Retour au dossier
          </a>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
              <FlaskConical className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Analyses biologiques</h1>
              <p className="text-white/70 text-xs mt-0.5">{items.length} analyse{items.length !== 1 ? "s" : ""} enregistrée{items.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Button onClick={openAdd} className="w-full h-12 rounded-xl bg-primary hover:bg-doktori-teal-dark text-white font-bold">
          <Plus className="h-4 w-4 mr-2" /> Ajouter une analyse
        </Button>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-8 text-center">
            <FlaskConical className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune analyse enregistrée</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" aria-hidden />
            <ul className="space-y-3">
              {items.map((a) => (
                <li key={a.id} className="relative pl-10">
                  <span aria-hidden className="absolute left-2 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary ring-2 ring-white">
                    <FileText className="h-3 w-3 text-white" />
                  </span>
                  <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">{a.title}</p>
                        {a.labName && <p className="text-xs text-primary font-semibold mt-0.5">{a.labName}</p>}
                        {a.testDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(a.testDate).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        )}
                        {a.fileUrl && (
                          <a
                            href={a.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mt-2"
                          >
                            <ExternalLink className="h-3 w-3" /> Voir le PDF
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 shrink-0"
                        aria-label="Supprimer"
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
                <h2 className="font-bold text-lg">Ajouter une analyse</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ana-title" className="text-sm font-semibold">Titre *</Label>
                <Input id="ana-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder="NFS, glycémie..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ana-lab" className="text-sm font-semibold">Laboratoire</Label>
                <Input id="ana-lab" value={labName} onChange={(e) => setLabName(e.target.value)} maxLength={160} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ana-date" className="text-sm font-semibold">Date du test</Label>
                <Input id="ana-date" type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ana-file" className="text-sm font-semibold">Fichier (PDF, JPEG, PNG · max 10 Mo) *</Label>
                <Input
                  id="ana-file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Annuler</Button>
                <Button type="submit" disabled={uploading} className="flex-1 bg-primary hover:bg-doktori-teal-dark text-white font-bold">
                  {uploading ? "Envoi..." : "Ajouter"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
