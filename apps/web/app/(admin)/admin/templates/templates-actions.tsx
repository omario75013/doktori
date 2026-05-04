"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  templateId: string;
  templateTitle: string;
}

export function AdminTemplatesActions({ templateId, templateTitle }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Supprimer le modèle officiel "${templateTitle}" ?\n\nLes clones existants chez les médecins ne seront pas affectés. Cette action est irréversible.`
      )
    )
      return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la suppression");
      }
      toast.success("Modèle officiel supprimé");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur serveur");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
    >
      {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      Supprimer
    </button>
  );
}
