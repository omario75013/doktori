"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Plus,
  ExternalLink,
  ClipboardList,
  FolderOpen,
  StickyNote,
  LayoutDashboard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

type OrderRow = {
  id: string;
  status: string;
  createdAt: string | null;
  internalRef: string | null;
  tests: Array<{ code?: string; label?: string }>;
  urgency: string;
  resultUploadedAt: string | null;
  doctorName: string | null;
};

type DocRow = {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  title: string | null;
  category: string | null;
  labOrderId?: string | null;
  sharedWithDoctorIds?: string[];
  uploadedByLabId?: string | null;
  createdAt: string | null;
};

type NoteRow = {
  id: string;
  body: string;
  pinned: boolean;
  author: string | null;
  authorLabUserId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type PendingOrder = {
  id: string;
  internalRef: string | null;
  tests: Array<{ code?: string; label?: string }>;
  status: string;
};

type Props = {
  patientId: string;
  patient: {
    id: string;
    name: string;
    ageYears: number | null;
    gender: string | null;
    bloodType: string | null;
    cin: string | null;
    phone: string | null;
    email: string | null;
  };
  stats: { totalOrders: number; byStatus: Record<string, number>; lastVisitAt: string | null };
  orders: OrderRow[];
  results: DocRow[];
  received: DocRow[];
  notes: NoteRow[];
  pendingOrders: PendingOrder[];
  labUserId: string | null;
  labUserRole: string;
};

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  collected: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  result_ready: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-700",
};

function FileIcon({ mime }: { mime: string | null }) {
  if (!mime) return <FileText className="h-8 w-8 text-gray-400" />;
  if (mime === "application/pdf")
    return <FileText className="h-8 w-8 text-red-500" />;
  if (mime.startsWith("image/"))
    return <FileText className="h-8 w-8 text-blue-500" />;
  return <FileText className="h-8 w-8 text-gray-400" />;
}

function testLabel(tests: Array<{ code?: string; label?: string }>) {
  if (!tests.length) return "—";
  return tests
    .map((t) => t.label ?? t.code ?? "")
    .filter(Boolean)
    .join(", ");
}

