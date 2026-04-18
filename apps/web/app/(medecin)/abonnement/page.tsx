"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CreditCard,
  CheckCircle2,
  Tag,
  X,
  Crown,
  Sparkles,
  AlertCircle,
  Clock,
  Shield,
  Info,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceMillimes: number;
  description?: string;
  features: string[];
  notIncluded?: string[];
  teleconsultNote?: string | null;
  popular?: boolean;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  startsAt: string;
  endsAt: string;
}

export default function AbonnementPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/billing/plans").then((r) => r.json()),
      fetch("/api/billing/current").then((r) => r.json()),
    ]).then(([p, c]) => {
      setPlans(p);
      setCurrent(c);
      setLoading(false);
    });
  }, []);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoSuccess(null);
    setPromoError(null);

    const res = await fetch("/api/doctor/apply-promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode }),
    });

    if (res.ok) {
      const data = await res.json();
      setPromoSuccess(data.discount.description);
      setPromoCode("");
    } else {
      const data = await res.json();
      setPromoError(data.error ?? "Erreur lors de l'application du code promo.");
    }

    setPromoLoading(false);
  }

  async function subscribe(planId: string) {
    setCheckingOut(planId);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId, provider: "flouci" }),
    });
    if (res.ok) {
      const data = await res.json();
      window.location.href = data.paymentUrl;
    } else {
      setCheckoutError("Erreur lors du checkout. Veuillez réessayer.");
      setCheckingOut(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-[#0891B2]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm font-medium">Chargement des plans...</span>
        </div>
      </div>
    );
  }

  const isTrial = current?.status === "trial";
  const daysLeft = current?.endsAt
    ? Math.max(0, Math.ceil((new Date(current.endsAt).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Abonnement</h1>
          <p className="text-sm text-gray-500">
            Gérez votre plan Doktori et accédez aux fonctionnalités premium.
          </p>
        </div>
      </div>

      {/* ── Current plan status ── */}
      {current && (
        <div
          className={`rounded-2xl border p-5 flex items-start gap-4 ${
            isTrial
              ? "border-amber-200 bg-amber-50"
              : "border-[#E6F4F1] bg-[#F0FDFA]"
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
              isTrial ? "bg-amber-100 text-amber-600" : "bg-[#0891B2]/10 text-[#0891B2]"
            }`}
          >
            {isTrial ? <Clock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-[#134E4A]">
                {isTrial ? "Essai gratuit" : `Plan ${current.plan}`}
              </span>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                  isTrial
                    ? "bg-amber-100 text-amber-700"
                    : current.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {isTrial ? "Essai" : current.status === "active" ? "Actif" : current.status}
              </span>
            </div>
            {current.endsAt && (
              <p className="text-sm text-gray-600">
                {isTrial ? (
                  <>
                    Votre essai expire le{" "}
                    <strong>{format(new Date(current.endsAt), "d MMMM yyyy", { locale: fr })}</strong>
                    {daysLeft > 0 && (
                      <span className="text-amber-600 font-semibold"> ({daysLeft} jours restants)</span>
                    )}
                    . Choisissez un plan pour continuer sans interruption.
                  </>
                ) : (
                  <>
                    Renouvellement le{" "}
                    <strong>{format(new Date(current.endsAt), "d MMMM yyyy", { locale: fr })}</strong>
                  </>
                )}
              </p>
            )}
            {isTrial && (
              <p className="text-xs text-amber-600 mt-1.5">
                Pendant l&apos;essai, vous avez accès à toutes les fonctionnalités du plan Pro.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Checkout error ── */}
      {checkoutError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{checkoutError}</span>
          </div>
          <button
            onClick={() => setCheckoutError(null)}
            className="text-red-400 hover:text-red-600"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Promo Code ── */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-[#0891B2]" />
          <h2 className="font-semibold text-[#134E4A] text-sm">Code promo</h2>
        </div>

        {promoSuccess && (
          <div className="mb-3 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            Code appliqué ! {promoSuccess}
          </div>
        )}

        {promoError && <p className="mb-3 text-sm text-red-600">{promoError}</p>}

        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase());
              setPromoError(null);
              setPromoSuccess(null);
            }}
            placeholder="Entrez votre code promo"
            className="flex-1 border border-[#E6F4F1] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2] uppercase"
            onKeyDown={(e) => {
              if (e.key === "Enter") applyPromo();
            }}
          />
          <button
            onClick={applyPromo}
            disabled={promoLoading || !promoCode.trim()}
            className="px-5 py-2.5 bg-[#0891B2] text-white rounded-xl text-sm font-bold hover:bg-[#0E7490] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {promoLoading ? "..." : "Appliquer"}
          </button>
        </div>
      </div>

      {/* ── Plans ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isCurrent = current?.plan === plan.id;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${
                isPopular
                  ? "border-[#0891B2] ring-1 ring-[#0891B2]/20"
                  : "border-[#E6F4F1]"
              } ${isCurrent ? "bg-[#F0FDFA]" : "bg-white"}`}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#0891B2] px-3 py-1 text-xs font-bold text-white shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    Recommandé
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  {isPopular ? (
                    <Crown className="h-5 w-5 text-[#0891B2]" />
                  ) : (
                    <Shield className="h-5 w-5 text-[#5E7574]" />
                  )}
                  <h2 className="text-xl font-bold text-[#134E4A]">{plan.name}</h2>
                </div>
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#0891B2]/10 px-2.5 py-1 text-xs font-bold text-[#0891B2]">
                    <CheckCircle2 className="h-3 w-3" />
                    Votre plan
                  </span>
                )}
              </div>

              {/* Description */}
              {plan.description && (
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
              )}

              {/* Price */}
              <div className="mb-5 pb-5 border-b border-gray-100">
                <span className="text-4xl font-black text-[#134E4A]">
                  {plan.priceMillimes / 1000}
                </span>
                <span className="text-gray-500 text-sm"> DT/mois</span>
                <p className="text-xs text-gray-400 mt-1">
                  Soit {((plan.priceMillimes / 1000) * 12 * 0.85).toFixed(0)} DT/an avec -15% annuel
                </p>
              </div>

              {/* Features */}
              <div className="mb-5">
                <p className="text-xs font-bold text-[#134E4A] uppercase tracking-wide mb-3">
                  Inclus dans ce plan
                </p>
                <ul className="space-y-2.5 text-sm">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#0891B2] shrink-0 mt-0.5" />
                      <span className="text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Not included */}
              {plan.notIncluded && plan.notIncluded.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                    Non inclus
                  </p>
                  <ul className="space-y-2 text-sm">
                    {plan.notIncluded.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-gray-400">
                        <X className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Teleconsult note */}
              {plan.teleconsultNote && (
                <div className="mb-5 rounded-xl bg-blue-50 border border-blue-100 p-3.5 text-xs text-blue-700 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                  <span>{plan.teleconsultNote}</span>
                </div>
              )}

              {/* CTA */}
              <Button
                className={`w-full h-12 rounded-xl font-bold text-sm transition-all ${
                  isCurrent
                    ? "bg-[#E6F4F1] text-[#0891B2] cursor-default hover:bg-[#E6F4F1]"
                    : isPopular
                    ? "bg-[#0891B2] hover:bg-[#0E7490] text-white shadow-md shadow-[#0891B2]/20 hover:shadow-lg"
                    : "bg-[#134E4A] hover:bg-[#0e3d38] text-white"
                }`}
                onClick={() => subscribe(plan.id)}
                disabled={isCurrent || checkingOut !== null}
              >
                {isCurrent
                  ? "Plan actuel"
                  : checkingOut === plan.id
                  ? "Redirection vers le paiement..."
                  : `Choisir ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      {/* ── Payment footer ── */}
      <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-sm text-gray-500 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[#134E4A] mb-2">
          <Shield className="h-4 w-4 text-[#0891B2]" />
          Informations de facturation
        </div>
        <ul className="space-y-1.5 text-xs leading-relaxed">
          <li>
            <strong>Paiement sécurisé</strong> via Flouci ou Paymee — vos données bancaires ne sont jamais stockées sur nos serveurs.
          </li>
          <li>
            <strong>Facturation mensuelle</strong> — votre abonnement se renouvelle automatiquement chaque mois.
          </li>
          <li>
            <strong>Annulable à tout moment</strong> — sans frais ni engagement. L&apos;accès reste actif jusqu&apos;à la fin de la période payée.
          </li>
          <li>
            <strong>Essai gratuit de 2 mois</strong> — tous les nouveaux médecins bénéficient de 2 mois d&apos;essai avec accès à toutes les fonctionnalités.
          </li>
          <li>
            <strong>Commissions sur consultations</strong> — le patient paie les téléconsultations (15% de commission Doktori) et interventions SOS (10% de commission). Le reste est crédité sur votre portefeuille Doktori et reversé mensuellement.
          </li>
        </ul>
      </div>
    </div>
  );
}
