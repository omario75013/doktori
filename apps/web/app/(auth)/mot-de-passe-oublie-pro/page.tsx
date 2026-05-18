"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordProPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/staff/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSent(true);
      else {
        const data = await res.json();
        setError(data.error || "Une erreur est survenue");
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary dark:bg-gray-900 px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-border dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Email envoyé</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Si un compte professionnel existe pour <strong>{email}</strong>,
            vous recevrez un lien de réinitialisation dans quelques instants.
            Le lien expire dans <strong>1 heure</strong>.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Comptes pris en charge : médecin, clinique, laboratoire, secrétaire.
          </p>
          <Link href="/connexion" className="text-primary text-sm font-semibold hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-border dark:border-gray-700 p-8">
        <div className="mb-6">
          <Link
            href="/connexion"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Mot de passe oublié — Espace professionnel</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Médecins, cliniques, laboratoires, secrétaires : entrez l'adresse
            email de votre compte. Nous vous enverrons un lien de réinitialisation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground block mb-1">
              Adresse email professionnelle
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@clinique.tn"
                required
                className="pl-10 rounded-xl h-12"
                autoComplete="email"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
          >
            {loading ? "Envoi en cours…" : "Envoyer le lien"}
          </Button>

          <p className="text-xs text-gray-400 text-center pt-2">
            Vous êtes patient ? <Link href="/mot-de-passe-oublie" className="text-primary hover:underline">Mot de passe oublié patient</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
