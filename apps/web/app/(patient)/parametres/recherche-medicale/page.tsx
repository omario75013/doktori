"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ShieldCheck,
  Heart,
  Lock,
  Microscope,
  CheckCircle,
  Info,
  X,
} from "lucide-react";

interface Consent {
  granted: boolean;
  scope: string[];
  grantedAt: string | null;
  revokedAt: string | null;
}

export default function RechercheMedicalePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("doktori_patient_session");
    if (!stored) {
      router.push("/connexion-patient");
      return;
    }
    setToken(stored);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    void load(token);
  }, [token]);

  async function load(t: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/me/anonymization-consent", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConsent(data.consent);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(granted: boolean) {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/anonymization-consent", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          granted,
          scope: ["aggregate_stats", "public_health"],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConsent(data.consent);
        toast.success(
          granted
            ? "Merci ! Vous contribuez désormais à la recherche médicale tunisienne."
            : "Votre participation a été retirée."
        );
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/40 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isGranted = !!consent?.granted;

  return (
    <div className="min-h-screen bg-secondary/40">
      <div
        className="px-4 py-8 text-white"
        style={{ background: "linear-gradient(135deg, #0891B2 0%, #134E4A 100%)" }}
      >
        <div className="max-w-2xl mx-auto">
          <a
            href="/parametres"
            className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
          >
            <ChevronLeft className="h-4 w-4" /> Retour aux paramètres
          </a>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
              <Microscope className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-black">Recherche médicale</h1>
              <p className="text-white/70 text-xs mt-0.5">
                Contribuer anonymement à la recherche en Tunisie
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Why */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <Heart className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-bold text-foreground">
                Voulez-vous aider la recherche médicale tunisienne&nbsp;?
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                Vos données médicales (entièrement anonymisées) peuvent
                contribuer à mieux comprendre les maladies les plus fréquentes
                en Tunisie, à améliorer la prévention et à orienter les
                politiques de santé publique.
              </p>
            </div>
          </div>

          {/* Trust pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-foreground/80 flex items-start gap-2">
              <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <strong>100% anonyme</strong>
                <div className="text-gray-500 mt-0.5">
                  Aucun lien direct avec votre identité
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-foreground/80 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <strong>Loi 2004-63</strong>
                <div className="text-gray-500 mt-0.5">
                  Conforme à la législation tunisienne
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-foreground/80 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <strong>Réversible</strong>
                <div className="text-gray-500 mt-0.5">
                  Désactivable à tout moment
                </div>
              </div>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Participer au programme
              </p>
              <p className="text-xs text-gray-500">
                {isGranted
                  ? `Activé depuis le ${new Date(consent!.grantedAt!).toLocaleDateString("fr-FR")}`
                  : "Vous pouvez l'activer ou le désactiver à tout moment"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isGranted}
              disabled={saving}
              onClick={() => handleToggle(!isGranted)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 ${
                isGranted ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  isGranted ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <Info className="h-3.5 w-3.5" />
            En savoir plus
          </button>
        </div>

        {/* Reference */}
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500">
            Référence légale :{" "}
            <a
              href="https://www.inpdp.nat.tn"
              target="_blank"
              rel="noopener"
              className="text-primary hover:underline"
            >
              Loi tunisienne n° 2004-63
            </a>{" "}
            relative à la protection des données à caractère personnel.
          </p>
        </div>
      </div>

      {/* Details modal */}
      {showDetails && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Comment ça marche&nbsp;?</h2>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  <strong className="text-foreground">Anonymisation totale.</strong>{" "}
                  Avant tout partage, votre nom, prénom, téléphone, email,
                  adresse et identifiants sont supprimés. Seules restent des
                  données agrégées comme la tranche d'âge, le sexe, la région et
                  les pathologies.
                </p>
                <p>
                  <strong className="text-foreground">Usages autorisés.</strong>{" "}
                  Les données anonymisées peuvent être utilisées pour&nbsp;:
                </p>
                <ul className="list-disc ps-5 space-y-1">
                  <li>statistiques agrégées de santé publique</li>
                  <li>études cliniques avec partenaires de recherche
                    académiques tunisiens (université de Tunis, Sfax, Sousse,
                    Monastir)</li>
                  <li>amélioration de la prévention</li>
                </ul>
                <p>
                  <strong className="text-foreground">Aucune vente.</strong>{" "}
                  Vos données ne seront jamais vendues à des tiers commerciaux,
                  laboratoires pharmaceutiques privés ou assureurs.
                </p>
                <p>
                  <strong className="text-foreground">Réversibilité.</strong>{" "}
                  Vous pouvez retirer votre consentement à tout moment depuis
                  cette page. Les données déjà anonymisées et utilisées dans
                  des études en cours ne pourront cependant plus être tracées
                  (elles sont anonymes).
                </p>
              </div>
              <Button
                onClick={() => setShowDetails(false)}
                className="w-full bg-primary hover:bg-doktori-teal-dark text-white"
              >
                J'ai compris
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
