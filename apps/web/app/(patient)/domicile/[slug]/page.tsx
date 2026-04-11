"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function HomeVisitRequestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/doctors/by-slug/${slug}`).then((r) => r.json()).then((d) => {
      setDoctor(d);
      // Fetch settings via separate call (settings endpoint requires auth, but we expose via doctor endpoint later — for MVP, always show form)
    });
  }, [slug]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!doctor) return;
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/home-visit/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctorId: doctor.id,
        patientName: form.get("name"),
        patientPhone: form.get("phone"),
        address: form.get("address"),
        preferredDate: form.get("date"),
        preferredTime: form.get("time"),
        reason: form.get("reason"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Erreur");
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-5xl text-green-600 mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Demande envoyée</h1>
        <p className="text-gray-500 mb-6">Le médecin va vous contacter pour confirmer la visite.</p>
        <Button onClick={() => router.push("/")}>Retour à l'accueil</Button>
      </div>
    );
  }

  if (!doctor) return <div className="p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Visite à domicile</h1>
      <p className="text-gray-500 mb-6">Avec {doctor.name}</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <Label htmlFor="name">Nom complet</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" placeholder="+216 XX XXX XXX" required />
        </div>
        <div>
          <Label htmlFor="address">Adresse complète</Label>
          <Textarea id="address" name="address" placeholder="Numéro, rue, quartier, ville" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date">Date souhaitée</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div>
            <Label htmlFor="time">Heure souhaitée</Label>
            <Input id="time" name="time" type="time" required />
          </div>
        </div>
        <div>
          <Label htmlFor="reason">Motif de la visite</Label>
          <Textarea id="reason" name="reason" placeholder="Symptômes, contexte..." />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer la demande"}
        </Button>
      </form>
    </div>
  );
}
