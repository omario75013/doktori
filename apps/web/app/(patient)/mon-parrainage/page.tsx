"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Gift, Share2, Copy, Check, Users, Calendar, Award, MessageCircle, Mail } from "lucide-react";

type ReferralData = {
  code: string;
  usesCount: number;
  rewardsEarned: number;
  stats: {
    friendsJoined: number;
    rdvTaken: number;
    rewardsEarned: number;
  };
};

export default function ParrainagePage() {
  const router = useRouter();
  const t = useTranslations("patient.monParrainage");
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("doktori_patient_session");
    if (!stored) {
      router.replace("/mes-rdv");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/me/referral", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          sessionStorage.removeItem("doktori_patient_session");
          router.replace("/mes-rdv");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d && !d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, router]);

  const shareUrl = data ? `https://doktori.tn/?ref=${data.code}` : "";
  const shareText = t("shareText");

  async function handleShare() {
    if (!data) return;
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await navigator.share({ title: "Doktori", text: shareText, url: shareUrl });
        return;
      } catch {
        // User cancelled — fallback to copy
      }
    }
    handleCopy();
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">{t("loadError")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-8 w-8 text-primary" strokeWidth={2} />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </header>

        {/* Code card */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("yourCode")}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-5 py-4">
            <span className="font-mono text-2xl font-black text-primary tracking-wider">
              {data.code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground hover:border-primary"
              aria-label={t("copyCode")}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-doktori-green-dark" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {t("copy")}
                </>
              )}
            </button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{t("linkToShare")}</p>
          <div className="mt-1 break-all rounded-xl bg-secondary/40 px-4 py-2 text-sm font-mono text-foreground">
            {shareUrl}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-doktori-teal-dark"
            >
              <Share2 className="h-4 w-4" strokeWidth={2.5} />
              {t("share")}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-bold text-foreground hover:border-primary"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
              WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(t("emailSubject"))}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-bold text-foreground hover:border-primary"
            >
              <Mail className="h-4 w-4" strokeWidth={2.5} />
              {t("email")}
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label={t("stats.friends")}
            value={data.stats.friendsJoined}
          />
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label={t("stats.rdv")}
            value={data.stats.rdvTaken}
          />
          <StatCard
            icon={<Award className="h-5 w-5" />}
            label={t("stats.rewards")}
            value={data.stats.rewardsEarned}
          />
        </div>

        {/* How it works */}
        <div className="mt-6 rounded-2xl border border-border bg-white p-6">
          <p className="font-bold text-foreground">{t("howItWorks")}</p>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-bold text-primary">1.</span>
              <span>{t("steps.1")}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">2.</span>
              <span>{t("steps.2")}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">3.</span>
              <span>{t("steps.3")}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <div className="mt-2 font-heading text-2xl font-black text-foreground">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
