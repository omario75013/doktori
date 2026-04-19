"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { StickyNote, Plus, Trash2, AlertTriangle, Pin } from "lucide-react";

type NotePriority = "normal" | "urgent";

type ClinicNote = {
  id: string;
  title: string;
  content: string;
  priority: NotePriority;
  createdAt: string; // ISO
};

function storageKey(clinicId: string): string {
  return `doktori_clinic_notes_${clinicId}`;
}

function loadNotes(clinicId: string): ClinicNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(clinicId));
    if (!raw) return [];
    return JSON.parse(raw) as ClinicNote[];
  } catch {
    return [];
  }
}

function saveNotes(clinicId: string, notes: ClinicNote[]): void {
  localStorage.setItem(storageKey(clinicId), JSON.stringify(notes));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-TN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClinicNotesPage() {
  const { data: session } = useSession();
  const clinicId = session?.user?.id ?? null;

  const [notes, setNotes] = useState<ClinicNote[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<NotePriority>("normal");
  const [mounted, setMounted] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && clinicId) {
      setNotes(loadNotes(clinicId));
    }
  }, [mounted, clinicId]);

  function addNote() {
    if (!clinicId || !title.trim() || !content.trim()) return;
    const newNote: ClinicNote = {
      id: crypto.randomUUID(),
      title: title.trim(),
      content: content.trim(),
      priority,
      createdAt: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotes(clinicId, updated);
    setTitle("");
    setContent("");
    setPriority("normal");
  }

  function deleteNote(id: string) {
    if (!clinicId) return;
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveNotes(clinicId, updated);
  }

  // Sort: urgent first, then by date desc
  const sorted = [...notes].sort((a, b) => {
    if (a.priority === "urgent" && b.priority !== "urgent") return -1;
    if (b.priority === "urgent" && a.priority !== "urgent") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const urgentCount = notes.filter((n) => n.priority === "urgent").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <StickyNote className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Notes internes
          </h1>
        </div>
        <p className="text-sm text-gray-500">
          Mémos et communications internes de la clinique
        </p>
      </div>

      {/* Urgent banner */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 font-medium">
            {urgentCount} note{urgentCount > 1 ? "s" : ""} urgente
            {urgentCount > 1 ? "s" : ""} en attente
          </span>
        </div>
      )}

      {/* Add note form */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-foreground mb-1">
          Ajouter une note
        </h2>

        <input
          type="text"
          placeholder="Titre de la note…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          maxLength={120}
        />

        <textarea
          placeholder="Contenu de la note… Ex: Dr. Khelifi absent lundi, Nouveau protocole COVID…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
          maxLength={1000}
        />

        <div className="flex items-center justify-between gap-3">
          {/* Priority selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Priorité:</span>
            <button
              onClick={() => setPriority("normal")}
              className={[
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                priority === "normal"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              ].join(" ")}
            >
              Normale
            </button>
            <button
              onClick={() => setPriority("urgent")}
              className={[
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                priority === "urgent"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              ].join(" ")}
            >
              Urgente
            </button>
          </div>

          <button
            onClick={addNote}
            disabled={!title.trim() || !content.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-doktori-teal-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Notes list */}
      {!mounted ? null : sorted.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-2xl">
          <StickyNote className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Aucune note pour le moment</p>
          <p className="text-xs text-gray-300 mt-1">
            Ajoutez des mémos pour communiquer avec votre équipe.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={deleteNote} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  onDelete,
}: {
  note: ClinicNote;
  onDelete: (id: string) => void;
}) {
  const isUrgent = note.priority === "urgent";

  return (
    <div
      className={[
        "bg-white border rounded-2xl px-5 py-4 shadow-sm",
        isUrgent
          ? "border-red-200 border-l-4 border-l-red-500"
          : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {isUrgent && (
            <Pin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                {note.title}
              </h3>
              {isUrgent && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">
                  Urgent
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
              {note.content}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {formatDate(note.createdAt)}
            </p>
          </div>
        </div>

        <button
          onClick={() => onDelete(note.id)}
          className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
          aria-label="Supprimer la note"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
