"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stethoscope, UserCog } from "lucide-react";

const ROLE_KEY = "doktori.role";

const LOGIN_URLS: Record<string, string> = {
  doctor: "/connexion",
  secretary: "/secretaire-login",
};

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="h-8 w-8 rounded-full border-[3px] border-teal-500 border-t-transparent animate-spin" />
    </div>
  );
}

export default function AppPickerPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PickerInner />
    </Suspense>
  );
}

function PickerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const forcePick = params.get("picker") === "1";
    let stored: string | null = null;
    try {
      localStorage.setItem("doktori.app", "desktop");
      stored = localStorage.getItem(ROLE_KEY);
    } catch {
      /* storage disabled */
    }
    if (stored && !forcePick) {
      const path = LOGIN_URLS[stored] ?? LOGIN_URLS.doctor;
      router.replace(`${path}?app=desktop&role=${stored}`);
      return;
    }
    setReady(true);
  }, [params, router]);

  function choose(role: "doctor" | "secretary") {
    try {
      localStorage.setItem(ROLE_KEY, role);
      localStorage.setItem("doktori.app", "desktop");
    } catch {
      /* ignore */
    }
    window.location.href = `${LOGIN_URLS[role]}?app=desktop&role=${role}`;
  }

  if (!ready) return <Spinner />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 space-y-6 border border-border">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-black text-lg">
            D
          </span>
          <span className="text-xl font-bold">
            Doktori<span className="text-teal-600">.tn</span>
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Bienvenue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez votre type de compte pour continuer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => choose("doctor")}
            className="flex flex-col items-center text-center gap-2 rounded-2xl border-2 border-gray-200 bg-white dark:bg-slate-800 p-6 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all cursor-pointer"
          >
            <span className="h-14 w-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Stethoscope className="h-7 w-7" strokeWidth={2} />
            </span>
            <span className="text-base font-bold">Médecin</span>
            <span className="text-[11px] text-gray-500 leading-tight">
              Agenda, dossiers patients, téléconsult, réseau
            </span>
          </button>

          <button
            type="button"
            onClick={() => choose("secretary")}
            className="flex flex-col items-center text-center gap-2 rounded-2xl border-2 border-gray-200 bg-white dark:bg-slate-800 p-6 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all cursor-pointer"
          >
            <span className="h-14 w-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <UserCog className="h-7 w-7" strokeWidth={2} />
            </span>
            <span className="text-base font-bold">Secrétaire</span>
            <span className="text-[11px] text-gray-500 leading-tight">
              Prise de RDV, accueil, congés, messagerie
            </span>
          </button>
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          Vous pourrez changer de rôle à tout moment via le menu profil (après connexion).
        </p>
      </div>
    </div>
  );
}
