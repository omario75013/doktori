"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard, CheckCircle2, Tag } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceMillimes: number;
  features: string[];
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

  if (loading) return <p className="text-[#0891B2] text-sm p-6">Chargement...</p>;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Abonnement</h1>
          <p className="text-sm text-gray-500">Gérez votre plan Doktori et accédez aux fonctionnalités premium.</p>
        </div>
      </div>

      {current && (
        <div className="rounded-2xl border border-[#E6F4F1] bg-[#F0FDFA] p-5 max-w-xl flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-[#0891B2] shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-[#134E4A]">Plan actif : {current.plan}</div>
            {current.endsAt && (
              <div className="text-xs text-[#0891B2] mt-1">
                Valide jusqu&apos;au {format(new Date(current.endsAt), "d MMMM yyyy", { locale: fr })}
              </div>
            )}
          </div>
        </div>
      )}

      {checkoutError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-3xl">
          <span>{checkoutError}</span>
          <button
            onClick={() => setCheckoutError(null)}
            className="ml-4 text-red-400 hover:text-red-600 font-bold"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {/* Promo Code Section */}
      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-5 max-w-xl">
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

        {promoError && (
          <p className="mb-3 text-sm text-red-600">{promoError}</p>
        )}

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
            onKeyDown={(e) => { if (e.key === "Enter") applyPromo(); }}
          />
          <button
            onClick={applyPromo}
            disabled={promoLoading || !promoCode.trim()}
            className="px-4 py-2.5 bg-[#0891B2] text-white rounded-xl text-sm font-bold hover:bg-[#0E7490] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {promoLoading ? "..." : "Appliquer"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {plans.map((plan) => {
          const isCurrent = current?.plan === plan.id;
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md ${
                isCurrent
                  ? "border-[#0891B2] bg-[#F0FDFA]"
                  : "border-[#E6F4F1] bg-white"
              }`}
            >
              <h2 className="text-xl font-bold text-[#134E4A]">{plan.name}</h2>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold text-[#134E4A]">{plan.priceMillimes / 1000}</span>
                <span className="text-gray-500"> DT/mois</span>
              </div>
              <ul className="space-y-2 text-sm mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#0891B2] font-bold">&#x2713;</span>
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full h-12 rounded-xl font-bold transition-colors ${
                  isCurrent
                    ? "bg-[#E6F4F1] text-[#0891B2] cursor-default hover:bg-[#E6F4F1]"
                    : "bg-[#0891B2] hover:bg-[#0E7490] text-white"
                }`}
                onClick={() => subscribe(plan.id)}
                disabled={isCurrent || checkingOut !== null}
              >
                {isCurrent ? "Plan actuel" : checkingOut === plan.id ? "Redirection..." : `Choisir ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Paiement sécurisé via Flouci ou Paymee. Facturation mensuelle, annulable à tout moment.
      </p>
    </div>
  );
}
