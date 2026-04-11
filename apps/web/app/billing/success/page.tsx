"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function BillingSuccessContent() {
  const params = useSearchParams();
  const subId = params.get("sub");
  const ref = params.get("ref");

  useEffect(() => {
    // Notify our webhook (works in dev mode because it just marks active)
    if (subId) {
      fetch("/api/billing/webhook/flouci", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: subId, payment_id: ref }),
      });
    }
  }, [subId, ref]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
        <div className="text-5xl mb-4">&#x2713;</div>
        <h1 className="text-2xl font-bold mb-2">Paiement réussi</h1>
        <p className="text-gray-500 mb-6">Votre abonnement Doktori est maintenant actif.</p>
        <Link href="/dashboard" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
          Accéder au dashboard
        </Link>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Chargement...</p></div>}>
      <BillingSuccessContent />
    </Suspense>
  );
}
