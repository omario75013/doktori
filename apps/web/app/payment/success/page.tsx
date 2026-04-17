"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Calendar, Clock, Video, ArrowRight, Home } from "lucide-react";

type PaymentState = "verifying" | "paid" | "pending";

function VerifyingState() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-600 via-cyan-700 to-teal-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-6"
        />
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          Vérification en cours…
        </h1>
        <p className="text-gray-500 text-sm">
          Veuillez patienter pendant que nous confirmons votre paiement.
        </p>
      </motion.div>
    </div>
  );
}

function PendingState({ apptId }: { apptId: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Vérification en cours
        </h1>
        <p className="text-gray-500 mb-2">
          Votre paiement est en cours de traitement.
        </p>
        <p className="text-gray-500 mb-6 text-sm">
          Vous recevrez une confirmation par SMS dès que le paiement sera validé.
        </p>
        {apptId && (
          <p className="text-xs text-gray-400 mb-6 font-mono bg-gray-50 rounded-lg px-3 py-2">
            Référence : {apptId}
          </p>
        )}
        <Link
          href="/mes-rdv"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 transition-colors text-white px-6 py-3 rounded-xl font-semibold shadow-md"
        >
          Voir mes rendez-vous
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  );
}

function PaidState({ apptId, isVideo }: { apptId: string | null; isVideo: boolean }) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { default: confetti } = await import("canvas-confetti");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#0891B2", "#22C55E", "#F59E0B"],
        });
      } catch {
        // canvas-confetti not available — continue without confetti
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-600 via-cyan-700 to-teal-800">
      <div className="w-full max-w-md space-y-4">
        {/* Checkmark circle */}
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        >
          <div className="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 px-8 pt-8 pb-6 text-center border-b border-gray-100">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-gray-900 mb-1"
            >
              Rendez-vous confirmé !
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="text-gray-500 text-sm"
            >
              Votre rendez-vous est garanti. Vous recevrez un SMS de rappel la veille.
            </motion.p>
          </div>

          {/* Appointment details card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
            className="px-8 py-6 space-y-4"
          >
            {/* Appointment type badge */}
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-teal-200">
                <Calendar className="w-3.5 h-3.5" />
                Consultation médicale
              </span>
              {isVideo && (
                <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-purple-200">
                  <Video className="w-3.5 h-3.5" />
                  Vidéo
                </span>
              )}
            </div>

            {/* Reference */}
            {apptId && (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Référence du rendez-vous</p>
                <p className="text-sm font-mono font-semibold text-gray-700 break-all">
                  {apptId}
                </p>
              </div>
            )}

            {/* Teleconsult note */}
            {isVideo && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                <Video className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-sm text-purple-700 font-medium">
                  Vous recevrez un lien vidéo par SMS avant votre consultation.
                </p>
              </div>
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
              href="/mes-rdv"
              className="flex items-center justify-center gap-2 w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 transition-colors text-white px-6 py-3.5 rounded-xl font-semibold shadow-md shadow-teal-200"
            >
              Voir mes rendez-vous
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full text-gray-500 hover:text-gray-700 transition-colors text-sm py-2"
            >
              <Home className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function PaymentSuccessContent() {
  const params = useSearchParams();
  const apptId = params.get("appt");
  const isVideo = params.get("type") === "video" || params.get("type") === "teleconsult";

  const [state, setState] = useState<PaymentState>("verifying");

  useEffect(() => {
    if (!apptId) {
      // No appointment ID — show success anyway (graceful fallback)
      setState("paid");
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;
    const intervalMs = 2000;
    let stopped = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status?appt=${encodeURIComponent(apptId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === "paid") {
            setState("paid");
            stopped = true;
            return;
          }
        }
      } catch {
        // network error — keep polling
      }

      attempts++;
      if (attempts >= maxAttempts) {
        setState("pending");
        stopped = true;
      }
    };

    poll();
    const timer = setInterval(async () => {
      if (stopped) {
        clearInterval(timer);
        return;
      }
      await poll();
    }, intervalMs);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [apptId]);

  if (state === "paid") {
    return <PaidState apptId={apptId} isVideo={isVideo} />;
  }

  if (state === "pending") {
    return <PendingState apptId={apptId} />;
  }

  return <VerifyingState />;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-600 via-cyan-700 to-teal-800">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
