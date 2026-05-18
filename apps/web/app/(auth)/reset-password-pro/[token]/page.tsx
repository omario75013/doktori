"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PageState = "validating" | "valid" | "invalid" | "success";

const ACTOR_LABEL: Record<string, string> = {
  doctor: "médecin",
  clinic: "clinique",
  lab: "laboratoire",
  lab_user: "laboratoire",
  secretary: "secrétaire",
};

export default function ResetPasswordProPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("validating");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actorType, setActorType] = useState<string | null>(null);
  const [loginPath, setLoginPath] = useState<string>("/connexion");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/staff/password/reset?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        setPageState(data.valid ? "valid" : "invalid");
        if (data.valid && data.actorType) setActorType(data.actorType);
        if (!data.valid) setError(data.error ?? "Token invalide");
      })
      .catch(() => {
        setPageState("invalid");
        setError("Erreur réseau");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/staff/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.loginPath) setLoginPath(data.loginPath);
        setPageState("success");
      } else {
        setError(data.error || "Erreur lors de la réinitialisation");
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (pageState === "validating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Vérification du lien…</p>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary dark:bg-gray-900 px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-border dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Lien invalide</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            {error ?? "Ce lien de réinitialisation est invalide ou expiré."}
          </p>
          <Link
            href="/mot-de-passe-oublie-pro"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary dark:bg-gray-900 px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-border dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Mot de passe mis à jour</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
          <Link
            href={loginPath}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const actorLabel = actorType ? ACTOR_LABEL[actorType] : null;

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
          <h1 className="text-2xl font-bold text-foreground">Nouveau mot de passe</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {actorLabel
              ? `Espace ${actorLabel} — choisissez un nouveau mot de passe sécurisé (8 caractères minimum).`
              : "Choisissez un nouveau mot de passe sécurisé (8 caractères minimum)."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="text-sm font-medium text-foreground block mb-1">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 caractères minimum"
                required
                minLength={8}
                className="pl-10 pr-10 rounded-xl h-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground block mb-1">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                required
                className="pl-10 rounded-xl h-12"
                autoComplete="new-password"
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
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
          >
            {loading ? "Mise à jour…" : "Réinitialiser le mot de passe"}
          </Button>
        </form>
      </div>
    </div>
  );
}
