"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { XCircle, RefreshCw, MessageCircle, ArrowLeft, Phone, Mail } from "lucide-react";

function PaymentFailContent() {
  const params = useSearchParams();
  const apptId = params.get("appt");

  // Reconstruct the booking URL for the retry CTA.
  // If we have the appointment ID, link back to its payment page;
  // otherwise fall back to the home search.
  const retryHref = apptId ? `/mes-rdv` : "/";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      <div className="w-full max-w-md space-y-4">
        {/* X circle */}
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        >
          <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-red-100">
            <XCircle className="w-14 h-14 text-red-500" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-8 pt-8 pb-6 text-center border-b border-gray-100">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              Paiement non abouti
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="text-gray-500 text-sm leading-relaxed"
            >
              Aucun montant n&apos;a été débité.{" "}
              <span className="font-medium text-gray-700">
                Vous pouvez réessayer à tout moment.
              </span>
            </motion.p>
          </div>

          {/* Reassurance block */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="px-8 py-6"
          >
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 leading-relaxed">
              <p className="font-semibold mb-1">Que s&apos;est-il passé ?</p>
              <p className="text-amber-700">
                Le paiement a été interrompu ou refusé par votre banque. Votre rendez-vous reste
                en attente — relancez le paiement pour le confirmer.
              </p>
            </div>

            {apptId && (
              <p className="text-xs text-gray-400 mt-4 text-center font-mono bg-gray-50 rounded-lg px-3 py-2">
                Référence : {apptId}
              </p>
            )}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="px-8 pb-8 space-y-3"
          >
            <Link
              href={retryHref}
              className="flex items-center justify-center gap-2 w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors text-white px-6 py-3.5 rounded-xl font-semibold shadow-md shadow-teal-100"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer le paiement
            </Link>

            <a
              href="mailto:support@doktori.tn"
              className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-gray-600 px-6 py-3.5 rounded-xl font-medium text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Contacter le support
            </a>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full text-gray-400 hover:text-gray-600 transition-colors text-sm py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          </motion.div>

          {/* Support contact footer */}
          <div className="border-t border-gray-100 px-8 py-5 bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-400 text-center mb-3 font-medium uppercase tracking-wide">
              Besoin d&apos;aide ?
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <a
                href="mailto:support@doktori.tn"
                className="flex items-center gap-1.5 hover:text-teal-600 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                support@doktori.tn
              </a>
              <a
                href="tel:+21671000000"
                className="flex items-center gap-1.5 hover:text-teal-600 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                71 000 000
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
          <div className="w-10 h-10 border-4 border-red-300 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentFailContent />
    </Suspense>
  );
}
