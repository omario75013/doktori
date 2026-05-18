"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function LaboratoireLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Try multi-user lab account first, then fall back to legacy single-account.
      // Pass callbackUrl so a successful signIn redirects to the dashboard rather
      // than back to /laboratoire-login (which makes the client think it failed).
      const succeeded = (r: { error?: string | null; url?: string | null } | undefined) =>
        !!r && !r.error && !!r.url && !r.url.includes("/laboratoire-login");
      let result = await signIn("lab-user-credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/laboratoire/dashboard",
      });
      if (!succeeded(result)) {
        result = await signIn("lab-credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/laboratoire/dashboard",
        });
      }
      if (!succeeded(result)) {
        setError(
          "Connexion refusée. Vérifiez vos identifiants — si votre compte n'a pas encore été vérifié par un administrateur, l'accès est temporairement bloqué.",
        );
      } else {
        // B4: block clinic-attached labs from standalone lab login
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = (await sessionRes.json()) as { user?: { parentClinicId?: string | null } };
          if (sessionData.user?.parentClinicId) {
            await signOut({ redirect: false });
            window.location.href = "/clinique-login?msg=clinic-lab";
            return;
          }
        }
        // Hard-navigate so the new session cookie is picked up by the server-rendered
        // layout (router.push keeps the RSC cache and the layout may still see no session).
        window.location.href = "/laboratoire/dashboard";
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <div className="flex w-full items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <FlaskConical className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-xl font-black text-foreground">
              Doktori<span className="text-primary">.tn</span>
            </span>
          </Link>

          <div className="rounded-3xl border border-border bg-white p-8 shadow-xl shadow-primary/5 sm:p-10">
            <div className="mb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                <FlaskConical className="h-7 w-7" strokeWidth={2} />
              </div>
              <h1 className="font-heading text-3xl font-black tracking-tight text-foreground">
                Espace Laboratoire
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Connectez-vous pour gérer vos demandes d&apos;analyses et résultats.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
                  Adresse e-mail
                </label>
                <div className="group flex h-12 items-center rounded-xl border-2 border-border bg-white px-4 focus-within:border-primary">
                  <Mail className="mr-3 h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
                  <input
                    type="email"
                    placeholder="contact@votre-labo.tn"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-full flex-1 border-0 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-doktori-teal-dark">
                  Mot de passe
                </label>
                <div className="group flex h-12 items-center rounded-xl border-2 border-border bg-white px-4 focus-within:border-primary">
                  <Lock className="mr-3 h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-full flex-1 border-0 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="mt-1.5 text-right">
                  <Link href="/mot-de-passe-oublie-pro" className="text-xs font-semibold text-primary hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-heading text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-doktori-teal-dark disabled:opacity-60"
              >
                {loading ? "Connexion…" : (<><span>Se connecter</span><ArrowRight className="h-4 w-4" strokeWidth={3} /></>)}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore inscrit ?{" "}
              <Link href="/inscription?role=lab" className="font-bold text-primary hover:underline">
                Créer un compte laboratoire
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
