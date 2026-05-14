"use client";

import { useEffect, useState } from "react";
import { Building2, Check, X, Loader2 } from "lucide-react";

type Invitation = {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicCity: string;
  role: string;
  status: string;
  expiresAt: string;
};

type ActionState = "idle" | "loading" | "accepted" | "declined" | "error";

function InvitationCard({ invitation }: { invitation: Invitation }) {
  const [state, setState] = useState<ActionState>("idle");

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
    } catch {
      setState("error");
    }
  }

  if (state === "accepted") {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
        <Check className="w-4 h-4 flex-shrink-0" />
        <span>Invitation acceptée — vous avez rejoint <strong>{invitation.clinicName}</strong>.</span>
      </div>
    );
  }

  if (state === "declined") {
    return (
      <div className="flex items-center gap-2 bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm text-gray-500">
        <X className="w-4 h-4 flex-shrink-0" />
        <span>Invitation refusée.</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        <span>Une erreur est survenue. Veuillez réessayer.</span>
        <button
          onClick={() => setState("idle")}
          className="underline ml-1"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
      <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-800">
          Vous avez été invité(e) à rejoindre{" "}
          <strong>{invitation.clinicName}</strong>
          {invitation.clinicCity ? ` — ${invitation.clinicCity}` : ""}
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          Rôle : {invitation.role === "admin" ? "Administrateur" : "Membre"}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {state === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        ) : (
          <>
            <button
              onClick={() => act("accept")}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-doktori-teal-dark transition-colors"
            >
              <Check className="w-3 h-3" />
              Accepter
            </button>
            <button
              onClick={() => act("decline")}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-border text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3 h-3" />
              Refuser
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ClinicInvitationsBanner() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    fetch("/api/doctor/clinic-invitations", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { invitations?: Invitation[] }) => {
        if (Array.isArray(data.invitations)) {
          setInvitations(data.invitations);
        }
      })
      .catch(() => {
        // Silently fail — the banner is non-critical
      });
  }, []);

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {invitations.map((inv) => (
        <InvitationCard key={inv.id} invitation={inv} />
      ))}
    </div>
  );
}
