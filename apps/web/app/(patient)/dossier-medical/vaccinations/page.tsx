"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Syringe, Plus, Pencil, Trash2, X, ChevronLeft, ShieldCheck } from "lucide-react";

interface Vaccination {
  id: string;
  vaccineName: string;
  dateReceived: string;
  batchNumber: string | null;
  givenBy: string | null;
  notes: string | null;
  createdAt: string;
}

export default function VaccinationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vaccination | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [vaccineName, setVaccineName] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [givenBy, setGivenBy] = useState("");
  const [notes, setNotes] = useState("");

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
      const res = await fetch("/api/me/vaccinations", { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setItems(data.vaccinations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setVaccineName("");
    setDateReceived("");
    setBatchNumber("");
    setGivenBy("");
    setNotes("");
    setModalOpen(true);
  }

  function openEdit(v: Vaccination) {
    setEditing(v);
    setVaccineName(v.vaccineName);
    setDateReceived(v.dateReceived);
    setBatchNumber(v.batchNumber ?? "");
    setGivenBy(v.givenBy ?? "");
    setNotes(v.notes ?? "");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!vaccineName.trim() || !dateReceived) {
      toast.error("Nom du vaccin et date requis");
      return;
    }
    setSaving(true);
    try {
      const body = {
        vaccineName: vaccineName.trim(),
        dateReceived,
        batchNumber: batchNumber.trim() || null,
        givenBy: givenBy.trim() || null,
        notes: notes.trim() || null,
      };
      const url = editing ? `/api/me/vaccinations/${editing.id}` : "/api/me/vaccinations";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editing ? "Vaccin modifié" : "Vaccin ajouté");
        setModalOpen(false);
        await load(token);
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm("Supprimer ce vaccin ?")) return;
    const res = await fetch(`/api/me/vaccinations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 204) {
      toast.success("Vaccin supprimé");
      await load(token);
    } else {
      toast.error("Erreur lors de la suppression");
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
          <ChevronLeft className="h-3.5 w-3.5" /> Retour au dossier
        </a>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="ds-eyebrow">DOSSIER MÉDICAL</div>
            <h1 className="ds-page-title">Carnet de vaccination</h1>
            <p className="ds-page-sub">
              {items.length} vaccin{items.length !== 1 ? "s" : ""} enregistré
              {items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={openAdd} className="ds-btn ds-btn-primary">
            <Plus className="h-4 w-4" /> Ajouter un vaccin
          </button>
        </div>
      </div>

      <div className="space-y-4">

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-8 text-center">
            <Syringe className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun vaccin enregistré</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" aria-hidden />
            <ul className="space-y-3">
              {items.map((v) => (
                <li key={v.id} className="relative pl-10">
                  <span aria-hidden className="absolute left-2 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary ring-2 ring-white">
                    <ShieldCheck className="h-3 w-3 text-white" />
                  </span>
                  <div className="rounded-2xl border border-border bg-white shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">{v.vaccineName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(v.dateReceived).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                        {v.givenBy && <p className="text-xs text-muted-foreground mt-1">Par : {v.givenBy}</p>}
                        {v.batchNumber && <p className="text-xs text-muted-foreground">Lot : {v.batchNumber}</p>}
                        {v.notes && <p className="text-xs text-foreground/70 mt-2 whitespace-pre-line">{v.notes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(v)}
                          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                <h2 className="font-bold text-lg">{editing ? "Modifier le vaccin" : "Ajouter un vaccin"}</h2>
                <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-name" className="text-sm font-semibold">Nom du vaccin *</Label>
                <Input id="v-name" value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} maxLength={120} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-date" className="text-sm font-semibold">Date *</Label>
                <Input id="v-date" type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-batch" className="text-sm font-semibold">Numéro de lot</Label>
                <Input id="v-batch" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-by" className="text-sm font-semibold">Administré par</Label>
                <ProviderLookup id="v-by" value={givenBy} onChange={setGivenBy} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-notes" className="text-sm font-semibold">Notes</Label>
                <Textarea id="v-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Annuler</Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-primary hover:bg-doktori-teal-dark text-white font-bold">
                  {saving ? "..." : editing ? "Enregistrer" : "Ajouter"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────── Healthcare provider lookup ─────────
   Debounced doctor search via /api/search. Lets the patient pick a registered
   doctor by name, or type any free text (clinic, vaccination center, etc.). */
function ProviderLookup({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<
    Array<{
      name: string;
      specialty?: string | null;
      city?: string | null;
      photoUrl?: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((d) => {
          setResults(Array.isArray(d.hits) ? d.hits.slice(0, 8) : []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [value]);

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // delay so a click on a suggestion can still fire
          setTimeout(() => setOpen(false), 150);
        }}
        maxLength={120}
        placeholder="Dr. ..., centre..."
        autoComplete="off"
      />
      {open && value.trim().length >= 2 && (loading || results.length > 0) && (
        <div
          className="absolute z-30 left-0 right-0 mt-1 rounded-xl overflow-hidden"
          style={{
            background: "#fff",
            border: "1px solid var(--line-cool)",
            boxShadow: "0 8px 24px rgba(15,23,42,0.10)",
          }}
        >
          {loading && results.length === 0 ? (
            <div className="px-3 py-2 text-xs" style={{ color: "var(--ink-500)" }}>
              Recherche…
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((r, i) => {
                const initials = r.name
                  .replace(/^Dr\.?\s*/i, "")
                  .split(/\s+/)
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <li key={`${r.name}-${i}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        // mousedown fires before blur → keeps the click reliable
                        e.preventDefault();
                        onChange(r.name);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--surface-2)] flex items-center gap-3"
                    >
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden shrink-0 grid place-items-center text-[11px] font-extrabold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--primary-400), var(--primary-600))",
                        }}
                      >
                        {r.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.photoUrl}
                            alt={r.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials || "?"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-semibold truncate"
                          style={{ color: "var(--ink-900)" }}
                        >
                          {r.name}
                        </div>
                        {(r.specialty || r.city) && (
                          <div className="text-[11px]" style={{ color: "var(--ink-500)" }}>
                            {[r.specialty, r.city].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
