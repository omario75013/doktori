"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Coins, Info, AlertTriangle } from "lucide-react";

type Doctor = {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  specialtyLabel: string;
  isGeneraliste: boolean;
  photoUrl: string | null;
  consultationFee: number | null;
  teleconsultFee: number | null;
};

type CnamAct = {
  code: string;
  nameFr: string;
  reimbursementPct: number; // 0-100
  baseFeeTnd: number;
};

type ConsultationType = "cabinet" | "video" | "domicile";
type Insurance = "cnam" | "mutuelle" | "aucune";
type VisitType = "generale" | "specialiste" | "suivi";

function fmtTND(millimes: number): string {
  return `${(millimes / 1000).toFixed(1)} TND`;
}

export default function DevisClient({
  doctor,
  cnamAct,
}: {
  doctor: Doctor;
  cnamAct: CnamAct | null;
}) {
  const [consultationType, setConsultationType] = useState<ConsultationType>("cabinet");
  const [insurance, setInsurance] = useState<Insurance>("cnam");
  const [visitType, setVisitType] = useState<VisitType>(
    doctor.isGeneraliste ? "generale" : "specialiste"
  );

  const result = useMemo(() => {
    // Base fee in millimes
    let base: number;
    if (consultationType === "video") {
      base = doctor.teleconsultFee ?? doctor.consultationFee ?? 0;
    } else if (consultationType === "domicile") {
      base = (doctor.consultationFee ?? 0) + 20000; // +20 TND for home visit
    } else {
      base = doctor.consultationFee ?? 0;
    }

    let coverageRate = 0;
    let coverageLabel = "Aucune couverture";

    if (insurance === "cnam") {
      // Use the actual CNAM nomenclature rate when we have a mapping (item #29).
      // CNAM only reimburses up to base_fee_tnd × reimbursement_pct on the
      // *official* tariff — anything above is "dépassement" out of pocket.
      if (cnamAct) {
        const reimbursementCapMillimes = Math.round(
          cnamAct.baseFeeTnd * 1000 * (cnamAct.reimbursementPct / 100)
        );
        const reimbursed = Math.min(reimbursementCapMillimes, base);
        const outOfPocket = base - reimbursed;
        return {
          base,
          reimbursed,
          outOfPocket,
          coverageRate: cnamAct.reimbursementPct / 100,
          coverageLabel: `CNAM ${cnamAct.code} — ${cnamAct.nameFr} (${cnamAct.reimbursementPct.toFixed(0)}% du tarif officiel ${cnamAct.baseFeeTnd.toFixed(0)} TND)`,
        };
      }
      // Fallback when no CNAM mapping available (shouldn't happen post-seed).
      if (visitType === "generale") {
        coverageRate = 0.7;
        coverageLabel = "CNAM (généraliste, ~70%)";
      } else if (visitType === "specialiste") {
        coverageRate = 0.6;
        coverageLabel = "CNAM (spécialiste, ~60%)";
      } else {
        coverageRate = 0.5;
        coverageLabel = "CNAM (suivi, ~50%)";
      }
    } else if (insurance === "mutuelle") {
      coverageRate = 0.8;
      coverageLabel = "Mutuelle (estimé 80%)";
    }

    const reimbursed = Math.round(base * coverageRate);
    const outOfPocket = base - reimbursed;

    return { base, reimbursed, outOfPocket, coverageRate, coverageLabel };
  }, [consultationType, insurance, visitType, doctor, cnamAct]);

  return (
    <div className="min-h-screen bg-secondary px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center gap-4">
          {doctor.photoUrl ? (
            <Image
              src={doctor.photoUrl}
              alt={doctor.name}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              {doctor.name[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Estimation tarif
            </p>
            <h1 className="font-heading text-xl font-bold text-foreground">Dr. {doctor.name}</h1>
            <p className="text-sm text-muted-foreground">{doctor.specialtyLabel}</p>
          </div>
        </header>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">
              Calcul de votre reste à charge
            </h2>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Sélectionnez vos options pour estimer votre dépense.
          </p>

          {/* Consultation type */}
          <fieldset className="mb-5">
            <legend className="mb-2 text-sm font-bold text-foreground">Type de consultation</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["cabinet", "video", "domicile"] as const).map((t) => (
                <label
                  key={t}
                  className={`cursor-pointer rounded-xl border-2 px-3 py-2.5 text-center text-sm font-medium transition ${
                    consultationType === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ctype"
                    value={t}
                    checked={consultationType === t}
                    onChange={() => setConsultationType(t)}
                    className="sr-only"
                  />
                  {t === "cabinet" ? "Cabinet" : t === "video" ? "Vidéo" : "Domicile"}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Insurance */}
          <fieldset className="mb-5">
            <legend className="mb-2 text-sm font-bold text-foreground">Mon assurance</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["cnam", "mutuelle", "aucune"] as const).map((t) => (
                <label
                  key={t}
                  className={`cursor-pointer rounded-xl border-2 px-3 py-2.5 text-center text-sm font-medium transition ${
                    insurance === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ins"
                    value={t}
                    checked={insurance === t}
                    onChange={() => setInsurance(t)}
                    className="sr-only"
                  />
                  {t === "cnam" ? "CNAM" : t === "mutuelle" ? "Mutuelle" : "Aucune"}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Visit type */}
          <fieldset className="mb-6">
            <legend className="mb-2 text-sm font-bold text-foreground">Type de visite</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["generale", "specialiste", "suivi"] as const).map((t) => (
                <label
                  key={t}
                  className={`cursor-pointer rounded-xl border-2 px-3 py-2.5 text-center text-sm font-medium transition ${
                    visitType === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="vtype"
                    value={t}
                    checked={visitType === t}
                    onChange={() => setVisitType(t)}
                    className="sr-only"
                  />
                  {t === "generale" ? "Générale" : t === "specialiste" ? "Spécialiste" : "Suivi"}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Result */}
          <div className="space-y-3 rounded-xl bg-secondary/40 p-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tarif consultation</span>
              <span className="font-bold text-foreground">{fmtTND(result.base)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{result.coverageLabel} rembourse</span>
              <span className="font-bold text-doktori-green-dark">−{fmtTND(result.reimbursed)}</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Reste à votre charge</span>
                <span className="font-heading text-2xl font-black text-primary">
                  {fmtTND(result.outOfPocket)}
                </span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
            <p className="text-xs leading-relaxed text-yellow-900">
              <strong>Estimation indicative</strong> — confirmez avec votre caisse (CNAM ou mutuelle) le taux exact de remboursement applicable à votre dossier.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/rdv/${doctor.slug}`}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-doktori-teal-dark"
            >
              Réserver un rendez-vous
            </Link>
            <Link
              href={`/medecin/${doctor.slug}`}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-white px-6 py-3 text-sm font-bold text-foreground hover:border-primary"
            >
              Retour au profil
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 px-4 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Les taux CNAM affichés sont indicatifs (~70% généraliste, ~35% spécialiste). Les pourcentages réels dépendent de votre filière (médecin de famille, APCI…), du dépassement d'honoraires et de votre dossier individuel.
          </p>
        </div>
      </div>
    </div>
  );
}
