"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  doctorId: string;
  doctorName: string;
  preferredDate: string;
}

export function WaitlistButton({ doctorId, doctorName, preferredDate }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, patientName: name, patientPhone: phone, preferredDate }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Erreur");
      return;
    }
    setSuccess(true);
    setTimeout(() => setOpen(false), 2000);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-blue-600 hover:underline font-medium"
      >
        Rejoindre la liste d'attente pour ce jour
      </button>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
      {success ? (
        <div className="text-center py-4">
          <div className="text-3xl text-green-600 mb-2">&#10003;</div>
          <p className="font-semibold">Vous êtes sur la liste !</p>
          <p className="text-sm text-gray-600 mt-1">Nous vous préviendrons par SMS si un créneau se libère chez {doctorName}.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Rejoindre la liste d'attente pour le {preferredDate}</p>
            <p className="text-xs text-gray-500">Nous vous préviendrons par SMS si un patient annule son rendez-vous.</p>
          </div>
          <div>
            <Label htmlFor="wl-name" className="text-xs">Nom complet</Label>
            <Input id="wl-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="wl-phone" className="text-xs">Téléphone</Label>
            <Input id="wl-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "..." : "Rejoindre"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
