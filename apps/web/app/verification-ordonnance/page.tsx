import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, XCircle, ShieldCheck } from "lucide-react";
import { SPECIALTIES } from "@doktori/shared";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Vérification d'ordonnance — Doktori",
  description: "Vérifiez l'authenticité d'une ordonnance médicale émise via Doktori.",
  robots: { index: false, follow: false },
};

interface VerifyResult {
  valid: boolean;
  doctorName?: string;
  doctorSpecialty?: string;
  patientName?: string;
  date?: string;
  content?: string;
  error?: string;
}

async function verifyToken(token: string): Promise<VerifyResult> {
  try {
    const res = await fetch(
      `https://doktori.tn/api/prescriptions/verify?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { valid: false };
    return (await res.json()) as VerifyResult;
  } catch {
    return { valid: false };
  }
}

export default async function VerificationOrdonnancePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="min-h-screen bg-secondary flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-sm p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">
            Vérification d&apos;ordonnance
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Cette page permet de vérifier l&apos;authenticité d&apos;une ordonnance médicale émise via Doktori. Scannez le QR code présent sur l&apos;ordonnance pour être redirigé ici automatiquement.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-doktori-teal-dark transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    );
  }

  const result = await verifyToken(token);

  const specialtyLabel = result.doctorSpecialty
    ? (SPECIALTIES.find((s) => s.id === result.doctorSpecialty)?.label ?? result.doctorSpecialty)
    : null;

  const formattedDate = result.date
    ? format(new Date(result.date), "d MMMM yyyy", { locale: fr })
    : null;

  return (
    <main className="min-h-screen bg-secondary flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {result.valid ? (
          <div className="bg-white rounded-2xl border-2 border-green-400 shadow-sm overflow-hidden">
            <div className="bg-green-50 px-6 py-5 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
              <div>
                <h1 className="text-xl font-black text-green-800">Ordonnance vérifiée</h1>
                <p className="text-sm text-green-600">Cette ordonnance est authentique.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Médecin</p>
                  <p className="text-sm font-bold text-foreground">{result.doctorName}</p>
                  {specialtyLabel && (
                    <p className="text-xs text-primary">{specialtyLabel}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Patient</p>
                  <p className="text-sm font-bold text-foreground">{result.patientName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Date</p>
                  <p className="text-sm font-bold text-foreground">{formattedDate}</p>
                </div>
              </div>

              {result.content && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contenu</p>
                  <div className="bg-secondary rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {result.content}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Vérification effectuée via{" "}
                  <span className="font-bold text-primary">Doktori.tn</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-red-300 shadow-sm overflow-hidden">
            <div className="bg-red-50 px-6 py-5 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <h1 className="text-xl font-black text-red-800">Ordonnance non trouvée</h1>
                <p className="text-sm text-red-600">
                  Ce QR code ne correspond à aucune ordonnance valide dans notre système.
                </p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Cela peut signifier que l&apos;ordonnance a été falsifiée ou que le QR code est endommagé. Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter le médecin directement.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-doktori-teal-dark transition-colors"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
