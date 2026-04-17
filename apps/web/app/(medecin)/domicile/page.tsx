"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Home } from "lucide-react";

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

  if (loading) return <p className="text-[#0891B2] text-sm p-6">Chargement...</p>;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Visites à domicile</h1>
          <p className="text-sm text-gray-500">Acceptez les demandes de consultation à domicile avec votre propre tarif et rayon.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6 shadow-sm max-w-xl space-y-6">
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#F0FDFA] transition-colors cursor-pointer"
          onClick={() => setIsAvailable((v) => !v)}
        >
          <Checkbox
            id="available"
            checked={isAvailable}
            onCheckedChange={(v) => setIsAvailable(Boolean(v))}
          />
          <Label htmlFor="available" className="cursor-pointer font-medium text-[#134E4A]">
            J&apos;accepte les visites à domicile
          </Label>
        </div>

        <div className={isAvailable ? "" : "opacity-40 pointer-events-none"}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="radius" className="text-[#134E4A] font-medium">Rayon de déplacement (km)</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={30}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2] mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Distance maximale depuis votre cabinet</p>
            </div>

            <div>
              <Label htmlFor="fee" className="text-[#134E4A] font-medium">Tarif de la visite (DT)</Label>
              <Input
                id="fee"
                type="number"
                min={20}
                max={500}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2] mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Tarif total facturé au patient. Doktori prélève une commission de 10%.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-[#E6F4F1]">
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
