"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type PaymentState = "verifying" | "paid" | "pending";

function PaymentSuccessContent() {
  const params = useSearchParams();
  const apptId = params.get("appt");

  const [state, setState] = useState<PaymentState>("verifying");

  useEffect(() => {
    if (!apptId) return;

    let attempts = 0;
    const maxAttempts = 5;
    const intervalMs = 2000;

    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status?appt=${encodeURIComponent(apptId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === "paid") {
            setState("paid");
            return;
          }
        }
      } catch {
        // network error — keep polling
      }

      attempts++;
      if (attempts >= maxAttempts) {
        setState("pending");
      }
    };

    // First poll immediately, then every intervalMs
    poll();
    const timer = setInterval(async () => {
      if (state === "paid") {
        clearInterval(timer);
        return;
      }
      await poll();
      if (attempts >= maxAttempts) clearInterval(timer);
    }, intervalMs);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptId]);

  if (state === "paid") {
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

  if (state === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
          <div className="text-5xl text-yellow-500 mb-4">&#x23F3;</div>
          <h1 className="text-2xl font-bold mb-2">Vérification en cours</h1>
          <p className="text-gray-500 mb-6">
            Votre paiement est en cours de traitement. Vous recevrez une confirmation par SMS dès que le paiement sera validé.
          </p>
          <Link href="/mes-rdv" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
            Voir mes rendez-vous
          </Link>
        </div>
      </div>
    );
  }

  // verifying state
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
        <div className="text-5xl text-blue-500 mb-4 animate-spin inline-block">&#x21BB;</div>
        <h1 className="text-2xl font-bold mb-2">Paiement en cours de vérification...</h1>
        <p className="text-gray-500">
          Veuillez patienter pendant que nous confirmons votre paiement.
        </p>
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
