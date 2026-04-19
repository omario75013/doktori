"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, CheckCircle, MapPin, CalendarDays } from "lucide-react";

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
      <div className="min-h-screen bg-secondary flex items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-white p-10 shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Demande envoyée</h1>
          <p className="text-gray-500 mb-6">Le médecin va vous contacter pour confirmer la visite.</p>
          <Button
            onClick={() => router.push("/")}
            className="bg-primary hover:bg-doktori-teal-dark h-12 rounded-xl w-full text-white"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-7 h-7 text-primary" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Visite à domicile</h1>
          <p className="text-gray-500 mt-1">Avec {doctor.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient info card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">1</span>
              Vos informations
            </h2>
            <div>
              <Label htmlFor="name" className="text-foreground font-medium">Nom complet</Label>
              <Input id="name" name="name" required className="mt-1 h-12 rounded-xl border-border focus:border-primary" />
            </div>
            <div>
              <Label htmlFor="phone" className="text-foreground font-medium">Téléphone</Label>
              <Input id="phone" name="phone" placeholder="+216 XX XXX XXX" required className="mt-1 h-12 rounded-xl border-border focus:border-primary" />
            </div>
          </div>

          {/* Address card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Adresse de la visite
            </h2>
            <div>
              <Label htmlFor="address" className="text-foreground font-medium">Adresse complète</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Numéro, rue, quartier, ville"
                required
                className="mt-1 rounded-xl border-border focus:border-primary resize-none"
              />
            </div>
          </div>

          {/* Date/time card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Date souhaitée
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date" className="text-foreground font-medium">Date</Label>
                <Input id="date" name="date" type="date" required className="mt-1 h-12 rounded-xl border-border focus:border-primary" />
              </div>
              <div>
                <Label htmlFor="time" className="text-foreground font-medium">Heure</Label>
                <Input id="time" name="time" type="time" required className="mt-1 h-12 rounded-xl border-border focus:border-primary" />
              </div>
            </div>
            <div>
              <Label htmlFor="reason" className="text-foreground font-medium">Motif de la visite</Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Symptômes, contexte..."
                className="mt-1 rounded-xl border-border focus:border-primary resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-doktori-teal-dark h-12 rounded-xl text-white font-medium"
            disabled={loading}
          >
            {loading ? "Envoi..." : "Envoyer la demande"}
          </Button>
        </form>
      </div>
    </div>
  );
}
