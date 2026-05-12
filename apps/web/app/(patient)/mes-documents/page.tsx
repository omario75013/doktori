"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Upload,
  Download,
  MessageCircle,
  Filter,
  FileText,
  Pencil,
  Trash2,
  X,
  Share2,
  Check,
} from "lucide-react";

type Filter = "all" | "rx" | "lab" | "xr" | "rep" | "ins";

interface DocItem {
  id: string;
  category: Filter;
  tone: "primary" | "sky" | "rose" | "amber" | "mint";
  tag: string;
  title: string;
  source: string;
  date: string;
  fileUrl?: string;
  // Only present when the doc is a patient-uploaded attachment — used to
  // gate Modify / Delete actions away from doctor-generated documents.
  attachmentId?: string;
  // Set when the doc lives in the patient_documents table and was uploaded
  // by the patient themselves — gates delete via /api/patient-documents/:id.
  sharedDocId?: string;
  // Preview URL (separate from fileUrl which is the PDF download).
  // For prescriptions, points to /ordonnance/[id] (rendered HTML).
  previewUrl?: string;
  // Set when the doc was created by a doctor in fiche patient — shown as
  // a "Créé par Dr X" badge and remains strictly read-only.
  doctorBadge?: string;
  // Current list of doctors the patient has shared this document with
  // (only meaningful when sharedDocId is set).
  sharedWithDoctorIds?: string[];
  // Resolved doctor names from /api/me/doctors, in the same order as
  // sharedWithDoctorIds. Drives the "Partagé avec Dr X, Dr Y" line.
  sharedDoctorNames?: string[];
  // File metadata for the details row.
  filename?: string;
  sizeBytes?: number | null;
  mimeType?: string | null;
  note?: string | null;
}

const UPLOAD_CATEGORIES: { id: Exclude<Filter, "all">; label: string }[] = [
  { id: "rx", label: "Ordonnance" },
  { id: "lab", label: "Analyse biologique" },
  { id: "xr", label: "Radiologie" },
  { id: "rep", label: "Compte-rendu" },
  { id: "ins", label: "Carte assurance" },
];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "rx", label: "Ordonnances" },
  { id: "lab", label: "Analyses" },
  { id: "xr", label: "Radiologie" },
  { id: "rep", label: "Comptes-rendus" },
  { id: "ins", label: "Cartes assurance" },
];

