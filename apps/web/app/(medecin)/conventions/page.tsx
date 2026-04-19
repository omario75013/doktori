"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { INSURANCES } from "@doktori/shared";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    if (res.ok) {
      setSavedAt(new Date());
      toast.success("Conventions enregistrées");
    } else {
      toast.error("Erreur lors de l'enregistrement");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-primary">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conventions & Assurances</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Indiquez les mutuelles et caisses d&apos;assurance maladie que vous acceptez.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-gray-900 p-6 shadow-sm max-w-xl space-y-4">
        {INSURANCES.map((ins) => (
          <div
            key={ins.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary transition-colors cursor-pointer"
            onClick={() => toggle(ins.id)}
          >
            <Checkbox
              id={ins.id}
              checked={selected.has(ins.id)}
              onCheckedChange={() => toggle(ins.id)}
            />
            <Label htmlFor={ins.id} className="cursor-pointer flex flex-col">
              <span className="font-medium text-foreground">{ins.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{ins.labelAr}</span>
            </Label>
          </div>
        ))}

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-primary hover:bg-doktori-teal-dark h-12 rounded-xl font-bold text-white"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          {savedAt && (
            <span className="text-sm text-primary font-medium">&#x2713; Enregistré</span>
          )}
        </div>
      </div>
    </div>
  );
}
