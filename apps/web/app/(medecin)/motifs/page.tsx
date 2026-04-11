"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  if (loading) return <p className="text-gray-400">Chargement...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Motifs de consultation</h1>
      <p className="text-gray-500 mb-6">Définissez les types de consultations avec leurs durées et tarifs.</p>

      <div className="bg-white rounded-xl border p-6 mb-6 max-w-xl">
        <h2 className="font-semibold mb-4">Ajouter un motif</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Première consultation" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="duration">Durée (minutes)</Label>
              <Input id="duration" type="number" min={5} max={120} value={duration} onChange={(e) => setDuration(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="fee">Tarif (DT)</Label>
              <Input id="fee" type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="optionnel" />
            </div>
          </div>
          <Button type="submit" disabled={saving}>{saving ? "..." : "Ajouter"}</Button>
        </form>
      </div>

      <div className="bg-white rounded-xl border max-w-xl">
        <div className="p-4 border-b"><h2 className="font-semibold">Motifs actifs ({types.length})</h2></div>
        {types.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">Aucun motif défini</p>
        ) : (
          <div className="divide-y">
            {types.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.durationMinutes} min {t.fee ? `· ${t.fee / 1000} DT` : ""}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDelete(t.id)}>Supprimer</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
