"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";

export function UploadResultForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("note", note);

      const res = await fetch(`/api/laboratoire/orders/${orderId}/results`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Erreur lors de l'envoi.");
        return;
      }

      router.refresh();
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* File picker */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-green-800">
          Fichier résultat
        </label>
        <input
          type="file"
          accept="application/pdf,image/*"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
        />
      </div>

      {/* Note */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-green-800">
          Note (optionnel)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Commentaire sur les résultats…"
          className="w-full rounded-xl border-2 border-border px-3 py-2 text-sm text-foreground bg-white outline-none focus:border-green-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={uploading || !file}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
        ) : (
          <Upload className="h-4 w-4" strokeWidth={2.5} />
        )}
        Envoyer les résultats
      </button>
    </form>
  );
}
