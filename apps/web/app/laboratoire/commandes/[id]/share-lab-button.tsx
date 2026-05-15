"use client";

import { useEffect, useState } from "react";
import { Share2, Loader2, X, CheckCircle2 } from "lucide-react";

type LabTarget = {
  id: string;
  name: string;
  city: string;
  kind: string;
};

type Props = {
  docId: string;
  patientId: string;
  /** IDs already shared (pre-populated from DB). */
  initialSharedIds?: string[];
};

export function ShareLabButton({ docId, patientId, initialSharedIds = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<LabTarget[]>([]);
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set(initialSharedIds));
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function loadTargets() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/laboratoire/patients/${patientId}/exchange-targets`);
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Erreur lors du chargement.");
        return;
      }
      const data = await res.json() as { labs: LabTarget[] };
      setTargets(data.labs ?? []);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadTargets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function toggle(targetLabId: string) {
    const currentlyShared = sharedIds.has(targetLabId);
    setToggling(targetLabId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/laboratoire/documents/${docId}/share-with-lab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLabId, share: !currentlyShared }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Erreur lors du partage.");
        return;
      }
      setSharedIds((prev) => {
        const next = new Set(prev);
        if (currentlyShared) {
          next.delete(targetLabId);
        } else {
          next.add(targetLabId);
        }
        return next;
      });
      setSuccessMsg(currentlyShared ? "Partage retiré." : "Document partagé.");
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
      >
        <Share2 className="h-4 w-4" strokeWidth={2.5} />
        Partager avec un autre labo
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-black text-foreground">
                Partager avec un autre laboratoire
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement…
                </div>
              )}

              {!loading && error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              {!loading && !error && targets.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun autre laboratoire vérifié disponible.
                </p>
              )}

              {!loading && targets.map((lab) => {
                const isShared = sharedIds.has(lab.id);
                const isToggling = toggling === lab.id;
                return (
                  <div
                    key={lab.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{lab.name}</p>
                      <p className="text-xs text-muted-foreground">{lab.city} · {lab.kind === "radiology" ? "Radiologie" : "Laboratoire"}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => toggle(lab.id)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        isShared
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "border border-border text-muted-foreground hover:border-green-400 hover:text-green-700"
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isShared ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Partagé
                        </>
                      ) : (
                        "Partager"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer feedback */}
            {(successMsg || (error && !loading)) && (
              <div className="border-t border-border px-5 py-3">
                {successMsg && (
                  <p className="text-sm text-green-700 font-medium">{successMsg}</p>
                )}
                {error && !loading && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
