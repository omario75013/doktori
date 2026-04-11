"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function PaymentSuccessContent() {
  const params = useSearchParams();
  const apptId = params.get("appt");
  const ref = params.get("ref");

  useEffect(() => {
    if (apptId) {
      fetch("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: apptId, payment_id: ref }),
      });
    }
  }, [apptId, ref]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
        <div className="text-5xl text-green-600 mb-4">&#x2713;</div>
        <h1 className="text-2xl font-bold mb-2">Paiement confirmé</h1>
        <p className="text-gray-500 mb-6">
          Votre rendez-vous est garanti. Vous recevrez un SMS de rappel la veille.
        </p>
        <Link href="/mes-rdv" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
          Voir mes rendez-vous
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Chargement...</p></div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
