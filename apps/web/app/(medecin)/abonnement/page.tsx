"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
      alert("Erreur lors du checkout");
      setCheckingOut(null);
    }
  }

  if (loading) return <p className="text-gray-400">Chargement...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Abonnement</h1>
      <p className="text-gray-500 mb-6">Gérez votre plan Doktori et accédez aux fonctionnalités premium.</p>

      {current && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 max-w-xl">
          <div className="text-sm font-semibold text-green-800">Plan actif : {current.plan}</div>
          {current.endsAt && (
            <div className="text-xs text-green-700 mt-1">
              Valide jusqu&apos;au {format(new Date(current.endsAt), "d MMMM yyyy", { locale: fr })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {plans.map((plan) => {
          const isCurrent = current?.plan === plan.id;
          return (
            <div key={plan.id} className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold">{plan.priceMillimes / 1000}</span>
                <span className="text-gray-500"> DT/mois</span>
              </div>
              <ul className="space-y-2 text-sm mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-600">&#x2713;</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={() => subscribe(plan.id)}
                disabled={isCurrent || checkingOut !== null}
              >
                {isCurrent ? "Plan actuel" : checkingOut === plan.id ? "..." : `Choisir ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Paiement sécurisé via Flouci ou Paymee. Facturation mensuelle, annulable à tout moment.
      </p>
    </div>
  );
}
