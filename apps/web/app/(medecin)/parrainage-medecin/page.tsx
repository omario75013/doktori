"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Copy, Check, Send, Mail, Award } from "lucide-react";

interface Referral {
  id: string;
  status: string;
  commissionPct: number;
  rewardsEarnedTnd: number;
  validatedAt: string | null;
  createdAt: string;
  rejectionReason: string | null;
  referredName: string;
  referredEmail: string;
}

interface Stats {
  sentCount: number;
  validatedCount: number;
  totalRewardsTnd: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  validated: "Validé",
  rejected: "Rejeté",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  validated: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ParrainageMedecinPage() {
  const [code, setCode] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [sent, setSent] = useState<Referral[]>([]);
  const [stats, setStats] = useState<Stats>({
    sentCount: 0,
    validatedCount: 0,
    totalRewardsTnd: 0,
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [codeRes, listRes] = await Promise.all([
        fetch("/api/medecin/referral-code"),
        fetch("/api/medecin/referrals"),
      ]);
      if (codeRes.ok) {
        const data = await codeRes.json();
        setCode(data.code);
        setDoctorId(data.doctorId);
      }
      if (listRes.ok) {
        const data = await listRes.json();
        setSent(data.sent ?? []);
        setStats(data.stats ?? { sentCount: 0, validatedCount: 0, totalRewardsTnd: 0 });
      }
    } finally {
      setLoading(false);
    }
  }

  function inviteLink() {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://doktori.tn";
    return doctorId ? `${base}/inscription?ref=${doctorId}` : "";
  }

  function handleCopyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyLink() {
    const link = inviteLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    try {
      const res = await fetch("/api/medecin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referredEmail: inviteEmail.trim().toLowerCase() }),
      });
      if (res.ok) {
        toast.success("Invitation envoyée");
        setInviteEmail("");
        await loadAll();
      } else {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Erreur lors de l'envoi");
      }
    } finally {
      setInviteSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Parrainage médecin → médecin
          </h1>
          <p className="text-sm text-gray-500">
            Invitez vos confrères et gagnez 5% de commission sur leurs 3 premiers mois
          </p>
        </div>
      </div>

      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-foreground p-6 text-white shadow-sm">
        <h2 className="text-lg font-semibold mb-1">Programme commission 5%</h2>
        <p className="text-white/80 text-sm">
          Pour chaque confrère qui rejoint Doktori grâce à votre invitation et qui
          souscrit, vous touchez 5% de ses 3 premiers mois d'abonnement (validation
          par notre équipe).
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm text-center">
          <div className="text-3xl font-bold text-foreground">{stats.sentCount}</div>
          <div className="text-xs text-gray-500 mt-1">Invitations envoyées</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm text-center">
          <div className="text-3xl font-bold text-primary">{stats.validatedCount}</div>
          <div className="text-xs text-gray-500 mt-1">Validées</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm text-center">
          <div className="text-3xl font-bold text-emerald-600">
            {stats.totalRewardsTnd.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">TND gagnés</div>
        </div>
      </div>

      {/* Code + link card */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Votre code parrain
        </h2>
        {loading ? (
          <div className="h-12 bg-secondary rounded-xl animate-pulse" />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 font-mono text-xl tracking-widest font-bold text-center select-all text-foreground">
                {code}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-doktori-teal-dark min-w-24 h-12 inline-flex items-center justify-center gap-1"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-500">
                Lien d'inscription personnalisé
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 truncate text-xs bg-gray-50 border border-border rounded-lg px-3 py-2 text-gray-700">
                  {inviteLink()}
                </code>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-lg bg-secondary text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  {linkCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {linkCopied ? "Copié" : "Copier"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invite form */}
      <form
        onSubmit={handleInvite}
        className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Inviter un confrère par email
        </h2>
        <p className="text-sm text-gray-500">
          Entrez l'email d'un médecin confrère. Il recevra une invitation
          personnalisée à rejoindre Doktori.
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="confrere@hopital.tn"
            required
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={inviteSending || !inviteEmail.trim()}
            className="bg-primary hover:bg-doktori-teal-dark text-white font-bold"
          >
            <Send className="h-4 w-4 mr-2" />
            {inviteSending ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </form>

      {/* Sent list */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Mes invitations ({sent.length})
          </h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-10 bg-secondary rounded-xl animate-pulse" />
          </div>
        ) : sent.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-foreground font-medium mb-1">
              Aucune invitation pour le moment
            </p>
            <p className="text-sm text-gray-400">
              Invitez un confrère pour commencer à gagner des commissions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sent.map((r) => (
              <div
                key={r.id}
                className="p-4 flex items-center justify-between hover:bg-secondary/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground">
                    {r.referredName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r.referredEmail} ·{" "}
                    {format(new Date(r.createdAt), "d MMM yyyy", { locale: fr })}
                  </div>
                  {r.rejectionReason && (
                    <div className="text-xs text-red-500 mt-1 italic">
                      Motif : {r.rejectionReason}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.status === "validated" && r.rewardsEarnedTnd > 0 && (
                    <span className="text-xs font-semibold text-emerald-600">
                      {r.rewardsEarnedTnd.toFixed(2)} TND
                    </span>
                  )}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
