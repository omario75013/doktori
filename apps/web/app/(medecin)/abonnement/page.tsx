"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard, CheckCircle2 } from "lucide-react";

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
