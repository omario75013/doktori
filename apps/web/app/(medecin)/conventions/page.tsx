"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { INSURANCES } from "@doktori/shared";
import { Shield } from "lucide-react";

export default function ConventionsPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/doctors/me/insurance")
      .then((r) => r.json())
      .then((data: { insuranceType: string }[]) => {
        setSelected(new Set(data.map((d) => d.insuranceType)));
        setLoading(false);
      });
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/doctors/me/insurance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ insuranceTypes: Array.from(selected) }),
    });
    setSaving(false);
    if (res.ok) setSavedAt(new Date());
  }

  if (loading) return <p className="text-[#0891B2] text-sm p-6">Chargement...</p>;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Conventions & Assurances</h1>
          <p className="text-sm text-gray-500">
            Indiquez les mutuelles et caisses d&apos;assurance maladie que vous acceptez.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6 shadow-sm max-w-xl space-y-4">
        {INSURANCES.map((ins) => (
          <div
            key={ins.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#F0FDFA] transition-colors cursor-pointer"
            onClick={() => toggle(ins.id)}
          >
            <Checkbox
              id={ins.id}
              checked={selected.has(ins.id)}
              onCheckedChange={() => toggle(ins.id)}
            />
            <Label htmlFor={ins.id} className="cursor-pointer flex flex-col">
              <span className="font-medium text-[#134E4A]">{ins.label}</span>
              <span className="text-xs text-gray-400">{ins.labelAr}</span>
            </Label>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-4 border-t border-[#E6F4F1]">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#0891B2] hover:bg-[#0E7490] h-12 rounded-xl font-bold text-white"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          {savedAt && (
            <span className="text-sm text-[#0891B2] font-medium">&#x2713; Enregistré</span>
          )}
        </div>
      </div>
    </div>
  );
}
