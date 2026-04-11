"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function DomicilePage() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [fee, setFee] = useState(80); // in DT
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/home-visit/settings")
      .then((r) => r.json())
      .then((data) => {
        setIsAvailable(data.isAvailable || false);
        setRadiusKm(data.radiusKm || 5);
        setFee((data.fee || 80000) / 1000);
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/home-visit/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable, radiusKm, fee: fee * 1000 }),
    });
    setSaving(false);
    if (res.ok) setSavedAt(new Date());
  }

  if (loading) return <p className="text-gray-400">Chargement...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Visites à domicile</h1>
      <p className="text-gray-500 mb-6">Acceptez les demandes de consultation à domicile avec votre propre tarif et rayon.</p>

      <div className="bg-white rounded-xl border p-6 max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Checkbox id="available" checked={isAvailable} onCheckedChange={(v) => setIsAvailable(Boolean(v))} />
          <Label htmlFor="available" className="cursor-pointer">J'accepte les visites à domicile</Label>
        </div>

        <div className={isAvailable ? "" : "opacity-40 pointer-events-none"}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="radius">Rayon de déplacement (km)</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={30}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">Distance maximale depuis votre cabinet</p>
            </div>

            <div>
              <Label htmlFor="fee">Tarif de la visite (DT)</Label>
              <Input
                id="fee"
                type="number"
                min={20}
                max={500}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">Tarif total facturé au patient. Doktori prélève une commission de 10%.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          {savedAt && <span className="text-sm text-green-600">✓ Enregistré</span>}
        </div>
      </div>
    </div>
  );
}
