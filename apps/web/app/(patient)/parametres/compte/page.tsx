"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Trash2, X, Download, Clock } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";

interface DeletionRequest {
  id: string;
  scheduledAt: string;
  requestedAt: string;
  reason: string | null;
}

export default function CompteParametresPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<DeletionRequest | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("doktori_patient_token");
    if (!stored) {
      router.replace("/connexion-patient");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/me/account-deletion", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setPendingRequest(data.request ?? null);
        setLoadingRequest(false);
      })
      .catch(() => setLoadingRequest(false));
  }, [token]);

  async function handleRequestDeletion() {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/me/account-deletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequest(data.request);
        setShowDeleteModal(false);
        setReason("");
        toast.success("Demande de suppression enregistrée. Vous avez 30 jours pour annuler.");
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la demande");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelDeletion() {
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/me/account-deletion", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPendingRequest(null);
        toast.success("Demande de suppression annulée.");
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    try {
      const res = await fetch("/api/me/data-export", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error("Erreur lors de l'export");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = format(new Date(), "yyyy-MM-dd");
      a.download = `doktori-export-${date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé.");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  }

  const daysRemaining = pendingRequest
    ? Math.max(0, differenceInDays(new Date(pendingRequest.scheduledAt), new Date()))
    : null;

  return (
    <div className="min-h-screen bg-secondary dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-foreground transition-colors">
            ← Retour
          </button>
          <h1 className="text-xl font-bold text-foreground">Mon compte</h1>
        </div>

        {/* Data Export */}
        <div className="rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h2 className="font-semibold text-foreground mb-1">Exporter mes données</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Téléchargez une copie de toutes vos données personnelles (RGPD — portabilité).
          </p>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting || !token}
            className="rounded-xl"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Génération en cours…" : "Exporter mes données"}
          </Button>
        </div>

        {/* Account Deletion */}
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-red-600 dark:text-red-400">Supprimer mon compte</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            La suppression est planifiée avec un délai de 30 jours. Pendant ce délai, vous pouvez annuler la demande.
            Après cette période, toutes vos données seront définitivement effacées.
          </p>

          {loadingRequest ? (
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          ) : pendingRequest ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-orange-800 dark:text-orange-200">Suppression planifiée</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-0.5">
                    Votre compte sera supprimé dans{" "}
                    <span className="font-bold">{daysRemaining} jour{daysRemaining !== 1 ? "s" : ""}</span>
                    {" "}(le{" "}
                    {format(new Date(pendingRequest.scheduledAt), "d MMMM yyyy", { locale: fr })}).
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelDeletion}
                disabled={submitting}
                className="mt-3 rounded-xl border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <X className="w-4 h-4 mr-1" />
                Annuler la demande
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(true)}
              className="rounded-xl border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer mon compte
            </Button>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl border border-border dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold text-foreground">Confirmer la suppression</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Votre compte sera supprimé dans <strong>30 jours</strong>. Vous pouvez annuler pendant ce délai.
              Cette action est définitive après la période de grâce.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-1 block">
                Raison (optionnel)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Dites-nous pourquoi vous souhaitez supprimer votre compte…"
                className="rounded-xl resize-none"
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setReason(""); }}
                className="rounded-xl border border-border dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={handleRequestDeletion}
                disabled={submitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Envoi…" : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
