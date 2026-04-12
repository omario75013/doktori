"use client";

import { useState } from "react";
import { Building2, Video, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ConsultationMode = "cabinet" | "teleconsult" | "both";

interface TeleconsultSettingsProps {
  initialMode: ConsultationMode;
  initialTeleconsultFee: number | null;
  consultationFee: number | null;
}

interface ModeCard {
  id: ConsultationMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  selectedBorderClass: string;
  selectedBgClass: string;
}

const MODE_CARDS: ModeCard[] = [
  {
    id: "cabinet",
    label: "Cabinet uniquement",
    description: "Consultations en présentiel dans votre cabinet.",
    icon: <Building2 className="w-8 h-8" />,
    selectedBorderClass: "border-teal-500",
    selectedBgClass: "bg-teal-50",
  },
  {
    id: "teleconsult",
    label: "Téléconsultation uniquement",
    description:
      "Idéal si vous exercez depuis l'étranger. Consultez vos patients en vidéo.",
    icon: <Video className="w-8 h-8" />,
    selectedBorderClass: "border-purple-500",
    selectedBgClass: "bg-purple-50",
  },
  {
    id: "both",
    label: "Les deux",
    description: "Proposez le choix à vos patients.",
    icon: (
      <span className="flex items-center gap-1">
        <Building2 className="w-6 h-6" />
        <Video className="w-6 h-6" />
      </span>
    ),
    selectedBorderClass: "border-indigo-500",
    selectedBgClass: "bg-gradient-to-br from-teal-50 to-purple-50",
  },
];

export function TeleconsultSettings({
  initialMode,
  initialTeleconsultFee,
  consultationFee,
}: TeleconsultSettingsProps) {
  const [mode, setMode] = useState<ConsultationMode>(initialMode);
  const [useSameFee, setUseSameFee] = useState(initialTeleconsultFee === null);
  const [teleconsultFee, setTeleconsultFee] = useState<string>(
    initialTeleconsultFee !== null
      ? String(initialTeleconsultFee / 1000)
      : consultationFee !== null
        ? String(consultationFee / 1000)
        : ""
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setToast(null);

    const feeInMillimes =
      useSameFee || mode === "cabinet"
        ? null
        : Math.round(parseFloat(teleconsultFee) * 1000);

    if (!useSameFee && mode !== "cabinet") {
      const parsed = parseFloat(teleconsultFee);
      if (isNaN(parsed) || parsed < 0) {
        setToast({ type: "error", message: "Tarif invalide." });
        setSaving(false);
        return;
      }
    }

    const res = await fetch("/api/doctor/teleconsult-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consultationMode: mode,
        teleconsultFee: feeInMillimes,
      }),
    });

    setSaving(false);

    if (res.ok) {
      setToast({ type: "success", message: "Paramètres sauvegardés avec succès." });
      setTimeout(() => setToast(null), 4000);
    } else {
      const data = await res.json().catch(() => ({}));
      setToast({ type: "error", message: data.error ?? "Erreur lors de la sauvegarde." });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Mode selector */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Mode de consultation</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODE_CARDS.map((card) => {
            const selected = mode === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setMode(card.id)}
                className={`
                  flex flex-col items-center justify-center gap-3 h-32 rounded-xl border-2 p-4
                  text-center transition-all cursor-pointer
                  ${selected
                    ? `${card.selectedBorderClass} ${card.selectedBgClass}`
                    : "border-gray-200 bg-white hover:border-gray-300"
                  }
                `}
              >
                <span className={selected ? "text-gray-800" : "text-gray-400"}>
                  {card.icon}
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${selected ? "text-gray-900" : "text-gray-700"}`}>
                    {card.label}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5 leading-snug">
                    {card.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Helper info when teleconsult is active */}
      {(mode === "teleconsult" || mode === "both") && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">
          Vos créneaux horaires restent gérés dans l&apos;Agenda. La téléconsultation
          utilise les mêmes horaires que vos consultations.
        </div>
      )}

      {/* Fee section */}
      {(mode === "teleconsult" || mode === "both") && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <p className="text-sm font-medium text-gray-700">Tarif téléconsultation (DT)</p>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useSameFee}
              onChange={(e) => setUseSameFee(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Même tarif que la consultation au cabinet
            {consultationFee !== null && (
              <span className="text-gray-400">
                ({consultationFee / 1000} DT)
              </span>
            )}
          </label>

          {!useSameFee && (
            <div>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={teleconsultFee}
                onChange={(e) => setTeleconsultFee(e.target.value)}
                placeholder="Ex: 50"
                className="w-40"
              />
            </div>
          )}

          {/* Commission info */}
          <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 text-xs text-purple-700 leading-relaxed">
            Doktori prend une commission de 15% sur chaque téléconsultation pour
            couvrir les frais de la plateforme et le traitement des paiements.
          </div>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-teal-600 hover:bg-teal-700 text-white"
      >
        {saving ? "Sauvegarde..." : "Enregistrer"}
      </Button>
    </div>
  );
}
