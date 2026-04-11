import Link from "next/link";

export default function PaymentFailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
        <div className="text-5xl text-red-600 mb-4">&#x2717;</div>
        <h1 className="text-2xl font-bold mb-2">Paiement échoué</h1>
        <p className="text-gray-500 mb-6">
          Votre rendez-vous reste réservé mais non payé. Vous pourrez régler sur place.
        </p>
        <Link href="/mes-rdv" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
          Voir mes rendez-vous
        </Link>
      </div>
    </div>
  );
}
