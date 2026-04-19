"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Gift, Search, Copy, Check, UserRound } from "lucide-react";

type DoctorResult = {
  id: string;
  name: string;
  specialty: string;
  slug: string;
  city: string;
};

type Referral = {
  id: string;
  status: string;
  createdAt: string;
  validatedAt: string | null;
  referredName: string;
  referredEmail: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  validated: "Validé",
  rewarded: "Récompensé",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  validated: "bg-blue-100 text-blue-700",
  rewarded: "bg-secondary text-primary",
};

export default function ParrainagePage() {
  const [code, setCode] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Doctor referral search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DoctorResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [codeRes, referralsRes] = await Promise.all([
        fetch("/api/referrals/code"),
        fetch("/api/referrals"),
      ]);
      if (codeRes.ok) {
        const data = await codeRes.json();
        setCode(data.code);
        setDoctorId(data.doctorId ?? null);
      }
      if (referralsRes.ok) {
        setReferrals(await referralsRes.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/doctor/search?q=${encodeURIComponent(trimmed)}&limit=5`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : (data.doctors ?? []));
        }
      } catch {
        // Silently ignore search errors
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function getReferralLink(targetSlug: string) {
    if (!doctorId) return "";
    return `https://doktori.tn/rdv/${targetSlug}?ref=${doctorId}`;
  }

  function handleCopyReferralLink(targetSlug: string, targetId: string) {
    const link = getReferralLink(targetSlug);
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLinkId(targetId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  }

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsappLink = code
    ? `https://wa.me/?text=${encodeURIComponent(
        `Rejoignez Doktori avec mon code parrainage : ${code} — https://doktori.tn/inscription?ref=${code}`
      )}`
    : "#";

  const rewardedCount = referrals.filter((r) => r.status === "rewarded").length;
  const validatedCount = referrals.filter(
    (r) => r.status === "validated" || r.status === "rewarded"
  ).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programme de parrainage</h1>
          <p className="text-sm text-gray-500">Gagnez 1 mois gratuit pour chaque confrère inscrit</p>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-foreground p-6 text-white shadow-sm">
        <h2 className="text-lg font-semibold mb-1">
          Parrainez vos confrères, gagnez des mois gratuits
        </h2>
        <p className="text-white/80 text-sm">
          Partagez votre code unique. Dès qu&apos;un confrère parrainé confirme
          son premier rendez-vous, vous recevez <strong>1 mois gratuit</strong>{" "}
          tous les deux.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-foreground">{referrals.length}</div>
          <div className="text-xs text-gray-500 mt-1">Parrainages envoyés</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-primary">{validatedCount}</div>
          <div className="text-xs text-gray-500 mt-1">Validés</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-green-600">{rewardedCount}</div>
          <div className="text-xs text-gray-500 mt-1">Mois gratuits gagnés</div>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-foreground">Mon code de parrainage</h2>
        {loading ? (
          <div className="h-12 bg-secondary rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 font-mono text-xl tracking-widest font-bold text-center select-all text-foreground">
              {code}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-doktori-teal-dark transition-colors min-w-24 h-12"
            >
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        )}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white rounded-xl px-4 py-3 text-sm font-bold transition-colors h-12"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Partager via WhatsApp
        </a>
        <p className="text-xs text-gray-400 text-center">
          Le parrainage est validé après le 1er rendez-vous confirmé du confrère parrainé.
        </p>
      </div>

      {/* Référer un patient à un confrère */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-foreground">Référer un patient à un confrère</h2>
        <p className="text-sm text-gray-500">
          Créez un lien de prise de rendez-vous personnalisé pour orienter vos patients vers un autre médecin.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un médecin par nom ou spécialité..."
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <UserRound className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.specialty}{doc.city ? ` · ${doc.city}` : ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyReferralLink(doc.slug, doc.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-doktori-teal-dark transition-colors flex-shrink-0"
                >
                  {copiedLinkId === doc.id ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copier le lien
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">Aucun médecin trouvé pour &quot;{searchQuery}&quot;</p>
        )}
      </div>

      {/* Referrals List */}
      <div className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Mes parrainages</h2>
          {referrals.length > 0 && (
            <span className="text-xs text-primary font-semibold bg-secondary px-2.5 py-1 rounded-full">{referrals.length}</span>
          )}
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <p className="text-foreground font-medium mb-1">Aucun parrainage pour le moment</p>
            <p className="text-sm text-gray-400">Partagez votre code pour commencer !</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {referrals.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-secondary transition-colors">
                <div>
                  <div className="font-medium text-sm text-foreground">{r.referredName}</div>
                  <div className="text-xs text-gray-500">
                    {r.referredEmail} &middot; Inscrit le{" "}
                    {format(new Date(r.createdAt), "d MMM yyyy", { locale: fr })}
                    {r.validatedAt && (
                      <> &middot; Validé le {format(new Date(r.validatedAt), "d MMM yyyy", { locale: fr })}</>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
