"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Plus } from "lucide-react";

interface AppointmentType {
  id: string;
  name: string;
  durationMinutes: number;
  fee: number | null;
  color: string;
  isActive: boolean;
}

export default function MotifsPage() {
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("20");
  const [fee, setFee] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch("/api/appointment-types");
    const data = await res.json();
    setTypes(data.filter((t: AppointmentType) => t.isActive));
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/appointment-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        durationMinutes: Number(duration),
        fee: fee ? Number(fee) : undefined,
      }),
    });
    setName(""); setDuration("20"); setFee("");
    await refresh();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/appointment-types/${id}`, { method: "DELETE" });
    await refresh();
  }

  if (loading) return <p className="text-[#0891B2] text-sm p-6">Chargement...</p>;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] flex items-center justify-center text-[#0891B2]">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#134E4A]">Motifs de consultation</h1>
          <p className="text-sm text-gray-500">Définissez les types de consultations avec leurs durées et tarifs.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6F4F1] bg-white p-6 shadow-sm max-w-xl">
        <h2 className="font-semibold text-[#134E4A] mb-4">Ajouter un motif</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-[#134E4A] font-medium">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Première consultation"
              required
              className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2] mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="duration" className="text-[#134E4A] font-medium">Durée (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={120}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2] mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fee" className="text-[#134E4A] font-medium">Tarif (DT)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="optionnel"
                className="h-12 rounded-xl border-[#E6F4F1] focus-visible:ring-[#0891B2] mt-1"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#0891B2] hover:bg-[#0E7490] h-12 rounded-xl font-bold text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Ajout en cours..." : "Ajouter"}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-[#E6F4F1] bg-white shadow-sm max-w-xl">
        <div className="p-4 border-b border-[#E6F4F1] flex items-center justify-between">
          <h2 className="font-semibold text-[#134E4A]">Motifs actifs</h2>
          <span className="text-xs text-[#0891B2] font-semibold bg-[#F0FDFA] px-2.5 py-1 rounded-full">{types.length}</span>
        </div>
        {types.length === 0 ? (
          <div className="p-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-[#F0FDFA] flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="h-6 w-6 text-[#0891B2]" />
            </div>
            <p className="text-[#134E4A] font-medium mb-1">Aucun motif défini</p>
            <p className="text-sm text-gray-400">Ajoutez votre premier motif de consultation ci-dessus.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E6F4F1]">
            {types.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-[#F0FDFA] transition-colors">
                <div>
                  <div className="font-medium text-[#134E4A]">{t.name}</div>
                  <div className="text-sm text-gray-500">
                    {t.durationMinutes} min
                    {t.fee ? ` · ${t.fee / 1000} DT` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/motifs/${t.id}/questions`}
                    className="text-xs font-semibold text-[#0891B2] hover:bg-[#E6F4F1] border border-[#E6F4F1] rounded-xl px-3 py-1.5 transition-colors"
                  >
                    Questions
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(t.id)}
                    className="border border-[#E6F4F1] hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl text-xs transition-colors"
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
