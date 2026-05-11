"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Home, Loader2, CheckCircle2, MapPin, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function DomicilePage() {
  const t = useTranslations("medecin.domicile");
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
    if (res.ok) {
      setSavedAt(new Date());
      toast.success("Paramètres de visite à domicile enregistrés");
    } else {
      toast.error("Erreur lors de l'enregistrement");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-primary">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">{t("loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("pageTitle")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("pageSubtitle")}</p>
        </div>
      </div>

      <div className="ds-card p-6 shadow-sm space-y-6">
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary transition-colors cursor-pointer"
          onClick={() => setIsAvailable((v) => !v)}
        >
          <Checkbox
            id="available"
            checked={isAvailable}
            onCheckedChange={(v) => setIsAvailable(Boolean(v))}
          />
          <Label htmlFor="available" className="cursor-pointer font-medium text-foreground">
            {t("acceptCheckbox")}
          </Label>
        </div>

        <div className={isAvailable ? "" : "opacity-40 pointer-events-none"}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="radius" className="text-foreground font-medium">{t("radiusLabel")}</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={30}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="h-12 rounded-xl border-border focus-visible:ring-primary mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("radiusHint")}</p>
            </div>

            <div>
              <Label htmlFor="fee" className="text-foreground font-medium">{t("feeLabel")}</Label>
              <Input
                id="fee"
                type="number"
                min={20}
                max={500}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="h-12 rounded-xl border-border focus-visible:ring-primary mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("feeHint")}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-primary hover:bg-doktori-teal-dark h-12 rounded-xl font-bold text-white"
          >
            {saving ? t("savingButton") : t("saveButton")}
          </Button>
          {savedAt && (
            <span className="text-sm text-primary font-medium">{t("savedConfirmation")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