export default function MesDocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCategory, setPendingCategory] = useState<Exclude<Filter, "all">>("rep");
  const [pendingTitle, setPendingTitle] = useState("");
  const [editingDoc, setEditingDoc] = useState<DocItem | null>(null);
  const [editCategory, setEditCategory] = useState<Exclude<Filter, "all">>("rep");
  const [editTitle, setEditTitle] = useState("");
  const [sharingDoc, setSharingDoc] = useState<DocItem | null>(null);
  const [myDoctors, setMyDoctors] = useState<
    Array<{ id: string; name: string; specialty?: string | null; photoUrl?: string | null }>
  >([]);
  const [shareSelected, setShareSelected] = useState<Set<string>>(new Set());
  const [savingShare, setSavingShare] = useState(false);

  async function loadAll() {
    const merged: DocItem[] = [];

    // 0. Doctor name lookup (drives the "Partagé avec Dr X" line on each
    //    patient-owned card). One fetch covers every share recipient since
    //    the picker source is the same connected-doctors list.
    let doctorMap = new Map<string, string>(
      myDoctors.map((d) => [d.id, d.name]),
    );
    if (doctorMap.size === 0) {
      try {
        const r = await fetch("/api/me/doctors", { credentials: "include" });
        if (r.ok) {
          const data = await r.json();
          const items = (data.items ?? []) as Array<{ id: string; name: string; specialty?: string | null; photoUrl?: string | null }>;
          setMyDoctors(items);
          doctorMap = new Map(items.map((d) => [d.id, d.name]));
        }
      } catch {
        /* ignore */
      }
    }
    const resolveNames = (ids: string[] | undefined): string[] =>
      (ids ?? [])
        .map((id) => doctorMap.get(id))
        .filter((n): n is string => !!n);

    // 1. Generated documents (read-only)
    try {
      const docsRes = await fetch("/api/patients/me/documents", { credentials: "include" });
      if (docsRes.ok) {
        const data = await docsRes.json();
        for (const p of data.prescriptions ?? []) {
          merged.push({
            id: `rx-${p.prescriptionId}`,
            category: "rx",
            tone: "primary",
            tag: "Ordonnance",
            title: `Ordonnance — ${p.specialty ?? "Consultation"}`,
            source: p.doctorName ?? "Médecin",
            date: p.createdAt,
            fileUrl: `/api/prescriptions/${p.prescriptionId}/pdf`,
            previewUrl: `/ordonnance/${p.prescriptionId}`,
          });
        }
        for (const c of data.certificates ?? []) {
          merged.push({
            id: `cert-${c.certificateId}`,
            category: "rep",
            tone: "primary",
            tag: "Certificat",
            title: c.title || "Certificat médical",
            source: c.doctorName ?? "Médecin",
            date: c.createdAt,
            previewUrl: `/certificat-medical/${c.certificateId}`,
            fileUrl: `/certificat-medical/${c.certificateId}?print=1`,
          });
        }
        for (const c of data.cnamClaims ?? []) {
          merged.push({
            id: `cnam-${c.id}`,
            category: "ins",
            tone: "amber",
            tag:
              c.status === "approved"
                ? "CNAM approuvé"
                : c.status === "rejected"
                ? "CNAM refusé"
                : "CNAM en cours",
            title: `Remboursement CNAM ${c.cnamNumber ?? ""}`.trim(),
            source: c.doctorName ?? "Médecin",
            date: c.consultationDate,
          });
        }
        for (const n of data.consultationNotes ?? []) {
          merged.push({
            id: `cn-${n.id}`,
            category: "rep",
            tone: "sky",
            tag: "Compte-rendu",
            title: n.assessment?.slice(0, 80) || "Compte-rendu de consultation",
            source: n.doctorName ?? "Médecin",
            date: n.createdAt,
          });
        }
      }
    } catch {}

    // 1b. Patient ↔ doctor shared documents (new patient_documents table)
    // Tracks file URLs we've already surfaced so the legacy /api/me/attachments
    // pass below can skip the duplicate copy minted by share-attachment.
    const seenFileUrls = new Set<string>();
    try {
      const sRes = await fetch("/api/patient-documents", { credentials: "include" });
      if (sRes.ok) {
        const sData = await sRes.json();
        for (const d of sData.items ?? []) {
          // Sharing now lives on patient_attachments — patient-uploaded rows
          // in patient_documents are legacy copies and would create duplicates.
          // Only surface doctor-created entries (ordonnances, free-form docs).
          if (d.uploadedBy !== "doctor") {
            // Track the file URL so the matching attachment doesn't double up.
            if (d.fileUrl) seenFileUrls.add(d.fileUrl);
            continue;
          }
          const cat = (d.category ?? "rep") as Filter;
          const safeCat: Filter = ["rx", "lab", "xr", "rep", "ins"].includes(cat)
            ? cat
            : "rep";
          const byDoctor = d.uploadedBy === "doctor";
          merged.push({
            id: `pd-${d.id}`,
            category: safeCat,
            tone: byDoctor ? "primary" : "mint",
            tag: byDoctor ? "Reçu du médecin" : "Partagé",
            title: d.title || d.fileName,
            source: byDoctor ? (d.doctorName ?? "Médecin") : d.fileName,
            date: d.createdAt,
            fileUrl: d.fileUrl,
            sharedDocId: byDoctor ? undefined : d.id,
            doctorBadge: byDoctor ? (d.doctorName ?? "Médecin") : undefined,
            sharedWithDoctorIds: byDoctor ? undefined : (d.sharedWithDoctorIds ?? []),
            sharedDoctorNames: byDoctor ? undefined : resolveNames(d.sharedWithDoctorIds),
            filename: d.fileName,
            sizeBytes: d.sizeBytes,
            mimeType: d.mimeType,
            note: d.note,
          });
          if (d.fileUrl) seenFileUrls.add(d.fileUrl);
        }
      }
    } catch {}

    // 2. Patient-uploaded attachments
    try {
      const aRes = await fetch("/api/me/attachments", { credentials: "include" });
      if (aRes.ok) {
        const aData = await aRes.json();
        for (const a of aData.items ?? []) {
          // Skip rows that were duplicated by the old share flow before we
          // moved sharing onto the attachment itself.
          if (a.fileUrl && seenFileUrls.has(a.fileUrl)) continue;
          const cat = (a.category ?? "autre") as Filter | "autre";
          const safeCat: Filter = ["rx", "lab", "xr", "rep", "ins"].includes(cat)
            ? (cat as Filter)
            : "all";
          const sharedIds: string[] = Array.isArray(a.sharedWithDoctorIds)
            ? a.sharedWithDoctorIds
            : [];
          merged.push({
            id: `att-${a.id}`,
            category: safeCat === "all" ? "rep" : safeCat,
            tone: "mint",
            tag: sharedIds.length > 0 ? "Partagé" : "Téléversé",
            title: a.title ?? a.filename,
            source: a.filename,
            date: a.uploadedAt,
            fileUrl: a.fileUrl,
            attachmentId: a.id,
            sharedWithDoctorIds: sharedIds,
            sharedDoctorNames: resolveNames(sharedIds),
            filename: a.filename,
            sizeBytes: a.sizeBytes,
            mimeType: a.mimeType,
            note: a.description,
          });
        }
      }
    } catch {}

    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDocuments(merged);
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    if (pendingFile.size > 15 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (15 Mo max)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", pendingFile);
      fd.append("category", pendingCategory);
      fd.append("title", pendingTitle.trim() || pendingFile.name);
      const res = await fetch("/api/me/attachments", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Document téléversé");
        setPendingFile(null);
        setPendingTitle("");
        await loadAll();
      } else {
        toast.error(data.error || "Erreur d'upload");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveEdit() {
    if (!editingDoc?.attachmentId) return;
    const res = await fetch(`/api/me/attachments/${editingDoc.attachmentId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: editCategory, title: editTitle.trim() || editingDoc.title }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Document mis à jour");
      setEditingDoc(null);
      await loadAll();
    } else {
      toast.error(data.error || "Erreur");
    }
  }

  async function openShare(doc: DocItem) {
    setSharingDoc(doc);
    setShareSelected(new Set(doc.sharedWithDoctorIds ?? []));
    // Lazy-load the doctor list the first time the modal opens.
    if (myDoctors.length === 0) {
      try {
        const res = await fetch("/api/me/doctors", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMyDoctors(data.items ?? []);
        }
      } catch {
        /* ignore */
      }
    }
  }

  async function saveShare() {
    if (!sharingDoc) return;
    setSavingShare(true);
    try {
      const doctorIds = Array.from(shareSelected);
      let res: Response;
      if (sharingDoc.sharedDocId) {
        // Already a patient_documents row — just update the sharing list.
        res = await fetch(`/api/patient-documents/${sharingDoc.sharedDocId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorIds }),
        });
      } else if (sharingDoc.attachmentId) {
        // Legacy attachment — mint a new patient_documents row pointing at
        // the same file URL. Subsequent edits will use the PATCH branch.
        res = await fetch(`/api/patient-documents/share-attachment`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attachmentId: sharingDoc.attachmentId, doctorIds }),
        });
      } else {
        return;
      }
      if (res.ok) {
        toast.success(
          doctorIds.length === 0
            ? "Partage retiré"
            : `Partagé avec ${doctorIds.length} médecin${doctorIds.length > 1 ? "s" : ""}`,
        );
        setSharingDoc(null);
        await loadAll();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Échec du partage");
      }
    } finally {
      setSavingShare(false);
    }
  }

  async function deleteDoc(doc: DocItem) {
    if (!doc.attachmentId && !doc.sharedDocId) return;
    if (!confirm("Supprimer définitivement ce document ?")) return;
    const url = doc.sharedDocId
      ? `/api/patient-documents/${doc.sharedDocId}`
      : `/api/me/attachments/${doc.attachmentId}`;
    const res = await fetch(url, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast.success("Document supprimé");
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } else {
      toast.error("Erreur");
    }
  }

  useEffect(() => {
    let legacy: string | null = null;
    try { legacy = localStorage.getItem("doktori_patient_token"); } catch {}
    (async () => {
      let r = await fetch("/api/patients/me", { credentials: "include" });
      if (!r.ok && legacy) {
        r = await fetch("/api/patients/me", {
          credentials: "include",
          headers: { Authorization: `Bearer ${legacy}` },
        });
      }
      if (!r.ok) {
        router.replace("/connexion-patient");
        return;
      }
      try { sessionStorage.setItem("doktori_patient_session", "1"); } catch {}

      await loadAll();
      setLoading(false);
    })().catch(() => setLoading(false));
    // loadAll is stable enough — re-running on filter change is not desired
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const visible = filter === "all" ? documents : documents.filter((d) => d.category === filter);
  const counts: Record<Filter, number> = { all: 0, rx: 0, lab: 0, xr: 0, rep: 0, ins: 0 };
  for (const d of documents) {
    counts.all++;
    counts[d.category]++;
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="ds-eyebrow">Stockage chiffré</div>
          <h1 className="ds-page-title">Mes documents</h1>
          <p className="ds-page-sub">Ordonnances, analyses, radios — tout au même endroit.</p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="ds-btn ds-btn-primary"
        >
          <Upload className="w-4 h-4" /> {uploading ? "Envoi…" : "Téléverser"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setPendingFile(f);
            setPendingCategory(filter === "all" ? "rep" : (filter as Exclude<Filter, "all">));
            setPendingTitle(f.name.replace(/\.[^.]+$/, ""));
          }
        }}
      />

      {/* Upload zone (drag-and-drop) */}
      <div
        className="rounded-2xl mb-5 flex gap-4 items-center cursor-pointer"
        style={{
          padding: "20px 24px",
          border: "2px dashed var(--primary-200)",
          background: "var(--primary-50)",
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) {
            setPendingFile(f);
            setPendingCategory(filter === "all" ? "rep" : (filter as Exclude<Filter, "all">));
            setPendingTitle(f.name.replace(/\.[^.]+$/, ""));
          }
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl bg-white grid place-items-center shrink-0"
          style={{ color: "var(--primary-600)" }}
        >
          <Upload className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-[16px] mb-0.5"
            style={{ color: "var(--ink-900)", fontFamily: "Manrope, sans-serif" }}
          >
            Glissez-déposez vos documents
          </div>
          <div className="text-[13px]" style={{ color: "var(--ink-500)" }}>
            PDF, JPG, PNG · 10 Mo max · Chiffrement de bout en bout
          </div>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="ds-btn ds-btn-soft ds-btn-sm shrink-0"
        >
          {uploading ? "Envoi…" : "Parcourir"}
        </button>
      </div>

      {/* Filter chips + sort */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {FILTERS.map((c) => {
          const on = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition"
              style={{
                borderColor: "var(--line-cool)",
                background: on ? "var(--ink-900)" : "#FFFFFF",
                color: on ? "#FFFFFF" : "var(--ink-700)",
              }}
            >
              {c.label}
              <span
                className="px-2 rounded-full text-[11px]"
                style={{
                  background: on ? "rgba(255,255,255,.2)" : "var(--bg-cool-soft)",
                  color: on ? "#FFFFFF" : "var(--ink-500)",
                }}
              >
                {counts[c.id]}
              </span>
            </button>
          );
        })}
        <div className="flex-1" />
        <button type="button" className="ds-btn ds-btn-ghost ds-btn-sm">
          <Filter className="w-3.5 h-3.5" /> Trier
        </button>
      </div>

      {/* Documents grid */}
      {visible.length === 0 ? (
        <div className="ds-card-patient ds-card-pad-lg text-center py-12">
          <div
            className="w-16 h-16 mx-auto rounded-full grid place-items-center mb-4"
            style={{ background: "var(--primary-50)" }}
          >
            <FileText className="w-7 h-7" style={{ color: "var(--primary-500)" }} />
          </div>
          <p
            className="font-bold text-[15px] mb-1"
            style={{ color: "var(--ink-900)" }}
          >
            Aucun document pour l&apos;instant
          </p>
          <p className="text-[13.5px]" style={{ color: "var(--ink-500)" }}>
            Vos ordonnances, analyses et radios apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((d) => (
            <DocCard
              key={d.id}
              doc={d}
              onEdit={
                d.attachmentId
                  ? () => {
                      setEditingDoc(d);
                      setEditCategory((d.category === "all" ? "rep" : d.category) as Exclude<Filter, "all">);
                      setEditTitle(d.title);
                    }
                  : undefined
              }
              onDelete={d.attachmentId || d.sharedDocId ? () => deleteDoc(d) : undefined}
              onShare={
                d.attachmentId || d.sharedDocId ? () => openShare(d) : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Upload — category picker modal */}
      {pendingFile && (
        <Modal
          title="Téléverser un document"
          onClose={() => {
            setPendingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        >
          <p
            className="text-[12.5px] mb-3 px-2.5 py-2 rounded-lg"
            style={{ background: "var(--surface-2)", color: "var(--ink-700)" }}
          >
            <FileText className="inline w-3.5 h-3.5 mr-1" />
            {pendingFile.name} · {(pendingFile.size / 1024).toFixed(0)} Ko
          </p>

          <FormLabel>Type de document</FormLabel>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {UPLOAD_CATEGORIES.map((c) => {
              const on = pendingCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPendingCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition ${
                    on
                      ? "bg-[color:var(--primary-600)] text-white"
                      : "border border-[color:var(--line-cool)] bg-white text-[color:var(--ink-700)] hover:border-[color:var(--primary-300)]"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <FormLabel>Titre (optionnel)</FormLabel>
          <input
            type="text"
            value={pendingTitle}
            onChange={(e) => setPendingTitle(e.target.value)}
            placeholder="Ex. Prise de sang du 12 mai"
            maxLength={200}
            className="w-full rounded-xl px-3 py-2.5 text-[13.5px] font-semibold outline-none mb-4"
            style={{
              background: "#fff",
              border: "1px solid var(--line-cool)",
              color: "var(--ink-900)",
            }}
          />

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setPendingFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="ds-btn ds-btn-ghost"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmUpload}
              disabled={uploading}
              className="ds-btn ds-btn-primary"
            >
              <Upload className="w-4 h-4" /> {uploading ? "Envoi…" : "Téléverser"}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit modal — modify category / title of an uploaded doc */}
      {editingDoc && (
        <Modal title="Modifier le document" onClose={() => setEditingDoc(null)}>
          <FormLabel>Type de document</FormLabel>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {UPLOAD_CATEGORIES.map((c) => {
              const on = editCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setEditCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition ${
                    on
                      ? "bg-[color:var(--primary-600)] text-white"
                      : "border border-[color:var(--line-cool)] bg-white text-[color:var(--ink-700)] hover:border-[color:var(--primary-300)]"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <FormLabel>Titre</FormLabel>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl px-3 py-2.5 text-[13.5px] font-semibold outline-none mb-4"
            style={{
              background: "#fff",
              border: "1px solid var(--line-cool)",
              color: "var(--ink-900)",
            }}
          />

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditingDoc(null)}
              className="ds-btn ds-btn-ghost"
            >
              Annuler
            </button>
            <button type="button" onClick={saveEdit} className="ds-btn ds-btn-primary">
              <Pencil className="w-4 h-4" /> Enregistrer
            </button>
          </div>
        </Modal>
      )}

      {sharingDoc && (
        <Modal title="Partager avec un médecin" onClose={() => setSharingDoc(null)}>
          <div className="mb-3 text-[13px]" style={{ color: "var(--ink-500)" }}>
            Sélectionnez les médecins qui pourront voir ce document dans votre
            fiche patient.
          </div>
          {myDoctors.length === 0 ? (
            <div
              className="rounded-lg p-3 text-[13px] text-center"
              style={{
                background: "var(--surface-2)",
                color: "var(--ink-500)",
              }}
            >
              Aucun médecin trouvé. Prenez d&apos;abord un rendez-vous pour
              pouvoir partager des documents.
            </div>
          ) : (
            <ul className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {myDoctors.map((d) => {
                const checked = shareSelected.has(d.id);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setShareSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(d.id)) next.delete(d.id);
                          else next.add(d.id);
                          return next;
                        });
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-start"
                      style={{
                        border: "1px solid var(--line-cool)",
                        background: checked
                          ? "var(--primary-50, #ECFEFF)"
                          : "transparent",
                      }}
                    >
                      {d.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.photoUrl}
                          alt={d.name}
                          width={32}
                          height={32}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold"
                          style={{
                            background: "var(--surface-2)",
                            color: "var(--ink-500)",
                          }}
                        >
                          {d.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}
                        </span>
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-[13.5px] truncate" style={{ color: "var(--ink-900)" }}>
                          Dr {d.name.replace(/^Dr\.?\s*/i, "")}
                        </span>
                        {d.specialty && (
                          <span className="block text-[12px] truncate" style={{ color: "var(--ink-500)" }}>
                            {d.specialty}
                          </span>
                        )}
                      </span>
                      <span
                        className="w-5 h-5 rounded-md inline-flex items-center justify-center"
                        style={{
                          border: "1.5px solid var(--line-cool)",
                          background: checked ? "var(--primary-600)" : "transparent",
                          borderColor: checked ? "var(--primary-600)" : "var(--line-cool)",
                        }}
                      >
                        {checked && <Check className="w-3 h-3" style={{ color: "#fff" }} strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setSharingDoc(null)}
              className="ds-btn ds-btn-ghost flex-1"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={saveShare}
              disabled={savingShare || myDoctors.length === 0}
              className="ds-btn ds-btn-primary flex-1"
            >
              <Share2 className="w-4 h-4" />
              {savingShare ? "…" : "Partager"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md ds-card-patient max-h-[90vh] overflow-y-auto"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--line-cool)]">
          <h2 className="font-bold text-[16px]" style={{ color: "var(--ink-900)" }}>
            {title}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[color:var(--surface-2)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-bold uppercase tracking-wider mb-1"
      style={{ color: "var(--ink-400)" }}
    >
      {children}
    </div>
  );
}

function DocCard({
  doc,
  onEdit,
  onDelete,
  onShare,
}: {
  doc: DocItem;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}) {
  const isMine = !!doc.attachmentId;
  return (
    <div className="ds-card-patient overflow-hidden" style={{ padding: 0 }}>
      <div
        className="h-36 grid place-items-center relative"
        style={{
          background: "var(--surface-2)",
          borderBottom: "1px solid var(--line-cool)",
        }}
      >
        <Preview kind={doc.category} />
        <span
          className={`ds-chip ds-chip-${doc.tone}`}
          style={{ position: "absolute", top: 10, left: 10 }}
        >
          {doc.tag}
        </span>
        {doc.doctorBadge ? (
          <span
            className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider max-w-[60%] truncate"
            style={{
              background: "var(--primary-500, #0ea5a4)",
              color: "#fff",
            }}
            title={`Créé par ${doc.doctorBadge}`}
          >
            {doc.doctorBadge}
          </span>
        ) : !isMine && (
          <span
            className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: "rgba(255,255,255,.9)",
              color: "var(--ink-500)",
            }}
          >
            Médecin
          </span>
        )}
      </div>
      <div className="p-3.5">
        <div
          className="font-bold text-[14px] mb-1 truncate"
          style={{ color: "var(--ink-900)" }}
        >
          {doc.title}
        </div>
        <div className="text-[12.5px]" style={{ color: "var(--ink-500)" }}>
          {doc.source} · {format(new Date(doc.date), "d MMM yyyy", { locale: fr })}
          {typeof doc.sizeBytes === "number" && doc.sizeBytes > 0 && (
            <> · {(doc.sizeBytes / 1024).toFixed(0)} Ko</>
          )}
        </div>
        {/* Sharing line — only on patient-owned items (attachment or
            patient_documents). Doctor-created docs already carry the
            "Dr X" badge in the image header. */}
        {(doc.attachmentId || doc.sharedDocId) && (
          <div className="text-[12px] mb-3 mt-1 flex items-start gap-1 flex-wrap" style={{ color: "var(--ink-500)" }}>
            {(doc.sharedDoctorNames?.length ?? 0) > 0 ? (
              <>
                <span style={{ color: "var(--primary-600)", fontWeight: 600 }}>
                  Partagé avec :
                </span>
                {doc.sharedDoctorNames!.map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: "var(--primary-50, #ECFEFF)", color: "var(--primary-700, #0e7490)" }}
                  >
                    Dr {name.replace(/^Dr\.?\s*/i, "")}
                  </span>
                ))}
              </>
            ) : (
              <span style={{ color: "var(--ink-400)", fontStyle: "italic" }}>
                Privé — non partagé
              </span>
            )}
          </div>
        )}
        {!doc.attachmentId && !doc.sharedDocId && <div className="mb-3" />}
        <div className="flex gap-1.5">
          {doc.previewUrl && (
            <a
              href={doc.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="ds-btn ds-btn-soft ds-btn-sm flex-1"
              aria-label="Aperçu"
              title="Aperçu"
            >
              <FileText className="w-3.5 h-3.5" />
            </a>
          )}
          <a
            href={doc.fileUrl ?? "#"}
            target={doc.fileUrl ? "_blank" : undefined}
            rel="noreferrer"
            className="ds-btn ds-btn-soft ds-btn-sm flex-1"
            aria-label="Télécharger en PDF"
            title="Télécharger en PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          {isMine ? (
            <>
              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className="ds-btn ds-btn-ghost ds-btn-sm"
                  aria-label="Partager avec un médecin"
                  title="Partager avec un médecin"
                  style={
                    (doc.sharedWithDoctorIds?.length ?? 0) > 0
                      ? { color: "var(--primary-600)" }
                      : undefined
                  }
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onEdit}
                className="ds-btn ds-btn-ghost ds-btn-sm"
                aria-label="Modifier"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="ds-btn ds-btn-ghost ds-btn-sm"
                aria-label="Supprimer"
                style={{ color: "#E11D48" }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <a
              href="/coach-ia"
              className="ds-btn ds-btn-ghost ds-btn-sm flex-1"
              aria-label="Demander à l'IA"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Preview({ kind }: { kind: Filter }) {
  if (kind === "xr") {
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
        <rect x="0" y="0" width="120" height="120" fill="#1A2A2E" />
        <ellipse cx="60" cy="56" rx="22" ry="30" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" />
        {[44, 52, 60, 68].map((y, i) => (
          <path key={i} d={`M30 ${y} Q60 ${y - 3} 90 ${y}`} stroke="rgba(255,255,255,.3)" fill="none" />
        ))}
      </svg>
    );
  }
  if (kind === "ins") {
    return (
      <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden>
        <rect x="6" y="6" width="108" height="68" rx="8" fill="var(--primary-500)" />
        <rect x="14" y="14" width="40" height="4" rx="2" fill="rgba(255,255,255,.6)" />
        <rect x="14" y="50" width="60" height="3" rx="1.5" fill="rgba(255,255,255,.5)" />
        <circle cx="98" cy="22" r="6" fill="rgba(255,255,255,.3)" />
      </svg>
    );
  }
  // Generic page-like preview
  return (
    <svg width="100" height="120" viewBox="0 0 100 120" aria-hidden>
      <rect x="6" y="6" width="88" height="108" rx="6" fill="#fff" stroke="var(--line-cool)" />
      {[18, 28, 38, 48, 58, 68, 78, 88, 98].map((y, i) => (
        <rect
          key={i}
          x="14"
          y={y}
          width={i % 3 === 0 ? 72 : 56}
          height="3"
          rx="1.5"
          fill="var(--line-strong)"
        />
      ))}
    </svg>
  );
}
