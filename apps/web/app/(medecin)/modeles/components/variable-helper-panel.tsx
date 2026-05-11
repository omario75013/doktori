"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

type VariableGroup = {
  label: string;
  vars: { name: string; label: string }[];
};

const VARIABLE_GROUPS: VariableGroup[] = [
  {
    label: "Patient",
    vars: [
      { name: "first_name", label: "Prénom" },
      { name: "last_name", label: "Nom" },
      { name: "full_name", label: "Nom complet" },
      { name: "age", label: "Âge" },
      { name: "age_at_appointment", label: "Âge (RDV)" },
      { name: "dob", label: "Date naissance" },
      { name: "phone", label: "Téléphone" },
      { name: "cin", label: "CIN" },
      { name: "weight", label: "Poids (kg)" },
      { name: "height", label: "Taille (cm)" },
      { name: "blood_type", label: "Groupe sanguin" },
      { name: "allergies", label: "Allergies" },
      { name: "insurance", label: "Assurance" },
    ],
  },
  {
    label: "Médecin",
    vars: [
      { name: "doctor_name", label: "Nom médecin" },
      { name: "doctor_specialty", label: "Spécialité" },
      { name: "doctor_city", label: "Ville" },
      { name: "doctor_phone", label: "Tél. médecin" },
      { name: "doctor_address", label: "Adresse" },
      { name: "doctor_registration", label: "N° inscription" },
    ],
  },
  {
    label: "Rendez-vous",
    vars: [
      { name: "appointment_date", label: "Date RDV" },
      { name: "appointment_type", label: "Type RDV" },
    ],
  },
  {
    label: "Date / heure",
    vars: [
      { name: "today", label: "Aujourd'hui (court)" },
      { name: "today_long", label: "Aujourd'hui (long)" },
      { name: "time", label: "Heure" },
    ],
  },
];

function copyVar(name: string) {
  navigator.clipboard.writeText(`{{${name}}}`).then(() => {
    toast.success(`{{${name}}} copié`);
  });
}

export function VariableHelperPanel() {
  return (
    <div className="ds-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Variables disponibles</h3>
        <p className="text-xs text-gray-400 mt-0.5">Cliquez pour copier</p>
      </div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {VARIABLE_GROUPS.map((group) => (
          <div key={group.label} className="px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.vars.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => copyVar(v.name)}
                  className="w-full flex items-center justify-between rounded-md px-2 py-1 text-left hover:bg-gray-50 group transition-colors"
                >
                  <span className="text-xs text-gray-600 truncate mr-2">{v.label}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <code className="text-[10px] bg-cyan-50 text-cyan-700 rounded px-1 font-mono">
                      {`{{${v.name}}}`}
                    </code>
                    <Copy className="size-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
