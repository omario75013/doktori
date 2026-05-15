"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, Check, X, Loader2, MapPin, ShieldCheck } from "lucide-react";

type InvitationDetail = {
  id: string;
  clinicId: string;
  clinicName: string;
  clinicCity: string;
  role: string;
  status: string;
  expiresAt: string;
};

type PageState = "loading" | "pending" | "accepted" | "declined" | "expired" | "not_found" | "error";

export default function InvitationTokenPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/doctor/invitations/token/${token}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 404) { setPageState("not_found"); return; }
        if (res.status === 410) { setPageState("expired"); return; }
        if (!res.ok) { setPageState("error"); return; }
        const data = (await res.json()) as { invitation: InvitationDetail };
        setInvitation(data.invitation);
        if (data.invitation.status === "accepted") setPageState("accepted");
        else if (data.invitation.status === "declined") setPageState("declined");
        else setPageState("pending");
      })
      .catch(() => setPageState("error"));
  }, [token]);

  async function act(action: "accept" | "decline") {
    if (!invitation) return;
    setActing(true);
    try {
      const res = await fetch(`/api/doctor/clinic-invitations/${invitation.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("failed");
      setPageState(action === "accept" ? "accepted" : "declined");
      if (action === "accept") {
        setTimeout(() => router.push("/cabinets"), 2000);
      }
    } catch {
      setPageState("error");
    } finally {
      setActing(false);
    }
  }

  if (pageState === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (pageState === "not_found") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="text-lg font-semibold text-[color:var(--ink-900)]">Invitation introuvable</p>
        <p className="mt-2 text-sm text-[color:var(--ink-500)]">Ce lien est invalide ou a déjà été utilisé.</p>
      </div>
    );
  }

  if (pageState === "expired") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="text-lg font-semibold text-[color:var(--ink-900)]">Invitation expirée</p>
        <p className="mt-2 text-sm text-[color:var(--ink-500)]">Cette invitation n&apos;est plus valide. Demandez à la clinique de vous renvoyer une invitation.</p>
      </div>
    );
  }

  if (pageState === "accepted") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-xl font-bold text-[color:var(--ink-900)]">Invitation acceptée</p>
        <p className="mt-2 text-sm text-[color:var(--ink-500)]">
          Vous avez rejoint <strong>{invitation?.clinicName}</strong>. Redirection vers vos cabinets…
        </p>
      </div>
    );
  }

  if (pageState === "declined") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <X className="h-8 w-8 text-gray-500" />
        </div>
        <p className="text-xl font-bold text-[color:var(--ink-900)]">Invitation refusée</p>
        <p className="mt-2 text-sm text-[color:var(--ink-500)]">Vous avez refusé cette invitation.</p>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p className="text-lg font-semibold text-red-600">Une erreur est survenue</p>
        <p className="mt-2 text-sm text-[color:var(--ink-500)]">Réessayez plus tard ou contactez le support.</p>
      </div>
    );
  }

  // pending
  return (
    <div className="mx-auto max-w-lg py-16 px-4 space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
          <Building2 className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-[color:var(--ink-900)]">Invitation à rejoindre une clinique</h1>
        <p className="mt-2 text-sm text-[color:var(--ink-500)]">
          Vous avez été invité(e) à rejoindre l&apos;équipe médicale de :
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 space-y-2">
        <p className="text-xl font-bold text-[color:var(--ink-900)]">{invitation?.clinicName}</p>
        {invitation?.clinicCity && (
          <p className="flex items-center gap-1.5 text-sm text-[color:var(--ink-500)]">
            <MapPin className="h-4 w-4" />
            {invitation.clinicCity}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-sm text-[color:var(--ink-500)]">
          <ShieldCheck className="h-4 w-4" />
          Rôle : {invitation?.role === "admin" ? "Administrateur" : "Membre"}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => act("accept")}
          disabled={acting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Accepter l&apos;invitation
        </button>
        <button
          onClick={() => act("decline")}
          disabled={acting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-3 font-semibold text-[color:var(--ink-700)] hover:bg-[color:var(--surface-2)] disabled:opacity-50 transition-colors"
        >
          <X className="h-4 w-4" />
          Refuser
        </button>
      </div>
    </div>
  );
}
