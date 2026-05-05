import type { Metadata } from "next";
import { db, cnamActs } from "@doktori/db";
import { asc } from "drizzle-orm";
import TarifsClient from "./tarifs-client";

export const metadata: Metadata = {
  title: "Tarifs CNAM Tunisie — Nomenclature & remboursements | Doktori",
  description:
    "Consultez les tarifs CNAM Tunisie : consultation, imagerie, biologie, dentaire. Tarifs officiels en TND et taux de remboursement par acte.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://doktori.tn/tarifs" },
  openGraph: {
    title: "Tarifs CNAM Tunisie — Nomenclature & remboursements",
    description:
      "Tarifs officiels en TND et taux de remboursement par acte CNAM.",
    url: "https://doktori.tn/tarifs",
    siteName: "Doktori",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tarifs CNAM Tunisie — Nomenclature & remboursements",
    description:
      "Tarifs officiels en TND et taux de remboursement par acte CNAM.",
  },
};

export const revalidate = 3600; // 1 hour

export default async function TarifsPage() {
  const acts = await db
    .select({
      code: cnamActs.code,
      nameFr: cnamActs.nameFr,
      nameAr: cnamActs.nameAr,
      baseFeeTnd: cnamActs.baseFeeTnd,
      reimbursementPct: cnamActs.reimbursementPct,
      category: cnamActs.category,
      displayOrder: cnamActs.displayOrder,
    })
    .from(cnamActs)
    .orderBy(asc(cnamActs.displayOrder), asc(cnamActs.code));

  const rows = acts.map((a) => ({
    code: a.code,
    nameFr: a.nameFr,
    nameAr: a.nameAr,
    baseFeeTnd: Number(a.baseFeeTnd),
    reimbursementPct: Number(a.reimbursementPct),
    category: a.category ?? "autre",
  }));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-teal-600">
          Nomenclature CNAM Tunisia
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-black text-slate-900">
          Tarifs CNAM & remboursements
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-3xl">
          Tarifs officiels CNAM en dinars tunisiens (TND) avec taux de remboursement par acte
          médical. Consultez le reste à charge avant votre rendez-vous.
        </p>
      </header>

      <TarifsClient rows={rows} />

      <section className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-bold text-amber-900 mb-2">Avertissement</h2>
        <p className="text-sm text-amber-800">
          Ces tarifs sont à titre indicatif. Le remboursement réel dépend de votre filière CNAM
          (médecin de famille, APCI, conventionné, etc.), de votre dossier individuel et des
          dépassements d&apos;honoraires éventuels du praticien. Confirmez avec votre caisse pour
          un devis exact.
        </p>
      </section>
    </main>
  );
}
