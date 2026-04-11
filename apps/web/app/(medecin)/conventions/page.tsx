"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { INSURANCES } from "@doktori/shared";

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

  if (loading) return <p className="text-gray-400">Chargement...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Conventions & Assurances</h1>
      <p className="text-gray-500 mb-6">
        Indiquez les mutuelles et caisses d&apos;assurance maladie que vous acceptez. Les patients pourront filtrer leur recherche par assurance.
      </p>

      <div className="bg-white rounded-xl border p-6 max-w-xl space-y-4">
        {INSURANCES.map((ins) => (
          <div key={ins.id} className="flex items-center gap-3">
            <Checkbox
              id={ins.id}
              checked={selected.has(ins.id)}
              onCheckedChange={() => toggle(ins.id)}
            />
            <Label htmlFor={ins.id} className="cursor-pointer flex flex-col">
              <span className="font-medium">{ins.label}</span>
              <span className="text-xs text-gray-400">{ins.labelAr}</span>
            </Label>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          {savedAt && <span className="text-sm text-green-600">✓ Enregistré</span>}
        </div>
      </div>
    </div>
  );
}
