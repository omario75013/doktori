"use client";

import { useEffect, useState, useCallback } from "react";
import { StickyNote, Plus, Trash2, AlertTriangle, Pin, Loader2 } from "lucide-react";

type ClinicNote = {
  id: string;
  title: string | null;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

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
  const [notes, setNotes] = useState<ClinicNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clinique/notes", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data = (await res.json()) as { notes: ClinicNote[] };
      setNotes(data.notes);
    } catch {
      setError("Impossible de charger les notes. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  async function addNote() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/clinique/notes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, body: body.trim(), pinned }),
      });
      if (!res.ok) throw new Error("Erreur");
      setTitle("");
      setBody("");
      setPinned(false);
      await fetchNotes();
    } catch {
      setError("Erreur lors de la création de la note.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNote(id: string) {
    try {
      const res = await fetch(`/api/clinique/notes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setError("Erreur lors de la suppression.");
    }
  }

  async function togglePin(note: ClinicNote) {
    try {
      const res = await fetch(`/api/clinique/notes/${note.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (!res.ok) throw new Error("Erreur");
      await fetchNotes();
    } catch {
      setError("Erreur lors de la mise à jour.");
    }
  }

  const pinnedCount = notes.filter((n) => n.pinned).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <StickyNote className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Notes internes</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Mémos et communications internes de la clinique
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600 text-xs underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Pinned banner */}
      {pinnedCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-700 font-medium">
            {pinnedCount} note{pinnedCount > 1 ? "s" : ""} épinglée{pinnedCount > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Add note form */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-foreground mb-1">Ajouter une note</h2>

        <input
          type="text"
          placeholder="Titre de la note… (facultatif)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          maxLength={120}
        />

        <textarea
          placeholder="Contenu de la note… Ex: Dr. Khelifi absent lundi, Nouveau protocole…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
          maxLength={1000}
        />

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="rounded"
            />
            <Pin className="w-3.5 h-3.5 text-amber-500" />
            Épingler
          </label>

          <button
            onClick={addNote}
            disabled={!body.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-doktori-teal-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Ajouter
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-2xl">
          <StickyNote className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Aucune note pour le moment</p>
          <p className="text-xs text-gray-300 mt-1">
            Ajoutez des mémos pour communiquer avec votre équipe.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={deleteNote}
              onTogglePin={togglePin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  onDelete,
  onTogglePin,
}: {
  note: ClinicNote;
  onDelete: (id: string) => void;
  onTogglePin: (note: ClinicNote) => void;
}) {
  return (
    <div
      className={[
        "bg-white border rounded-2xl px-5 py-4 shadow-sm",
        note.pinned ? "border-amber-200 border-l-4 border-l-amber-400" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {note.pinned && (
            <Pin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            {note.title && (
              <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
            )}
            <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{note.body}</p>
            <p className="text-xs text-gray-400 mt-2">{formatDate(note.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onTogglePin(note)}
            className={[
              "p-1.5 rounded-lg transition-colors",
              note.pinned
                ? "text-amber-400 hover:bg-amber-50"
                : "text-gray-300 hover:text-amber-400 hover:bg-amber-50",
            ].join(" ")}
            aria-label={note.pinned ? "Désépingler" : "Épingler"}
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Supprimer la note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
