"use client";

import { useState } from "react";
import { KeyRound, Mail, Lock, X } from "lucide-react";
import { toast } from "sonner";

type ActorType = "doctor" | "clinic" | "lab" | "lab_user" | "secretary";

export function ResetPasswordButton({
  actorType,
  actorId,
  actorName,
  variant = "icon",
}: {
  actorType: ActorType;
  actorId: string;
  actorName?: string;
  variant?: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50"
          title="Réinitialiser mot de passe"
        >
          <KeyRound className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
        >
          <KeyRound className="w-4 h-4" />
          Réinitialiser mot de passe
        </button>
      )}
      {open && (
        <ResetPasswordDialog
          actorType={actorType}
          actorId={actorId}
          actorName={actorName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ResetPasswordDialog({
  actorType,
  actorId,
  actorName,
  onClose,
}: {
  actorType: ActorType;
  actorId: string;
  actorName?: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"link" | "set">("link");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (mode === "set" && password.length < 8) {
      toast.error("Mot de passe trop court (min 8 caractères)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/users/${actorType}/${actorId}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mode === "set" ? { mode, password } : { mode }),
        },
      );
      if (res.ok) {
        toast.success(
          mode === "set"
            ? "Nouveau mot de passe enregistré"
            : "Lien envoyé par email",
        );
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Échec");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-bold text-slate-900">
            Réinitialiser le mot de passe
            {actorName ? ` — ${actorName}` : ""}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("link")}
              className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium ${
                mode === "link"
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Mail className="w-4 h-4" />
              Envoyer un lien
            </button>
            <button
              onClick={() => setMode("set")}
              className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium ${
                mode === "set"
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Lock className="w-4 h-4" />
              Définir un nouveau
            </button>
          </div>

          {mode === "set" ? (
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                Nouveau mot de passe
              </div>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Communiquez ce mot de passe à l&apos;utilisateur via un canal sécurisé.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Un email avec un lien de réinitialisation valide 1 heure sera envoyé
              à l&apos;adresse enregistrée de l&apos;utilisateur.
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting
              ? "…"
              : mode === "set"
              ? "Enregistrer"
              : "Envoyer le lien"}
          </button>
        </div>
      </div>
    </div>
  );
}
