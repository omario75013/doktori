"use client";

import { useEffect, useState } from "react";
import { Building2, Check, X, Loader2, Clock, MapPin, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

type Invitation = {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicCity: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

type CardState = "idle" | "loading" | "accepted" | "declined" | "error";

function InvitationCard({ invitation, onDone }: { invitation: Invitation; onDone: () => void }) {
  const t = useTranslations("medecin.invitations");
  const [state, setState] = useState<CardState>("idle");

  async function act(action: "accept" | "decline") {
    setState("loading");
    try {
      const res = await fetch(`/api/doctor/clinic-invitations/${invitation.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("request failed");
      setState(action === "accept" ? "accepted" : "declined");
      // Let parent know so it can refresh count etc.
      setTimeout(onDone, 1500);
    } catch {
      setState("error");
    }
  }

  const expiresDate = new Date(invitation.expiresAt);
  const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (state === "accepted") {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-700">
        <Check className="w-5 h-5 flex-shrink-0" />
        <span>
          {t("accepted")} — <strong>{invitation.clinicName}</strong>
        </span>
      </div>
    );
  }

  if (state === "declined") {
    return (
      <div className="flex items-center gap-3 bg-gray-50 border border-border rounded-xl px-5 py-4 text-sm text-gray-500">
        <X className="w-5 h-5 flex-shrink-0" />
        <span>{t("declined")}</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
        <span>Une erreur est survenue.</span>
        <button onClick={() => setState("idle")} className="underline ml-1">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-xl px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Icon + info */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50">
          <Building2 className="h-5 w-5 text-teal-600" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[color:var(--ink-900)] truncate">{invitation.clinicName}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {invitation.clinicCity && (
              <span className="flex items-center gap-1 text-xs text-[color:var(--ink-500)]">
                <MapPin className="h-3 w-3" />
                {invitation.clinicCity}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-[color:var(--ink-500)]">
              <ShieldCheck className="h-3 w-3" />
              {invitation.role === "admin" ? "Administrateur" : "Membre"}
            </span>
            <span className="flex items-center gap-1 text-xs text-[color:var(--ink-400)]">
              <Clock className="h-3 w-3" />
              {t("expiresAt", { days: daysLeft })}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
        {state === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
        ) : (
          <>
            <button
              onClick={() => act("accept")}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              {t("accept")}
            </button>
            <button
              onClick={() => act("decline")}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-[color:var(--ink-600)] hover:bg-[color:var(--surface-2)] transition-colors"
            >
              <X className="h-4 w-4" />
              {t("decline")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function InvitationsPage() {
  const t = useTranslations("medecin.invitations");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/doctor/clinic-invitations", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { invitations?: Invitation[] };
        setInvitations(data.invitations ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">{t("title")}</h1>
        <p className="mt-1 text-sm text-[color:var(--ink-500)]">{t("pending")}</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[color:var(--ink-500)] py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : invitations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-[color:var(--ink-300)]" />
          <p className="text-sm text-[color:var(--ink-500)]">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} onDone={() => void load()} />
          ))}
        </div>
      )}
    </div>
  );
}