export function PatientDetailTabs({
  patientId,
  patient,
  stats,
  orders,
  results,
  received,
  notes: initialNotes,
  pendingOrders,
  labUserId,
  labUserRole,
}: Props) {
  const [tab, setTab] = useState<"apercu" | "commandes" | "resultats" | "documents" | "notes">(
    "apercu"
  );
  const [docSubTab, setDocSubTab] = useState<"uploaded" | "received">("uploaded");

  // Notes state
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes);
  const [noteBody, setNoteBody] = useState("");
  const [notePinned, setNotePinned] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteBody, setEditNoteBody] = useState("");

  // Ad-hoc result modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultTitle, setResultTitle] = useState("");
  const [resultSummary, setResultSummary] = useState("");
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [resultLinkedOrder, setResultLinkedOrder] = useState("");
  const [resultSharing, setResultSharing] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);
  const [resultError, setResultError] = useState("");
  const [localResults, setLocalResults] = useState<DocRow[]>(results);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = labUserRole === "admin";

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setNoteSaving(true);
    const res = await fetch(`/api/laboratoire/patients/${patientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody, pinned: notePinned }),
    });
    if (res.ok) {
      const data = await res.json();
      const newNote = data.note as NoteRow & {
        createdAt: string;
        updatedAt: string;
        authorLabUserId: string | null;
      };
      setNotes((prev) => {
        const updated = [
          {
            ...newNote,
            author: null,
            createdAt: newNote.createdAt ?? null,
            updatedAt: newNote.updatedAt ?? null,
          },
          ...prev,
        ];
        return updated.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      });
      setNoteBody("");
      setNotePinned(false);
    }
    setNoteSaving(false);
  }

  async function togglePin(note: NoteRow) {
    const res = await fetch(
      `/api/laboratoire/patients/${patientId}/notes/${note.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      }
    );
    if (res.ok) {
      setNotes((prev) =>
        prev
          .map((n) => (n.id === note.id ? { ...n, pinned: !note.pinned } : n))
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      );
    }
  }

  async function saveEditNote(noteId: string) {
    const res = await fetch(
      `/api/laboratoire/patients/${patientId}/notes/${noteId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editNoteBody }),
      }
    );
    if (res.ok) {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, body: editNoteBody } : n))
      );
      setEditNoteId(null);
    }
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(
      `/api/laboratoire/patients/${patientId}/notes/${noteId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  }

  async function submitResult(e: React.FormEvent) {
    e.preventDefault();
    if (!resultTitle.trim() || !resultFile) return;
    setResultSaving(true);
    setResultError("");

    const form = new FormData();
    form.append("file", resultFile);
    form.append("title", resultTitle);
    if (resultSummary) form.append("note", resultSummary);
    if (resultLinkedOrder) form.append("labOrderId", resultLinkedOrder);
    if (resultSharing) {
      // Auto-share with doctor if order has doctorId
      const order = pendingOrders.find((o) => o.id === resultLinkedOrder);
      if (order) {
        // We'll share with doctor via the API; leave shareWithDoctorIds for now
      }
    }

    const res = await fetch(
      `/api/laboratoire/patients/${patientId}/documents`,
      { method: "POST", body: form }
    );

    if (res.ok) {
      const data = await res.json();
      setLocalResults((prev) => [
        {
          id: data.document.id,
          fileUrl: data.document.fileUrl,
          fileName: data.document.fileName,
          mimeType: data.document.mimeType ?? null,
          title: data.document.title ?? null,
          category: data.document.category ?? null,
          labOrderId: data.document.labOrderId ?? null,
          sharedWithDoctorIds: data.document.sharedWithDoctorIds ?? [],
          createdAt: data.document.createdAt ?? null,
        },
        ...prev,
      ]);
      setShowResultModal(false);
      setResultTitle("");
      setResultSummary("");
      setResultFile(null);
      setResultLinkedOrder("");
      setResultSharing(false);
    } else {
      const err = await res.json().catch(() => ({}));
      setResultError(err.error ?? "Erreur lors de l'envoi");
    }
    setResultSaving(false);
  }

  const tabs = [
    { key: "apercu", label: "Aperçu", icon: LayoutDashboard },
    { key: "commandes", label: "Commandes", icon: ClipboardList },
    { key: "resultats", label: "Résultats", icon: FileText },
    { key: "documents", label: "Documents", icon: FolderOpen },
    { key: "notes", label: "Notes", icon: StickyNote },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-green-600 text-green-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* APERÇU */}
      {tab === "apercu" && (
        <div className="space-y-4">
          {/* Contact card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Informations
            </h2>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              {patient.phone && (
                <>
                  <span className="text-muted-foreground">Téléphone</span>
                  <span dir="ltr">{patient.phone}</span>
                </>
              )}
              {patient.email && (
                <>
                  <span className="text-muted-foreground">Email</span>
                  <span>{patient.email}</span>
                </>
              )}
              {patient.cin && (
                <>
                  <span className="text-muted-foreground">CIN</span>
                  <span>{patient.cin}</span>
                </>
              )}
              {patient.gender && (
                <>
                  <span className="text-muted-foreground">Genre</span>
                  <span className="capitalize">{patient.gender}</span>
                </>
              )}
              {patient.bloodType && (
                <>
                  <span className="text-muted-foreground">Groupe sanguin</span>
                  <span>{patient.bloodType}</span>
                </>
              )}
              {stats.lastVisitAt && (
                <>
                  <span className="text-muted-foreground">Dernière visite</span>
                  <span>{new Date(stats.lastVisitAt).toLocaleDateString("fr-TN")}</span>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.byStatus).map(([status, cnt]) => (
              <div
                key={status}
                className="bg-white rounded-2xl border border-border p-4 text-center"
              >
                <div className="text-2xl font-black text-foreground tabular-nums">{cnt}</div>
                <div
                  className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block ${
                    STATUS_PILL[status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {status}
                </div>
              </div>
            ))}
          </div>

          {/* Last 3 orders */}
          {orders.slice(0, 3).length > 0 && (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">Dernières commandes</h2>
              </div>
              <div className="divide-y divide-border">
                {orders.slice(0, 3).map((o) => (
                  <div key={o.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="flex-1 text-muted-foreground truncate">
                      {testLabel(o.tests)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        STATUS_PILL[o.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {o.status}
                    </span>
                    <Link
                      href={`/laboratoire/commandes/${o.id}`}
                      className="text-green-600 hover:underline text-xs"
                    >
                      Voir
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last 3 results */}
          {localResults.slice(0, 3).length > 0 && (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">Derniers résultats</h2>
              </div>
              <div className="divide-y divide-border">
                {localResults.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="flex-1 text-foreground truncate">{r.title ?? r.fileName}</span>
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline text-xs flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Voir
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMMANDES */}
      {tab === "commandes" && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
              <p className="text-sm">Aucune commande</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="text-start px-4 py-3 font-semibold text-muted-foreground">Date</th>
                    <th className="text-start px-4 py-3 font-semibold text-muted-foreground">Réf.</th>
                    <th className="text-start px-4 py-3 font-semibold text-muted-foreground">Examens</th>
                    <th className="text-start px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                    <th className="text-start px-4 py-3 font-semibold text-muted-foreground">Urgence</th>
                    <th className="text-start px-4 py-3 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString("fr-TN") : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {o.internalRef ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                        {testLabel(o.tests)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            STATUS_PILL[o.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                        {o.urgency}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/laboratoire/commandes/${o.id}`}
                          className="text-xs px-2 py-1 rounded-lg border border-border hover:bg-gray-100 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RÉSULTATS */}
      {tab === "resultats" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Résultats téléversés</h2>
            {(isAdmin || labUserRole === "technician") && (
              <button
                onClick={() => setShowResultModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter un résultat
              </button>
            )}
          </div>

          {localResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
              <FileText className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
              <p className="text-sm">Aucun résultat</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {localResults.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <FileIcon mime={r.mimeType} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {r.title ?? r.fileName}
                      </p>
                      {r.category && (
                        <p className="text-xs text-muted-foreground capitalize">{r.category}</p>
                      )}
                      {r.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString("fr-TN")}
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-border hover:bg-gray-50 font-medium"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Voir résultat
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DOCUMENTS */}
      {tab === "documents" && (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-border">
            {(["uploaded", "received"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDocSubTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  docSubTab === t
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "uploaded" ? "Téléversés par nous" : "Reçus d'autres labos"}
              </button>
            ))}
          </div>

          {docSubTab === "uploaded" && (
            <>
              {localResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
                  <FolderOpen className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
                  <p className="text-sm">Aucun document</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localResults.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <FileIcon mime={r.mimeType} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{r.title ?? r.fileName}</p>
                          {r.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString("fr-TN")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-border hover:bg-gray-50"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Voir
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {docSubTab === "received" && (
            <>
              {received.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
                  <FolderOpen className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
                  <p className="text-sm">Aucun document reçu</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {received.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <FileIcon mime={r.mimeType} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{r.title ?? r.fileName}</p>
                          {r.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString("fr-TN")}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-border hover:bg-gray-50"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* NOTES */}
      {tab === "notes" && (
        <div className="space-y-4">
          {/* Create form */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <h2 className="text-sm font-semibold mb-3">Ajouter une note interne</h2>
            <form onSubmit={submitNote} className="space-y-3">
              <textarea
                className="w-full rounded-xl border border-border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
                rows={3}
                placeholder="Note interne (non visible par le médecin ou le patient)…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notePinned}
                    onChange={(e) => setNotePinned(e.target.checked)}
                    className="rounded"
                  />
                  Épingler cette note
                </label>
                <button
                  type="submit"
                  disabled={noteSaving || !noteBody.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {noteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
              <StickyNote className="h-10 w-10 mb-3 text-gray-200" strokeWidth={1.5} />
              <p className="text-sm">Aucune note</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => {
                const canEdit =
                  note.authorLabUserId === labUserId || isAdmin;
                return (
                  <div
                    key={note.id}
                    className={`bg-white rounded-2xl border shadow-sm p-5 ${
                      note.pinned ? "border-green-300" : "border-border"
                    }`}
                  >
                    {note.pinned && (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-semibold mb-2">
                        <Pin className="h-3 w-3" />
                        Épinglée
                      </div>
                    )}

                    {editNoteId === note.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-xl border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
                          rows={3}
                          value={editNoteBody}
                          onChange={(e) => setEditNoteBody(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditNote(note.id)}
                            className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold"
                          >
                            Sauvegarder
                          </button>
                          <button
                            onClick={() => setEditNoteId(null)}
                            className="px-3 py-1.5 rounded-lg border border-border text-xs"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.body}</p>
                    )}

                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>
                        {note.author ?? "—"}
                        {note.createdAt && (
                          <> · {new Date(note.createdAt).toLocaleDateString("fr-TN")}</>
                        )}
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePin(note)}
                            title={note.pinned ? "Désépingler" : "Épingler"}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground"
                          >
                            {note.pinned ? (
                              <PinOff className="h-3.5 w-3.5" />
                            ) : (
                              <Pin className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditNoteId(note.id);
                              setEditNoteBody(note.body);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Ad-hoc result modal */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-black">Ajouter un résultat</h2>
            <form onSubmit={submitResult} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  value={resultTitle}
                  onChange={(e) => setResultTitle(e.target.value)}
                  placeholder="Ex: Bilan lipidique…"
                  required
                />
              </div>

              {pendingOrders.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Lier à une commande existante (optionnel)
                  </label>
                  <select
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm"
                    value={resultLinkedOrder}
                    onChange={(e) => setResultLinkedOrder(e.target.value)}
                  >
                    <option value="">— Aucune —</option>
                    {pendingOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.internalRef
                          ? `#${o.internalRef}`
                          : o.tests.map((t) => t.label ?? t.code).join(", ")}
                        {" "}({o.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Résumé (optionnel)</label>
                <textarea
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm resize-none"
                  rows={2}
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Fichier <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*,.doc,.docx"
                  onChange={(e) => setResultFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                  required
                />
              </div>

              {resultLinkedOrder && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resultSharing}
                    onChange={(e) => setResultSharing(e.target.checked)}
                  />
                  Partager avec le médecin prescripteur
                </label>
              )}

              {resultError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {resultError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={resultSaving || !resultTitle.trim() || !resultFile}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {resultSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResultModal(false);
                    setResultError("");
                  }}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
