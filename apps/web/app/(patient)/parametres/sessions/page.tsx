"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Globe, ShieldAlert, X, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

interface PatientSession {
  id: string;
  deviceLabel: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

function DeviceIcon({ label }: { label: string | null }) {
  const l = label?.toLowerCase() ?? "";
  if (/iphone|ipad|android|mobile/i.test(l)) {
    return <Smartphone className="w-5 h-5 text-primary" />;
  }
  return <Monitor className="w-5 h-5 text-primary" />;
}

export default function SessionsParametresPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("doktori_patient_session");
    if (!stored) {
      router.replace("/connexion-patient");
      return;
    }
    setToken(stored);
    loadSessions(stored);
  }, [router]);

  function loadSessions(t: string) {
    setLoading(true);
    fetch("/api/me/sessions", {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  async function revokeSession(id: string) {
    if (!token) return;
    setRevoking(id);
    try {
      const res = await fetch(`/api/me/sessions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        toast.success("Session révoquée.");
      } else {
        toast.error("Erreur lors de la révocation");
      }
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAllOthers() {
    if (!token) return;
    setRevokingAll(true);
    try {
      const res = await fetch("/api/me/sessions", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        // Keep only current session in UI
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        toast.success("Toutes les autres sessions ont été révoquées.");
      } else {
        toast.error("Erreur lors de la révocation");
      }
    } finally {
      setRevokingAll(false);
    }
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="min-h-screen bg-secondary dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-foreground transition-colors">
            ← Retour
          </button>
          <h1 className="text-xl font-bold text-foreground">Sessions actives</h1>
        </div>

        <div className="rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ces appareils ont accès à votre compte Doktori.
            </p>
            {otherSessions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={revokeAllOthers}
                disabled={revokingAll}
                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                {revokingAll ? "Révocation…" : "Révoquer tout le reste"}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Aucune session active trouvée.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    s.isCurrent
                      ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
                      : "border-border dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  }`}
                >
                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                    <DeviceIcon label={s.deviceLabel} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.deviceLabel ?? "Appareil inconnu"}
                      </p>
                      {s.isCurrent && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Session actuelle
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.ip && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {s.ip}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Dernière activité{" "}
                        {formatDistanceToNow(new Date(s.lastActiveAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">
                      Créée le {format(new Date(s.createdAt), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeSession(s.id)}
                      disabled={revoking === s.id}
                      className="rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0"
                    >
                      {revoking === s.id ? (
                        <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center px-4">
          TODO: La révocation active n'interrompt pas les tokens JWT existants (implémentation NextAuth requise pour enforcement en temps réel).
        </p>
      </div>
    </div>
  );
}
