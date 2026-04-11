import Link from "next/link";

export default function BillingFailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
        <div className="text-5xl mb-4">&#x2717;</div>
        <h1 className="text-2xl font-bold mb-2">Paiement échoué</h1>
        <p className="text-gray-500 mb-6">Une erreur est survenue. Aucun montant n&apos;a été débité.</p>
        <Link href="/abonnement" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
          Réessayer
        </Link>
      </div>
    </div>
  );
}
